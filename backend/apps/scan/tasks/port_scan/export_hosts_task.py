"""
导出主机列表到 TXT 文件的 Task

支持两种模式：
1. 传统模式（向后兼容）：使用 target_id 从数据库导出
2. Provider 模式：使用 TargetProvider 从任意数据源导出

根据 Target 类型决定导出内容：
- DOMAIN: 从 Subdomain 表导出子域名
- IP: 直接写入 target.name
- CIDR: 展开 CIDR 范围内的所有 IP
"""
import logging
from pathlib import Path
from typing import Optional

from prefect import task

from apps.scan.providers import DatabaseTargetProvider, TargetProvider

logger = logging.getLogger(__name__)


@task(name="export_hosts")
def export_hosts_task(
    output_file: str,
    target_id: Optional[int] = None,
    provider: Optional[TargetProvider] = None,
) -> dict:
    """
    导出主机列表到 TXT 文件

    支持两种模式：
    1. 传统模式（向后兼容）：传入 target_id，从数据库导出
    2. Provider 模式：传入 provider，从任意数据源导出

    根据 Target 类型自动决定导出内容：
    - DOMAIN: 从 Subdomain 表导出子域名（流式处理，支持 10万+ 域名）
    - IP: 直接写入 target.name（单个 IP）
    - CIDR: 展开 CIDR 范围内的所有可用 IP

    Args:
        output_file: 输出文件路径（绝对路径）
        target_id: 目标 ID（传统模式，向后兼容）
        provider: TargetProvider 实例（新模式）

    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int,
            'target_type': str  # 仅传统模式返回
        }

    Raises:
        ValueError: 参数错误（target_id 和 provider 都未提供）
        IOError: 文件写入失败
    """
    if target_id is None and provider is None:
        raise ValueError("必须提供 target_id 或 provider 参数之一")

    # 向后兼容：如果没有提供 provider，使用 target_id 创建 DatabaseTargetProvider
    use_legacy_mode = provider is None
    if use_legacy_mode:
        logger.info("使用传统模式 - Target ID: %d", target_id)
        provider = DatabaseTargetProvider(target_id=target_id)
    else:
        logger.info("使用 Provider 模式 - Provider: %s", type(provider).__name__)

    # 确保输出目录存在
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 使用 Provider 导出主机列表（iter_hosts 内部已处理黑名单过滤）
    total_count = 0

    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for host in provider.iter_hosts():
            f.write(f"{host}\n")
            total_count += 1

            if total_count % 1000 == 0:
                logger.info("已导出 %d 个主机...", total_count)

    logger.info("✓ 主机列表导出完成 - 总数: %d, 文件: %s", total_count, str(output_path))

    result = {
        'success': True,
        'output_file': str(output_path),
        'total_count': total_count,
    }

    # 传统模式：保持返回值格式不变（向后兼容）
    if use_legacy_mode:
        from apps.targets.services import TargetService
        target = TargetService().get_target(target_id)
        result['target_type'] = target.type if target else 'unknown'

    return result
