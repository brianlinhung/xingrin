"""
截图 Flow

负责编排截图的完整流程：
1. 从数据库获取 URL 列表（websites 和/或 endpoints）
2. 批量截图并保存快照
3. 同步到资产表

支持两种模式：
1. 传统模式（向后兼容）：使用 target_id 从数据库获取 URL
2. Provider 模式：使用 TargetProvider 从任意数据源获取 URL
"""

import logging
from typing import Optional

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_running,
)
from apps.scan.providers import TargetProvider
from apps.scan.services.target_export_service import DataSource, get_urls_with_fallback
from apps.scan.tasks.screenshot import capture_screenshots_task
from apps.scan.utils import user_log, wait_for_system_load

logger = logging.getLogger(__name__)

# URL 来源到 DataSource 的映射
_SOURCE_MAPPING = {
    'websites': DataSource.WEBSITE,
    'endpoints': DataSource.ENDPOINT,
}


def _parse_screenshot_config(enabled_tools: dict) -> dict:
    """解析截图配置"""
    playwright_config = enabled_tools.get('playwright', {})
    return {
        'concurrency': playwright_config.get('concurrency', 5),
        'url_sources': playwright_config.get('url_sources', ['websites'])
    }


def _map_url_sources_to_data_sources(url_sources: list[str]) -> list[str]:
    """将配置中的 url_sources 映射为 DataSource 常量"""
    sources = []
    for source in url_sources:
        if source in _SOURCE_MAPPING:
            sources.append(_SOURCE_MAPPING[source])
        else:
            logger.warning("未知的 URL 来源: %s，跳过", source)

    # 添加默认回退（从 subdomain 构造）
    sources.append(DataSource.DEFAULT)
    return sources


def _collect_urls_from_provider(provider: TargetProvider) -> tuple[list[str], str, list[str]]:
    """从 Provider 收集 URL"""
    logger.info("使用 Provider 模式获取 URL - Provider: %s", type(provider).__name__)
    urls = list(provider.iter_urls())

    blacklist_filter = provider.get_blacklist_filter()
    if blacklist_filter:
        urls = [url for url in urls if blacklist_filter.is_allowed(url)]

    return urls, 'provider', ['provider']


def _collect_urls_from_database(
    target_id: int,
    url_sources: list[str]
) -> tuple[list[str], str, list[str]]:
    """从数据库收集 URL（带黑名单过滤和回退）"""
    data_sources = _map_url_sources_to_data_sources(url_sources)
    result = get_urls_with_fallback(target_id, sources=data_sources)
    return result['urls'], result['source'], result['tried_sources']


def _build_empty_result(scan_id: int, target_name: str) -> dict:
    """构建空结果"""
    return {
        'success': True,
        'scan_id': scan_id,
        'target': target_name,
        'total_urls': 0,
        'successful': 0,
        'failed': 0,
        'synced': 0
    }


@flow(
    name="screenshot",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def screenshot_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
    provider: Optional[TargetProvider] = None
) -> dict:
    """
    截图 Flow

    支持两种模式：
    1. 传统模式（向后兼容）：使用 target_id 从数据库获取 URL
    2. Provider 模式：使用 TargetProvider 从任意数据源获取 URL

    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        enabled_tools: 启用的工具配置
        provider: TargetProvider 实例（新模式，可选）

    Returns:
        截图结果字典
    """
    try:
        # 负载检查：等待系统资源充足
        wait_for_system_load(context="screenshot_flow")

        mode = 'Provider' if provider else 'Legacy'
        logger.info(
            "开始截图扫描 - Scan ID: %s, Target: %s, Mode: %s",
            scan_id, target_name, mode
        )
        user_log(scan_id, "screenshot", "Starting screenshot capture")

        # Step 1: 解析配置
        config = _parse_screenshot_config(enabled_tools)
        concurrency = config['concurrency']
        logger.info("截图配置 - 并发: %d, URL来源: %s", concurrency, config['url_sources'])

        # Step 2: 收集 URL 列表
        if provider is not None:
            urls, source_info, tried_sources = _collect_urls_from_provider(provider)
        else:
            urls, source_info, tried_sources = _collect_urls_from_database(
                target_id, config['url_sources']
            )

        logger.info(
            "URL 收集完成 - 来源: %s, 数量: %d, 尝试过: %s",
            source_info, len(urls), tried_sources
        )

        if not urls:
            logger.warning("没有可截图的 URL，跳过截图任务")
            user_log(scan_id, "screenshot", "Skipped: no URLs to capture", "warning")
            return _build_empty_result(scan_id, target_name)

        user_log(
            scan_id, "screenshot",
            f"Found {len(urls)} URLs to capture (source: {source_info})"
        )

        # Step 3: 批量截图
        logger.info("批量截图 - %d 个 URL", len(urls))
        capture_result = capture_screenshots_task(
            urls=urls,
            scan_id=scan_id,
            target_id=target_id,
            config={'concurrency': concurrency}
        )

        # Step 4: 同步到资产表
        logger.info("同步截图到资产表")
        from apps.asset.services.screenshot_service import ScreenshotService
        synced = ScreenshotService().sync_screenshots_to_asset(scan_id, target_id)

        total = capture_result['total']
        successful = capture_result['successful']
        failed = capture_result['failed']

        logger.info(
            "✓ 截图完成 - 总数: %d, 成功: %d, 失败: %d, 同步: %d",
            total, successful, failed, synced
        )
        user_log(
            scan_id, "screenshot",
            f"Screenshot completed: {successful}/{total} captured, {synced} synced"
        )

        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'total_urls': total,
            'successful': successful,
            'failed': failed,
            'synced': synced
        }

    except Exception:
        logger.exception("截图 Flow 失败")
        user_log(scan_id, "screenshot", "Screenshot failed", "error")
        raise
