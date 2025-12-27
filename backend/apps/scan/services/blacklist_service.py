"""
黑名单过滤服务

过滤敏感域名（如 .gov、.edu、.mil 等）

当前版本使用默认规则，后续将支持从前端配置加载。
"""

from typing import List, Optional
from django.db.models import QuerySet
import re
import logging

logger = logging.getLogger(__name__)


class BlacklistService:
    """
    黑名单过滤服务 - 过滤敏感域名
    
    TODO: 后续版本支持从前端配置加载黑名单规则
    - 用户在开始扫描时配置黑名单 URL、域名、IP
    - 黑名单规则存储在数据库中，与 Scan 或 Engine 关联
    """
    
    # 默认黑名单正则规则
    DEFAULT_PATTERNS = [
        r'\.gov$',           # .gov 结尾
        r'\.gov\.[a-z]{2}$', # .gov.cn, .gov.uk 等
        r'\.edu$',           # .edu 结尾
        r'\.edu\.[a-z]{2}$', # .edu.cn 等
        r'\.mil$',           # .mil 结尾
    ]
    
    def __init__(self, patterns: Optional[List[str]] = None):
        """
        初始化黑名单服务
        
        Args:
            patterns: 正则表达式列表，None 使用默认规则
        """
        self.patterns = patterns or self.DEFAULT_PATTERNS
        self._compiled_patterns = [re.compile(p) for p in self.patterns]
    
    def filter_queryset(
        self,
        queryset: QuerySet,
        url_field: str = 'url'
    ) -> QuerySet:
        """
        数据库层面过滤 queryset
        
        使用 PostgreSQL 正则表达式排除黑名单 URL
        
        Args:
            queryset: 原始 queryset
            url_field: URL 字段名
            
        Returns:
            QuerySet: 过滤后的 queryset
        """
        for pattern in self.patterns:
            queryset = queryset.exclude(**{f'{url_field}__regex': pattern})
        return queryset
    
    def filter_url(self, url: str) -> bool:
        """
        检查单个 URL 是否通过黑名单过滤
        
        Args:
            url: 要检查的 URL
            
        Returns:
            bool: True 表示通过（不在黑名单），False 表示被过滤
        """
        for pattern in self._compiled_patterns:
            if pattern.search(url):
                return False
        return True
    
    # TODO: 后续版本实现
    # @classmethod
    # def from_scan(cls, scan_id: int) -> 'BlacklistService':
    #     """从数据库加载扫描配置的黑名单规则"""
    #     pass
