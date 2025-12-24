import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.exceptions import NotFound, ValidationError as DRFValidationError
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db import DatabaseError, IntegrityError, OperationalError
from django.http import StreamingHttpResponse

from .serializers import (
    SubdomainListSerializer, WebSiteSerializer, DirectorySerializer, 
    VulnerabilitySerializer, EndpointListSerializer, IPAddressAggregatedSerializer,
    SubdomainSnapshotSerializer, WebsiteSnapshotSerializer, DirectorySnapshotSerializer,
    EndpointSnapshotSerializer, VulnerabilitySnapshotSerializer
)
from .services import (
    SubdomainService, WebSiteService, DirectoryService, 
    VulnerabilityService, AssetStatisticsService, EndpointService, HostPortMappingService
)
from .services.snapshot import (
    SubdomainSnapshotsService, WebsiteSnapshotsService, DirectorySnapshotsService,
    EndpointSnapshotsService, HostPortMappingSnapshotsService, VulnerabilitySnapshotsService
)
from apps.common.pagination import BasePagination

logger = logging.getLogger(__name__)


class AssetStatisticsViewSet(viewsets.ViewSet):
    """
    资产统计 API
    
    提供仪表盘所需的统计数据（预聚合，读取缓存表）
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = AssetStatisticsService()
    
    def list(self, request):
        """
        获取资产统计数据
        
        GET /assets/statistics/
        
        返回:
        - totalTargets: 目标总数
        - totalSubdomains: 子域名总数
        - totalIps: IP 总数
        - totalEndpoints: 端点总数
        - totalWebsites: 网站总数
        - totalVulns: 漏洞总数
        - totalAssets: 总资产数
        - runningScans: 运行中的扫描数
        - updatedAt: 统计更新时间
        """
        try:
            stats = self.service.get_statistics()
            return Response({
                'totalTargets': stats['total_targets'],
                'totalSubdomains': stats['total_subdomains'],
                'totalIps': stats['total_ips'],
                'totalEndpoints': stats['total_endpoints'],
                'totalWebsites': stats['total_websites'],
                'totalVulns': stats['total_vulns'],
                'totalAssets': stats['total_assets'],
                'runningScans': stats['running_scans'],
                'updatedAt': stats['updated_at'],
                # 变化值
                'changeTargets': stats['change_targets'],
                'changeSubdomains': stats['change_subdomains'],
                'changeIps': stats['change_ips'],
                'changeEndpoints': stats['change_endpoints'],
                'changeWebsites': stats['change_websites'],
                'changeVulns': stats['change_vulns'],
                'changeAssets': stats['change_assets'],
                # 漏洞严重程度分布
                'vulnBySeverity': stats['vuln_by_severity'],
            })
        except (DatabaseError, OperationalError) as e:
            logger.exception("获取资产统计数据失败")
            return Response(
                {'error': '获取统计数据失败'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request: Request):
        """
        获取统计历史数据（用于折线图）
        
        GET /assets/statistics/history/?days=7
        
        Query Parameters:
            days: 获取最近多少天的数据，默认 7，最大 90
        
        Returns:
            历史数据列表
        """
        try:
            days_param = request.query_params.get('days', '7')
            try:
                days = int(days_param)
            except (ValueError, TypeError):
                days = 7
            days = min(max(days, 1), 90)  # 限制在 1-90 天
            
            history = self.service.get_statistics_history(days=days)
            return Response(history)
        except (DatabaseError, OperationalError) as e:
            logger.exception("获取统计历史数据失败")
            return Response(
                {'error': '获取历史数据失败'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# 注意：IPAddress 模型已被重构为 HostPortMapping
# IPAddressViewSet 已删除，需要根据新架构重新实现


class SubdomainViewSet(viewsets.ModelViewSet):
    """子域名管理 ViewSet
    
    支持两种访问方式：
    1. 嵌套路由：GET /api/targets/{target_pk}/subdomains/
    2. 独立路由：GET /api/subdomains/（全局查询）
    """
    
    serializer_class = SubdomainListSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainService()
    
    def get_queryset(self):
        """根据是否有 target_pk 参数决定查询范围"""
        target_pk = self.kwargs.get('target_pk')
        if target_pk:
            return self.service.get_subdomains_by_target(target_pk)
        return self.service.get_all()

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request, **kwargs):
        """批量创建子域名
        
        POST /api/targets/{target_pk}/subdomains/bulk-create/
        
        请求体:
        {
            "subdomains": ["sub1.example.com", "sub2.example.com"]
        }
        
        响应:
        {
            "message": "批量创建完成",
            "createdCount": 10,
            "skippedCount": 2,
            "invalidCount": 1,
            "mismatchedCount": 1,
            "totalReceived": 14
        }
        """
        from apps.targets.models import Target
        
        target_pk = self.kwargs.get('target_pk')
        if not target_pk:
            return Response(
                {'error': '必须在目标下批量创建子域名'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取目标
        try:
            target = Target.objects.get(pk=target_pk)
        except Target.DoesNotExist:
            return Response(
                {'error': '目标不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 验证目标类型必须为域名
        if target.type != Target.TargetType.DOMAIN:
            return Response(
                {'error': '只有域名类型的目标支持导入子域名'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取请求体中的子域名列表
        subdomains = request.data.get('subdomains', [])
        if not subdomains or not isinstance(subdomains, list):
            return Response(
                {'error': '请求体不能为空或格式错误'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 调用 service 层处理
        try:
            result = self.service.bulk_create_subdomains(
                target_id=int(target_pk),
                target_name=target.name,
                subdomains=subdomains
            )
        except Exception as e:
            logger.exception("批量创建子域名失败")
            return Response(
                {'error': '服务器内部错误'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': '批量创建完成',
            'createdCount': result.created_count,
            'skippedCount': result.skipped_count,
            'invalidCount': result.invalid_count,
            'mismatchedCount': result.mismatched_count,
            'totalReceived': result.total_received,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出子域名为 CSV 格式
        
        CSV 列：name, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime
        
        target_pk = self.kwargs.get('target_pk')
        if not target_pk:
            raise DRFValidationError('必须在目标下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(target_id=target_pk)
        
        headers = ['name', 'created_at']
        formatters = {'created_at': format_datetime}
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="target-{target_pk}-subdomains.csv"'
        return response


class WebSiteViewSet(viewsets.ModelViewSet):
    """站点管理 ViewSet
    
    支持两种访问方式：
    1. 嵌套路由：GET /api/targets/{target_pk}/websites/
    2. 独立路由：GET /api/websites/（全局查询）
    """
    
    serializer_class = WebSiteSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['host']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = WebSiteService()
    
    def get_queryset(self):
        """根据是否有 target_pk 参数决定查询范围"""
        target_pk = self.kwargs.get('target_pk')
        if target_pk:
            return self.service.get_websites_by_target(target_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出网站为 CSV 格式
        
        CSV 列：url, host, location, title, status_code, content_length, content_type, webserver, tech, body_preview, vhost, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime, format_list_field
        
        target_pk = self.kwargs.get('target_pk')
        if not target_pk:
            raise DRFValidationError('必须在目标下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(target_id=target_pk)
        
        headers = [
            'url', 'host', 'location', 'title', 'status_code',
            'content_length', 'content_type', 'webserver', 'tech',
            'body_preview', 'vhost', 'created_at'
        ]
        formatters = {
            'created_at': format_datetime,
            'tech': lambda x: format_list_field(x, separator=','),
        }
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="target-{target_pk}-websites.csv"'
        return response


class DirectoryViewSet(viewsets.ModelViewSet):
    """目录管理 ViewSet
    
    支持两种访问方式：
    1. 嵌套路由：GET /api/targets/{target_pk}/directories/
    2. 独立路由：GET /api/directories/（全局查询）
    """
    
    serializer_class = DirectorySerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['url']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = DirectoryService()
    
    def get_queryset(self):
        """根据是否有 target_pk 参数决定查询范围"""
        target_pk = self.kwargs.get('target_pk')
        if target_pk:
            return self.service.get_directories_by_target(target_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出目录为 CSV 格式
        
        CSV 列：url, status, content_length, words, lines, content_type, duration, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime
        
        target_pk = self.kwargs.get('target_pk')
        if not target_pk:
            raise DRFValidationError('必须在目标下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(target_id=target_pk)
        
        headers = [
            'url', 'status', 'content_length', 'words',
            'lines', 'content_type', 'duration', 'created_at'
        ]
        formatters = {
            'created_at': format_datetime,
        }
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="target-{target_pk}-directories.csv"'
        return response


class EndpointViewSet(viewsets.ModelViewSet):
    """端点管理 ViewSet
    
    支持两种访问方式：
    1. 嵌套路由：GET /api/targets/{target_pk}/endpoints/
    2. 独立路由：GET /api/endpoints/（全局查询）
    """
    
    serializer_class = EndpointListSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['host']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = EndpointService()
    
    def get_queryset(self):
        """根据是否有 target_pk 参数决定查询范围"""
        target_pk = self.kwargs.get('target_pk')
        if target_pk:
            return self.service.get_endpoints_by_target(target_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出端点为 CSV 格式
        
        CSV 列：url, host, location, title, status_code, content_length, content_type, webserver, tech, body_preview, vhost, matched_gf_patterns, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime, format_list_field
        
        target_pk = self.kwargs.get('target_pk')
        if not target_pk:
            raise DRFValidationError('必须在目标下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(target_id=target_pk)
        
        headers = [
            'url', 'host', 'location', 'title', 'status_code',
            'content_length', 'content_type', 'webserver', 'tech',
            'body_preview', 'vhost', 'matched_gf_patterns', 'created_at'
        ]
        formatters = {
            'created_at': format_datetime,
            'tech': lambda x: format_list_field(x, separator=','),
            'matched_gf_patterns': lambda x: format_list_field(x, separator=','),
        }
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="target-{target_pk}-endpoints.csv"'
        return response


class HostPortMappingViewSet(viewsets.ModelViewSet):
    """主机端口映射管理 ViewSet（IP 地址聚合视图）
    
    支持两种访问方式：
    1. 嵌套路由：GET /api/targets/{target_pk}/ip-addresses/
    2. 独立路由：GET /api/ip-addresses/（全局查询）
    
    返回按 IP 聚合的数据，每个 IP 显示其关联的所有 hosts 和 ports
    
    注意：由于返回的是聚合数据（字典列表），不支持 DRF SearchFilter
    """
    
    serializer_class = IPAddressAggregatedSerializer
    pagination_class = BasePagination
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = HostPortMappingService()
    
    def get_queryset(self):
        """根据是否有 target_pk 参数决定查询范围，返回按 IP 聚合的数据"""
        target_pk = self.kwargs.get('target_pk')
        search = self.request.query_params.get('search', None)
        if target_pk:
            return self.service.get_ip_aggregation_by_target(target_pk, search=search)
        return self.service.get_all_ip_aggregation(search=search)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出 IP 地址为 CSV 格式
        
        CSV 列：ip, host, port, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime
        
        target_pk = self.kwargs.get('target_pk')
        if not target_pk:
            raise DRFValidationError('必须在目标下导出')
        
        # 获取流式数据迭代器
        data_iterator = self.service.iter_raw_data_for_csv_export(target_id=target_pk)
        
        # CSV 表头和格式化器
        headers = ['ip', 'host', 'port', 'created_at']
        formatters = {
            'created_at': format_datetime
        }
        
        # 生成流式响应
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="target-{target_pk}-ip-addresses.csv"'
        
        return response


class VulnerabilityViewSet(viewsets.ModelViewSet):
    """漏洞资产管理 ViewSet（只读）
    
    支持两种访问方式：
    1. 嵌套路由：GET /api/targets/{target_pk}/vulnerabilities/
    2. 独立路由：GET /api/vulnerabilities/（全局查询）
    """
    
    serializer_class = VulnerabilitySerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vuln_type']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = VulnerabilityService()
    
    def get_queryset(self):
        """根据是否有 target_pk 参数决定查询范围"""
        target_pk = self.kwargs.get('target_pk')
        if target_pk:
            return self.service.get_vulnerabilities_by_target(target_pk)
        return self.service.get_all()


# ==================== 快照 ViewSet（Scan 嵌套路由） ====================

class SubdomainSnapshotViewSet(viewsets.ModelViewSet):
    """子域名快照 ViewSet - 嵌套路由：GET /api/scans/{scan_pk}/subdomains/"""
    
    serializer_class = SubdomainSnapshotSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainSnapshotsService()
    
    def get_queryset(self):
        scan_pk = self.kwargs.get('scan_pk')
        if scan_pk:
            return self.service.get_by_scan(scan_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出子域名快照为 CSV 格式
        
        CSV 列：name, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime
        
        scan_pk = self.kwargs.get('scan_pk')
        if not scan_pk:
            raise DRFValidationError('必须在扫描下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(scan_id=scan_pk)
        
        headers = ['name', 'created_at']
        formatters = {'created_at': format_datetime}
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="scan-{scan_pk}-subdomains.csv"'
        return response


class WebsiteSnapshotViewSet(viewsets.ModelViewSet):
    """网站快照 ViewSet - 嵌套路由：GET /api/scans/{scan_pk}/websites/"""
    
    serializer_class = WebsiteSnapshotSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['host']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = WebsiteSnapshotsService()
    
    def get_queryset(self):
        scan_pk = self.kwargs.get('scan_pk')
        if scan_pk:
            return self.service.get_by_scan(scan_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出网站快照为 CSV 格式
        
        CSV 列：url, host, location, title, status_code, content_length, content_type, webserver, tech, body_preview, vhost, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime, format_list_field
        
        scan_pk = self.kwargs.get('scan_pk')
        if not scan_pk:
            raise DRFValidationError('必须在扫描下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(scan_id=scan_pk)
        
        headers = [
            'url', 'host', 'location', 'title', 'status_code',
            'content_length', 'content_type', 'webserver', 'tech',
            'body_preview', 'vhost', 'created_at'
        ]
        formatters = {
            'created_at': format_datetime,
            'tech': lambda x: format_list_field(x, separator=','),
        }
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="scan-{scan_pk}-websites.csv"'
        return response


class DirectorySnapshotViewSet(viewsets.ModelViewSet):
    """目录快照 ViewSet - 嵌套路由：GET /api/scans/{scan_pk}/directories/"""
    
    serializer_class = DirectorySnapshotSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['url']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = DirectorySnapshotsService()
    
    def get_queryset(self):
        scan_pk = self.kwargs.get('scan_pk')
        if scan_pk:
            return self.service.get_by_scan(scan_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出目录快照为 CSV 格式
        
        CSV 列：url, status, content_length, words, lines, content_type, duration, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime
        
        scan_pk = self.kwargs.get('scan_pk')
        if not scan_pk:
            raise DRFValidationError('必须在扫描下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(scan_id=scan_pk)
        
        headers = [
            'url', 'status', 'content_length', 'words',
            'lines', 'content_type', 'duration', 'created_at'
        ]
        formatters = {
            'created_at': format_datetime,
        }
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="scan-{scan_pk}-directories.csv"'
        return response


class EndpointSnapshotViewSet(viewsets.ModelViewSet):
    """端点快照 ViewSet - 嵌套路由：GET /api/scans/{scan_pk}/endpoints/"""
    
    serializer_class = EndpointSnapshotSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['host']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = EndpointSnapshotsService()
    
    def get_queryset(self):
        scan_pk = self.kwargs.get('scan_pk')
        if scan_pk:
            return self.service.get_by_scan(scan_pk)
        return self.service.get_all()

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出端点快照为 CSV 格式
        
        CSV 列：url, host, location, title, status_code, content_length, content_type, webserver, tech, body_preview, vhost, matched_gf_patterns, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime, format_list_field
        
        scan_pk = self.kwargs.get('scan_pk')
        if not scan_pk:
            raise DRFValidationError('必须在扫描下导出')
        
        data_iterator = self.service.iter_raw_data_for_csv_export(scan_id=scan_pk)
        
        headers = [
            'url', 'host', 'location', 'title', 'status_code',
            'content_length', 'content_type', 'webserver', 'tech',
            'body_preview', 'vhost', 'matched_gf_patterns', 'created_at'
        ]
        formatters = {
            'created_at': format_datetime,
            'tech': lambda x: format_list_field(x, separator=','),
            'matched_gf_patterns': lambda x: format_list_field(x, separator=','),
        }
        
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="scan-{scan_pk}-endpoints.csv"'
        return response


class HostPortMappingSnapshotViewSet(viewsets.ModelViewSet):
    """主机端口映射快照 ViewSet - 嵌套路由：GET /api/scans/{scan_pk}/ip-addresses/
    
    注意：由于返回的是聚合数据（字典列表），不支持 DRF SearchFilter
    """
    
    serializer_class = IPAddressAggregatedSerializer
    pagination_class = BasePagination
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = HostPortMappingSnapshotsService()
    
    def get_queryset(self):
        scan_pk = self.kwargs.get('scan_pk')
        search = self.request.query_params.get('search', None)
        if scan_pk:
            return self.service.get_ip_aggregation_by_scan(scan_pk, search=search)
        return self.service.get_all_ip_aggregation(search=search)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request, **kwargs):
        """导出 IP 地址为 CSV 格式
        
        CSV 列：ip, host, port, created_at
        """
        from apps.common.utils import generate_csv_rows, format_datetime
        
        scan_pk = self.kwargs.get('scan_pk')
        if not scan_pk:
            raise DRFValidationError('必须在扫描下导出')
        
        # 获取流式数据迭代器
        data_iterator = self.service.iter_raw_data_for_csv_export(scan_id=scan_pk)
        
        # CSV 表头和格式化器
        headers = ['ip', 'host', 'port', 'created_at']
        formatters = {
            'created_at': format_datetime
        }
        
        # 生成流式响应
        response = StreamingHttpResponse(
            generate_csv_rows(data_iterator, headers, formatters),
            content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="scan-{scan_pk}-ip-addresses.csv"'
        
        return response


class VulnerabilitySnapshotViewSet(viewsets.ModelViewSet):
    """漏洞快照 ViewSet - 嵌套路由：GET /api/scans/{scan_pk}/vulnerabilities/"""
    
    serializer_class = VulnerabilitySnapshotSerializer
    pagination_class = BasePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vuln_type']
    ordering = ['-created_at']
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = VulnerabilitySnapshotsService()
    
    def get_queryset(self):
        scan_pk = self.kwargs.get('scan_pk')
        if scan_pk:
            return self.service.get_by_scan(scan_pk)
        return self.service.get_all()
