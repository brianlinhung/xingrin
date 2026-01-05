"""
导出主机列表到 TXT 文件的 Task

使用 TargetExportService.export_hosts() 统一处理导出逻辑

根据 Target 类型决定导出内容：
- DOMAIN: 从 Subdomain 表导出子域名
- IP: 直接写入 target.name
- CIDR: 展开 CIDR 范围内的所有 IP
"""
import logging
from prefect import task

from apps.scan.services.target_export_service import create_export_service

logger = logging.getLogger(__name__)


@task(name="export_hosts")
def export_hosts_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000
) -> dict:
    """
    导出主机列表到 TXT 文件
    
    根据 Target 类型自动决定导出内容：
    - DOMAIN: 从 Subdomain 表导出子域名（流式处理，支持 10万+ 域名）
    - IP: 直接写入 target.name（单个 IP）
    - CIDR: 展开 CIDR 范围内的所有可用 IP

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次读取的批次大小，默认 1000（仅对 DOMAIN 类型有效）

    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int,
            'target_type': str
        }

    Raises:
        ValueError: Target 不存在
        IOError: 文件写入失败
    """
    # 使用工厂函数创建导出服务
    export_service = create_export_service(target_id)
    
    result = export_service.export_hosts(
        target_id=target_id,
        output_path=output_file,
        batch_size=batch_size
    )
    
    # 保持返回值格式不变（向后兼容）
    return {
        'success': result['success'],
        'output_file': result['output_file'],
        'total_count': result['total_count'],
        'target_type': result['target_type']
    }
