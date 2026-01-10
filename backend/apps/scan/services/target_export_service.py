"""
目标导出服务

提供统一的目标提取和文件导出功能，支持：
- URL 导出（纯导出，不做隐式回退）
- 默认 URL 生成（独立方法）
- 带回退链的 URL 导出（用例层编排）
- 域名/IP 导出（用于端口扫描）
- 黑名单过滤集成
"""

import ipaddress
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Iterator, Tuple

from django.db.models import QuerySet

from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


class DataSource:
    """数据源类型常量"""
    ENDPOINT = "endpoint"
    WEBSITE = "website"
    HOST_PORT = "host_port"
    DEFAULT = "default"


def create_export_service(target_id: int) -> 'TargetExportService':
    """
    工厂函数：创建带黑名单过滤的导出服务
    
    Args:
        target_id: 目标 ID，用于加载黑名单规则
        
    Returns:
        TargetExportService: 配置好黑名单过滤器的导出服务实例
    """
    from apps.common.services import BlacklistService
    
    rules = BlacklistService().get_rules(target_id)
    blacklist_filter = BlacklistFilter(rules)
    return TargetExportService(blacklist_filter=blacklist_filter)


def _iter_default_urls_from_target(
    target_id: int,
    blacklist_filter: Optional[BlacklistFilter] = None
) -> Iterator[str]:
    """
    内部生成器：从 Target 本身生成默认 URL
    
    根据 Target 类型生成 URL：
    - DOMAIN: http(s)://domain
    - IP: http(s)://ip
    - CIDR: 展开为所有 IP 的 http(s)://ip
    - URL: 直接使用目标 URL
    
    Args:
        target_id: 目标 ID
        blacklist_filter: 黑名单过滤器
        
    Yields:
        str: URL
    """
    from apps.targets.services import TargetService
    from apps.targets.models import Target
    
    target_service = TargetService()
    target = target_service.get_target(target_id)
    
    if not target:
        logger.warning("Target ID %d 不存在，无法生成默认 URL", target_id)
        return
    
    target_name = target.name
    target_type = target.type
    
    # 根据 Target 类型生成 URL
    if target_type == Target.TargetType.DOMAIN:
        urls = [f"http://{target_name}", f"https://{target_name}"]
    elif target_type == Target.TargetType.IP:
        urls = [f"http://{target_name}", f"https://{target_name}"]
    elif target_type == Target.TargetType.CIDR:
        try:
            network = ipaddress.ip_network(target_name, strict=False)
            urls = []
            for ip in network.hosts():
                urls.extend([f"http://{ip}", f"https://{ip}"])
            # /32 或 /128 特殊处理
            if not urls:
                ip = str(network.network_address)
                urls = [f"http://{ip}", f"https://{ip}"]
        except ValueError as e:
            logger.error("CIDR 解析失败: %s - %s", target_name, e)
            return
    elif target_type == Target.TargetType.URL:
        urls = [target_name]
    else:
        logger.warning("不支持的 Target 类型: %s", target_type)
        return
    
    # 过滤并产出
    for url in urls:
        if blacklist_filter and not blacklist_filter.is_allowed(url):
            continue
        yield url


def _iter_urls_with_fallback(
    target_id: int,
    sources: List[str],
    blacklist_filter: Optional[BlacklistFilter] = None,
    batch_size: int = 1000,
    tried_sources: Optional[List[str]] = None
) -> Iterator[Tuple[str, str]]:
    """
    内部生成器：流式产出 URL（带回退链）
    
    按 sources 顺序尝试每个数据源，直到有数据返回。
    
    回退逻辑：
    - 数据源有数据且通过过滤 → 产出 URL，停止回退
    - 数据源有数据但全被过滤 → 不回退，停止（避免意外暴露）
    - 数据源为空 → 继续尝试下一个
    
    Args:
        target_id: 目标 ID
        sources: 数据源优先级列表
        blacklist_filter: 黑名单过滤器
        batch_size: 批次大小
        tried_sources: 可选，用于记录尝试过的数据源（外部传入列表，会被修改）
        
    Yields:
        Tuple[str, str]: (url, source) - URL 和来源标识
    """
    from apps.asset.models import Endpoint, WebSite
    
    for source in sources:
        if tried_sources is not None:
            tried_sources.append(source)
        
        has_output = False  # 是否有输出（通过过滤的）
        has_raw_data = False  # 是否有原始数据（过滤前）
        
        if source == DataSource.DEFAULT:
            # 默认 URL 生成（从 Target 本身构造，复用共用生成器）
            for url in _iter_default_urls_from_target(target_id, blacklist_filter):
                has_raw_data = True
                has_output = True
                yield url, source
            
            # 检查是否有原始数据（需要单独判断，因为生成器可能被过滤后为空）
            if not has_raw_data:
                # 再次检查 Target 是否存在
                from apps.targets.services import TargetService
                target = TargetService().get_target(target_id)
                has_raw_data = target is not None
            
            if has_raw_data:
                if not has_output:
                    logger.info("%s 有数据但全被黑名单过滤，不回退", source)
                return
            continue
        
        # 构建对应数据源的 queryset
        if source == DataSource.ENDPOINT:
            queryset = Endpoint.objects.filter(target_id=target_id).values_list('url', flat=True)
        elif source == DataSource.WEBSITE:
            queryset = WebSite.objects.filter(target_id=target_id).values_list('url', flat=True)
        else:
            logger.warning("未知的数据源类型: %s，跳过", source)
            continue
        
        for url in queryset.iterator(chunk_size=batch_size):
            if url:
                has_raw_data = True
                if blacklist_filter and not blacklist_filter.is_allowed(url):
                    continue
                has_output = True
                yield url, source
        
        # 有原始数据就停止（不管是否被过滤）
        if has_raw_data:
            if not has_output:
                logger.info("%s 有数据但全被黑名单过滤，不回退", source)
            return
        
        logger.info("%s 为空，尝试下一个数据源", source)


def get_urls_with_fallback(
    target_id: int,
    sources: List[str],
    batch_size: int = 1000
) -> Dict[str, Any]:
    """
    带回退链的 URL 获取用例函数（返回列表）
    
    按 sources 顺序尝试每个数据源，直到有数据返回。
    
    Args:
        target_id: 目标 ID
        sources: 数据源优先级列表，如 ["website", "endpoint", "default"]
        batch_size: 批次大小
        
    Returns:
        dict: {
            'success': bool,
            'urls': List[str],
            'total_count': int,
            'source': str,  # 实际使用的数据源
            'tried_sources': List[str],  # 尝试过的数据源
        }
    """
    from apps.common.services import BlacklistService
    
    rules = BlacklistService().get_rules(target_id)
    blacklist_filter = BlacklistFilter(rules)
    
    urls = []
    actual_source = 'none'
    tried_sources = []
    
    for url, source in _iter_urls_with_fallback(target_id, sources, blacklist_filter, batch_size, tried_sources):
        urls.append(url)
        actual_source = source
    
    if urls:
        logger.info("从 %s 获取 %d 条 URL", actual_source, len(urls))
    else:
        logger.warning("所有数据源都为空，无法获取 URL")
    
    return {
        'success': True,
        'urls': urls,
        'total_count': len(urls),
        'source': actual_source,
        'tried_sources': tried_sources,
    }


def export_urls_with_fallback(
    target_id: int,
    output_file: str,
    sources: List[str],
    batch_size: int = 1000
) -> Dict[str, Any]:
    """
    带回退链的 URL 导出用例函数（写入文件）
    
    按 sources 顺序尝试每个数据源，直到有数据返回。
    流式写入，内存占用 O(1)。
    
    Args:
        target_id: 目标 ID
        output_file: 输出文件路径
        sources: 数据源优先级列表，如 ["endpoint", "website", "default"]
        batch_size: 批次大小
        
    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int,
            'source': str,  # 实际使用的数据源
            'tried_sources': List[str],  # 尝试过的数据源
        }
    """
    from apps.common.services import BlacklistService
    
    rules = BlacklistService().get_rules(target_id)
    blacklist_filter = BlacklistFilter(rules)
    
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    total_count = 0
    actual_source = 'none'
    tried_sources = []
    
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for url, source in _iter_urls_with_fallback(target_id, sources, blacklist_filter, batch_size, tried_sources):
            f.write(f"{url}\n")
            total_count += 1
            actual_source = source
            
            if total_count % 10000 == 0:
                logger.info("已导出 %d 个 URL...", total_count)
    
    if total_count > 0:
        logger.info("从 %s 导出 %d 条 URL 到 %s", actual_source, total_count, output_file)
    else:
        logger.warning("所有数据源都为空，无法导出 URL")
    
    return {
        'success': True,
        'output_file': str(output_path),
        'total_count': total_count,
        'source': actual_source,
        'tried_sources': tried_sources,
    }


class TargetExportService:
    """
    目标导出服务 - 提供统一的目标提取和文件导出功能
    
    使用方式：
        # 方式 1：使用用例函数（推荐）
        from apps.scan.services.target_export_service import export_urls_with_fallback, DataSource
        
        result = export_urls_with_fallback(
            target_id=1,
            output_file='/path/to/output.txt',
            sources=[DataSource.ENDPOINT, DataSource.WEBSITE, DataSource.DEFAULT]
        )
        
        # 方式 2：直接使用 Service（纯导出，不带回退）
        export_service = create_export_service(target_id)
        result = export_service.export_urls(target_id, output_path, queryset)
    """
    
    def __init__(self, blacklist_filter: Optional[BlacklistFilter] = None):
        """
        初始化导出服务
        
        Args:
            blacklist_filter: 黑名单过滤器，None 表示禁用过滤
        """
        self.blacklist_filter = blacklist_filter
    
    def export_urls(
        self,
        target_id: int,
        output_path: str,
        queryset: QuerySet,
        url_field: str = 'url',
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        纯 URL 导出函数 - 只负责将 queryset 数据写入文件
        
        不做任何隐式回退或默认 URL 生成。
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            queryset: 数据源 queryset（由调用方构建，应为 values_list flat=True）
            url_field: URL 字段名（用于黑名单过滤）
            batch_size: 批次大小
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int,        # 实际写入数量
                'queryset_count': int,     # 原始数据数量（迭代计数）
                'filtered_count': int,     # 被黑名单过滤的数量
            }
            
        Raises:
            IOError: 文件写入失败
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info("开始导出 URL - target_id=%s, output=%s", target_id, output_path)
        
        total_count = 0
        filtered_count = 0
        queryset_count = 0
        
        try:
            with open(output_file, 'w', encoding='utf-8', buffering=8192) as f:
                for url in queryset.iterator(chunk_size=batch_size):
                    queryset_count += 1
                    if url:
                        # 黑名单过滤
                        if self.blacklist_filter and not self.blacklist_filter.is_allowed(url):
                            filtered_count += 1
                            continue
                        f.write(f"{url}\n")
                        total_count += 1
                        
                        if total_count % 10000 == 0:
                            logger.info("已导出 %d 个 URL...", total_count)
        except IOError as e:
            logger.error("文件写入失败: %s - %s", output_path, e)
            raise
        
        if filtered_count > 0:
            logger.info("黑名单过滤: 过滤 %d 个 URL", filtered_count)
        
        logger.info(
            "✓ URL 导出完成 - 写入: %d, 原始: %d, 过滤: %d, 文件: %s",
            total_count, queryset_count, filtered_count, output_path
        )
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_count,
            'queryset_count': queryset_count,
            'filtered_count': filtered_count,
        }

    def generate_default_urls(
        self,
        target_id: int,
        output_path: str
    ) -> Dict[str, Any]:
        """
        默认 URL 生成器
        
        根据 Target 类型生成默认 URL：
        - DOMAIN: http(s)://domain
        - IP: http(s)://ip
        - CIDR: 展开为所有 IP 的 http(s)://ip
        - URL: 直接使用目标 URL
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int,
            }
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info("生成默认 URL - target_id=%d", target_id)
        
        total_urls = 0
        
        with open(output_file, 'w', encoding='utf-8', buffering=8192) as f:
            for url in _iter_default_urls_from_target(target_id, self.blacklist_filter):
                f.write(f"{url}\n")
                total_urls += 1
                
                if total_urls % 10000 == 0:
                    logger.info("已生成 %d 个 URL...", total_urls)
        
        logger.info("✓ 默认 URL 生成完成 - 数量: %d", total_urls)
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_urls,
        }

    def export_hosts(
        self,
        target_id: int,
        output_path: str,
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        主机列表导出函数（用于端口扫描）
        
        根据 Target 类型选择导出逻辑：
        - DOMAIN: 从 Subdomain 表流式导出子域名
        - IP: 直接写入 IP 地址
        - CIDR: 展开为所有主机 IP
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            batch_size: 批次大小
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int,
                'target_type': str
            }
        """
        from apps.targets.services import TargetService
        from apps.targets.models import Target

        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 获取 Target 信息
        target_service = TargetService()
        target = target_service.get_target(target_id)
        
        if not target:
            raise ValueError(f"Target ID {target_id} 不存在")
        
        target_type = target.type
        target_name = target.name
        
        logger.info(
            "开始导出主机列表 - Target ID: %d, Name: %s, Type: %s, 输出文件: %s",
            target_id, target_name, target_type, output_path
        )
        
        total_count = 0
        
        if target_type == Target.TargetType.DOMAIN:
            total_count = self._export_domains(target_id, target_name, output_file, batch_size)
            type_desc = "域名"
            
        elif target_type == Target.TargetType.IP:
            total_count = self._export_ip(target_name, output_file)
            type_desc = "IP"
            
        elif target_type == Target.TargetType.CIDR:
            total_count = self._export_cidr(target_name, output_file)
            type_desc = "CIDR IP"
            
        else:
            raise ValueError(f"不支持的目标类型: {target_type}")
        
        logger.info(
            "✓ 主机列表导出完成 - 类型: %s, 总数: %d, 文件: %s",
            type_desc, total_count, output_path
        )
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_count,
            'target_type': target_type
        }
    
    def _export_domains(
        self,
        target_id: int,
        target_name: str,
        output_path: Path,
        batch_size: int
    ) -> int:
        """导出域名类型目标的根域名 + 子域名"""
        from apps.asset.services.asset.subdomain_service import SubdomainService
        
        subdomain_service = SubdomainService()
        domain_iterator = subdomain_service.iter_subdomain_names_by_target(
            target_id=target_id,
            chunk_size=batch_size
        )
        
        total_count = 0
        written_domains = set()  # 去重（子域名表可能已包含根域名）
        
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            # 1. 先写入根域名
            if self._should_write_target(target_name):
                f.write(f"{target_name}\n")
                written_domains.add(target_name)
                total_count += 1
            
            # 2. 再写入子域名（跳过已写入的根域名）
            for domain_name in domain_iterator:
                if domain_name in written_domains:
                    continue
                if self._should_write_target(domain_name):
                    f.write(f"{domain_name}\n")
                    written_domains.add(domain_name)
                    total_count += 1
                    
                    if total_count % 10000 == 0:
                        logger.info("已导出 %d 个域名...", total_count)
        
        return total_count
    
    def _export_ip(self, target_name: str, output_path: Path) -> int:
        """导出 IP 类型目标"""
        if self._should_write_target(target_name):
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"{target_name}\n")
            return 1
        return 0
    
    def _export_cidr(self, target_name: str, output_path: Path) -> int:
        """导出 CIDR 类型目标，展开为每个 IP"""
        network = ipaddress.ip_network(target_name, strict=False)
        total_count = 0
        
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            for ip in network.hosts():
                ip_str = str(ip)
                if self._should_write_target(ip_str):
                    f.write(f"{ip_str}\n")
                    total_count += 1
                    
                    if total_count % 10000 == 0:
                        logger.info("已导出 %d 个 IP...", total_count)
        
        # /32 或 /128 特殊处理
        if total_count == 0:
            ip_str = str(network.network_address)
            if self._should_write_target(ip_str):
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(f"{ip_str}\n")
                total_count = 1
        
        return total_count
    
    def _should_write_target(self, target: str) -> bool:
        """检查目标是否应该写入（通过黑名单过滤）"""
        if self.blacklist_filter:
            return self.blacklist_filter.is_allowed(target)
        return True
