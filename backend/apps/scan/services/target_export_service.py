"""
目标导出服务

提供统一的目标提取和文件导出功能，支持：
- URL 导出（流式写入 + 默认值回退）
- 域名/IP 导出（用于端口扫描）
- 黑名单过滤集成
"""

import ipaddress
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Iterator

from django.db.models import QuerySet

from .blacklist_service import BlacklistService

logger = logging.getLogger(__name__)


class TargetExportService:
    """
    目标导出服务 - 提供统一的目标提取和文件导出功能
    
    使用方式：
        # Task 层决定数据源
        queryset = WebSite.objects.filter(target_id=target_id).values_list('url', flat=True)
        
        # 使用导出服务
        blacklist_service = BlacklistService()
        export_service = TargetExportService(blacklist_service=blacklist_service)
        result = export_service.export_urls(target_id, output_path, queryset)
    """
    
    def __init__(self, blacklist_service: Optional[BlacklistService] = None):
        """
        初始化导出服务
        
        Args:
            blacklist_service: 黑名单过滤服务，None 表示禁用过滤
        """
        self.blacklist_service = blacklist_service
    
    def export_urls(
        self,
        target_id: int,
        output_path: str,
        queryset: QuerySet,
        url_field: str = 'url',
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        统一 URL 导出函数
        
        自动判断数据库有无数据：
        - 有数据：流式写入数据库数据到文件
        - 无数据：调用默认值生成器生成 URL
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            queryset: 数据源 queryset（由 Task 层构建，应为 values_list flat=True）
            url_field: URL 字段名（用于黑名单过滤）
            batch_size: 批次大小
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int
            }
            
        Raises:
            IOError: 文件写入失败
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info("开始导出 URL - target_id=%s, output=%s", target_id, output_path)
        
        # 应用黑名单过滤（数据库层面）
        if self.blacklist_service:
            # 注意：queryset 应该是原始 queryset，不是 values_list
            # 这里假设 Task 层传入的是 values_list，需要在 Task 层处理过滤
            pass
        
        total_count = 0
        try:
            with open(output_file, 'w', encoding='utf-8', buffering=8192) as f:
                for url in queryset.iterator(chunk_size=batch_size):
                    if url:
                        # Python 层面黑名单过滤
                        if self.blacklist_service and not self.blacklist_service.filter_url(url):
                            continue
                        f.write(f"{url}\n")
                        total_count += 1
                        
                        if total_count % 10000 == 0:
                            logger.info("已导出 %d 个 URL...", total_count)
        except IOError as e:
            logger.error("文件写入失败: %s - %s", output_path, e)
            raise
        
        # 默认值回退模式
        if total_count == 0:
            total_count = self._generate_default_urls(target_id, output_file)
        
        logger.info("✓ URL 导出完成 - 数量: %d, 文件: %s", total_count, output_path)
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_count
        }

    def _generate_default_urls(
        self,
        target_id: int,
        output_path: Path
    ) -> int:
        """
        默认值生成器（内部函数）
        
        根据 Target 类型生成默认 URL：
        - DOMAIN: http(s)://domain
        - IP: http(s)://ip
        - CIDR: 展开为所有 IP 的 http(s)://ip
        - URL: 直接使用目标 URL
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            
        Returns:
            int: 写入的 URL 总数
        """
        from apps.targets.services import TargetService
        from apps.targets.models import Target
        
        target_service = TargetService()
        target = target_service.get_target(target_id)
        
        if not target:
            logger.warning("Target ID %d 不存在，无法生成默认 URL", target_id)
            return 0
        
        target_name = target.name
        target_type = target.type
        
        logger.info("懒加载模式：Target 类型=%s, 名称=%s", target_type, target_name)
        
        total_urls = 0
        
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            if target_type == Target.TargetType.DOMAIN:
                urls = [f"http://{target_name}", f"https://{target_name}"]
                for url in urls:
                    if self._should_write_url(url):
                        f.write(f"{url}\n")
                        total_urls += 1
                        
            elif target_type == Target.TargetType.IP:
                urls = [f"http://{target_name}", f"https://{target_name}"]
                for url in urls:
                    if self._should_write_url(url):
                        f.write(f"{url}\n")
                        total_urls += 1
                        
            elif target_type == Target.TargetType.CIDR:
                try:
                    network = ipaddress.ip_network(target_name, strict=False)
                    
                    for ip in network.hosts():
                        urls = [f"http://{ip}", f"https://{ip}"]
                        for url in urls:
                            if self._should_write_url(url):
                                f.write(f"{url}\n")
                                total_urls += 1
                        
                        if total_urls % 10000 == 0:
                            logger.info("已生成 %d 个 URL...", total_urls)
                    
                    # /32 或 /128 特殊处理
                    if total_urls == 0:
                        ip = str(network.network_address)
                        urls = [f"http://{ip}", f"https://{ip}"]
                        for url in urls:
                            if self._should_write_url(url):
                                f.write(f"{url}\n")
                                total_urls += 1
                                
                except ValueError as e:
                    logger.error("CIDR 解析失败: %s - %s", target_name, e)
                    raise ValueError(f"无效的 CIDR: {target_name}") from e
                    
            elif target_type == Target.TargetType.URL:
                if self._should_write_url(target_name):
                    f.write(f"{target_name}\n")
                    total_urls = 1
            else:
                logger.warning("不支持的 Target 类型: %s", target_type)
        
        logger.info("✓ 懒加载生成默认 URL - 数量: %d", total_urls)
        return total_urls
    
    def _should_write_url(self, url: str) -> bool:
        """检查 URL 是否应该写入（通过黑名单过滤）"""
        if self.blacklist_service:
            return self.blacklist_service.filter_url(url)
        return True

    def export_targets(
        self,
        target_id: int,
        output_path: str,
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        域名/IP 导出函数（用于端口扫描）
        
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
        from apps.asset.services.asset.subdomain_service import SubdomainService
        
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
            "开始导出扫描目标 - Target ID: %d, Name: %s, Type: %s, 输出文件: %s",
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
            "✓ 扫描目标导出完成 - 类型: %s, 总数: %d, 文件: %s",
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
        """导出域名类型目标的子域名"""
        from apps.asset.services.asset.subdomain_service import SubdomainService
        
        subdomain_service = SubdomainService()
        domain_iterator = subdomain_service.iter_subdomain_names_by_target(
            target_id=target_id,
            chunk_size=batch_size
        )
        
        total_count = 0
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            for domain_name in domain_iterator:
                if self._should_write_target(domain_name):
                    f.write(f"{domain_name}\n")
                    total_count += 1
                    
                    if total_count % 10000 == 0:
                        logger.info("已导出 %d 个域名...", total_count)
        
        # 默认值模式：如果没有子域名，使用根域名
        if total_count == 0:
            logger.info("采用默认域名：%s (target_id=%d)", target_name, target_id)
            if self._should_write_target(target_name):
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(f"{target_name}\n")
                total_count = 1
        
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
        if self.blacklist_service:
            return self.blacklist_service.filter_url(target)
        return True
