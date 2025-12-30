"""
系统日志视图模块

提供系统日志的 REST API 接口，供前端实时查看系统运行日志。
"""

import logging

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.response_helpers import success_response, error_response
from apps.common.error_codes import ErrorCodes
from apps.common.services.system_log_service import SystemLogService


logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class SystemLogsView(APIView):
    """
    系统日志 API 视图
    
    GET /api/system/logs/
        获取系统日志内容
        
    Query Parameters:
        lines (int, optional): 返回的日志行数，默认 200，最大 10000
        
    Response:
        {
            "content": "日志内容字符串..."
        }
        
    Note:
        - 当前为开发阶段，暂时允许匿名访问
        - 生产环境应添加管理员权限验证
    """
    
    # TODO: 生产环境应改为 IsAdminUser 权限
    authentication_classes = []
    permission_classes = [AllowAny]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SystemLogService()

    def get(self, request):
        """
        获取系统日志
        
        支持通过 lines 参数控制返回行数，用于前端分页或实时刷新场景。
        """
        try:
            # 解析 lines 参数
            lines_raw = request.query_params.get("lines")
            lines = int(lines_raw) if lines_raw is not None else None

            # 调用服务获取日志内容
            content = self.service.get_logs_content(lines=lines)
            return success_response(data={"content": content})
        except ValueError:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='lines must be an integer',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            logger.exception("获取系统日志失败")
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                message='Failed to get system logs',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
