"""
数据库目标提供者模块

提供基于数据库查询的目标提供者实现。
"""

import logging
from typing import TYPE_CHECKING, Iterator, Optional

from .base import ProviderContext, TargetProvider

if TYPE_CHECKING:
    from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


class DatabaseTargetProvider(TargetProvider):
    """
    数据库目标提供者 - 从 Target 表及关联资产表查询

    数据来源：
    - iter_hosts(): 根据 Target 类型返回域名/IP
    - iter_urls(): WebSite/Endpoint 表，带回退链

    使用方式：
        provider = DatabaseTargetProvider(target_id=123)
        for host in provider.iter_hosts():
            scan(host)
    """

    def __init__(self, target_id: int, context: Optional[ProviderContext] = None):
        ctx = context or ProviderContext()
        ctx.target_id = target_id
        super().__init__(ctx)
        self._blacklist_filter: Optional['BlacklistFilter'] = None

    def iter_hosts(self) -> Iterator[str]:
        """从数据库查询主机列表，自动展开 CIDR 并应用黑名单过滤"""
        blacklist = self.get_blacklist_filter()

        for host in self._iter_raw_hosts():
            for expanded_host in self._expand_host(host):
                if not blacklist or blacklist.is_allowed(expanded_host):
                    yield expanded_host

    def _iter_raw_hosts(self) -> Iterator[str]:
        """从数据库查询原始主机列表（可能包含 CIDR）"""
        from apps.asset.services.asset.subdomain_service import SubdomainService
        from apps.targets.models import Target
        from apps.targets.services import TargetService

        target = TargetService().get_target(self.target_id)
        if not target:
            logger.warning("Target ID %d 不存在", self.target_id)
            return

        if target.type == Target.TargetType.DOMAIN:
            yield target.name
            for domain in SubdomainService().iter_subdomain_names_by_target(
                target_id=self.target_id,
                chunk_size=1000
            ):
                if domain != target.name:
                    yield domain

        elif target.type in (Target.TargetType.IP, Target.TargetType.CIDR):
            yield target.name

    def iter_urls(self) -> Iterator[str]:
        """从数据库查询 URL 列表，使用回退链：Endpoint → WebSite → Default"""
        from apps.scan.services.target_export_service import (
            DataSource,
            _iter_urls_with_fallback,
        )

        blacklist = self.get_blacklist_filter()

        for url, _ in _iter_urls_with_fallback(
            target_id=self.target_id,
            sources=[DataSource.ENDPOINT, DataSource.WEBSITE, DataSource.DEFAULT],
            blacklist_filter=blacklist
        ):
            yield url

    def get_blacklist_filter(self) -> Optional['BlacklistFilter']:
        """获取黑名单过滤器（延迟加载）"""
        if self._blacklist_filter is None:
            from apps.common.services import BlacklistService
            from apps.common.utils import BlacklistFilter
            rules = BlacklistService().get_rules(self.target_id)
            self._blacklist_filter = BlacklistFilter(rules)
        return self._blacklist_filter
