"""
xingfinger 执行任务

流式执行 xingfinger 命令并实时更新 tech 字段
"""

import importlib
import json
import logging
import subprocess
from typing import Optional, Generator
from urllib.parse import urlparse

from django.db import connection
from prefect import task

from apps.scan.utils import execute_stream

logger = logging.getLogger(__name__)


# 数据源映射：source → (module_path, model_name, url_field)
SOURCE_MODEL_MAP = {
    'website': ('apps.asset.models', 'WebSite', 'url'),
    # 以后扩展：
    # 'endpoint': ('apps.asset.models', 'Endpoint', 'url'),
    # 'directory': ('apps.asset.models', 'Directory', 'url'),
}


def _get_model_class(source: str):
    """根据数据源类型获取 Model 类"""
    if source not in SOURCE_MODEL_MAP:
        raise ValueError(f"不支持的数据源: {source}")
    
    module_path, model_name, _ = SOURCE_MODEL_MAP[source]
    module = importlib.import_module(module_path)
    return getattr(module, model_name)


def parse_xingfinger_line(line: str) -> tuple[str, list[str]] | None:
    """
    解析 xingfinger 单行 JSON 输出
    
    xingfinger 静默模式输出格式：
    {"url": "https://example.com", "cms": "WordPress,PHP,nginx", ...}
    
    Returns:
        tuple: (url, tech_list) 或 None（解析失败时）
    """
    try:
        item = json.loads(line)
        url = item.get('url', '').strip()
        cms = item.get('cms', '')
        
        if not url or not cms:
            return None
        
        # cms 字段按逗号分割，去除空白
        techs = [t.strip() for t in cms.split(',') if t.strip()]
        
        return (url, techs) if techs else None
        
    except json.JSONDecodeError:
        return None


def bulk_merge_tech_field(
    source: str,
    url_techs_map: dict[str, list[str]],
    target_id: int
) -> dict:
    """
    批量合并 tech 数组字段（PostgreSQL 原生 SQL）
    
    使用 PostgreSQL 原生 SQL 实现高效的数组合并去重操作。
    如果 URL 对应的记录不存在，会自动创建新记录。
    
    Returns:
        dict: {'updated_count': int, 'created_count': int}
    """
    Model = _get_model_class(source)
    table_name = Model._meta.db_table
    
    updated_count = 0
    created_count = 0
    
    with connection.cursor() as cursor:
        for url, techs in url_techs_map.items():
            if not techs:
                continue
            
            # 先尝试更新（PostgreSQL 数组合并去重）
            sql = f"""
                UPDATE {table_name}
                SET tech = (
                    SELECT ARRAY(SELECT DISTINCT unnest(
                        COALESCE(tech, ARRAY[]::varchar[]) || %s::varchar[]
                    ))
                )
                WHERE url = %s AND target_id = %s
            """
            
            cursor.execute(sql, [techs, url, target_id])
            
            if cursor.rowcount > 0:
                updated_count += cursor.rowcount
            else:
                # 记录不存在，创建新记录
                try:
                    # 从 URL 提取 host
                    parsed = urlparse(url)
                    host = parsed.hostname or ''
                    
                    # 插入新记录（带冲突处理）
                    # 显式传入所有 NOT NULL 字段的默认值
                    insert_sql = f"""
                        INSERT INTO {table_name} (target_id, url, host, location, title, webserver, body_preview, content_type, tech, created_at)
                        VALUES (%s, %s, %s, '', '', '', '', '', %s::varchar[], NOW())
                        ON CONFLICT (target_id, url) DO UPDATE SET
                            tech = (
                                SELECT ARRAY(SELECT DISTINCT unnest(
                                    COALESCE({table_name}.tech, ARRAY[]::varchar[]) || EXCLUDED.tech
                                ))
                            )
                    """
                    cursor.execute(insert_sql, [target_id, url, host, techs])
                    created_count += 1
                    
                except Exception as e:
                    logger.warning("创建 %s 记录失败 (url=%s): %s", source, url, e)
    
    return {
        'updated_count': updated_count,
        'created_count': created_count
    }


def _parse_xingfinger_stream_output(
    cmd: str,
    tool_name: str,
    cwd: Optional[str] = None,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> Generator[tuple[str, list[str]], None, None]:
    """
    流式解析 xingfinger 命令输出
    
    基于 execute_stream 实时处理 xingfinger 命令的 stdout，将每行 JSON 输出
    转换为 (url, tech_list) 格式
    """
    logger.info("开始流式解析 xingfinger 命令输出 - 命令: %s", cmd)
    
    total_lines = 0
    valid_records = 0
    
    try:
        for line in execute_stream(cmd=cmd, tool_name=tool_name, cwd=cwd, shell=True, timeout=timeout, log_file=log_file):
            total_lines += 1
            
            # 解析单行 JSON
            result = parse_xingfinger_line(line)
            if result is None:
                continue
            
            valid_records += 1
            yield result
            
            # 每处理 500 条记录输出一次进度
            if valid_records % 500 == 0:
                logger.info("已解析 %d 条有效记录...", valid_records)
                
    except subprocess.TimeoutExpired as e:
        error_msg = f"xingfinger 命令执行超时 - 超过 {timeout} 秒"
        logger.warning(error_msg)
        raise RuntimeError(error_msg) from e
    except Exception as e:
        logger.error("流式解析 xingfinger 输出失败: %s", e, exc_info=True)
        raise
    
    logger.info("流式解析完成 - 总行数: %d, 有效记录: %d", total_lines, valid_records)


@task(name="run_xingfinger_and_stream_update_tech")
def run_xingfinger_and_stream_update_tech_task(
    cmd: str,
    tool_name: str,
    scan_id: int,
    target_id: int,
    source: str,
    cwd: str,
    timeout: int,
    log_file: str,
    batch_size: int = 100
) -> dict:
    """
    流式执行 xingfinger 命令并实时更新 tech 字段
    
    根据 source 参数更新对应表的 tech 字段：
    - website → WebSite.tech
    - endpoint → Endpoint.tech（以后扩展）
    
    处理流程：
    1. 流式执行 xingfinger 命令
    2. 实时解析 JSON 输出
    3. 累积到 batch_size 条后批量更新数据库
    4. 使用 PostgreSQL 原生 SQL 进行数组合并去重
    5. 如果记录不存在，自动创建
    
    Returns:
        dict: {
            'processed_records': int,
            'updated_count': int,
            'created_count': int,
            'batch_count': int
        }
    """
    logger.info(
        "开始执行 xingfinger 并更新 tech - target_id=%s, source=%s, timeout=%s秒",
        target_id, source, timeout
    )
    
    data_generator = None
    
    try:
        # 初始化统计
        processed_records = 0
        updated_count = 0
        created_count = 0
        batch_count = 0
        
        # 当前批次的 URL -> techs 映射
        url_techs_map = {}
        
        # 流式处理
        data_generator = _parse_xingfinger_stream_output(
            cmd=cmd,
            tool_name=tool_name,
            cwd=cwd,
            timeout=timeout,
            log_file=log_file
        )
        
        for url, techs in data_generator:
            processed_records += 1
            
            # 累积到 url_techs_map
            if url in url_techs_map:
                # 合并同一 URL 的多次识别结果
                url_techs_map[url].extend(techs)
            else:
                url_techs_map[url] = techs
            
            # 达到批次大小，执行批量更新
            if len(url_techs_map) >= batch_size:
                batch_count += 1
                result = bulk_merge_tech_field(source, url_techs_map, target_id)
                updated_count += result['updated_count']
                created_count += result.get('created_count', 0)
                
                logger.debug(
                    "批次 %d 完成 - 更新: %d, 创建: %d",
                    batch_count, result['updated_count'], result.get('created_count', 0)
                )
                
                # 清空批次
                url_techs_map = {}
        
        # 处理最后一批
        if url_techs_map:
            batch_count += 1
            result = bulk_merge_tech_field(source, url_techs_map, target_id)
            updated_count += result['updated_count']
            created_count += result.get('created_count', 0)
        
        logger.info(
            "✓ xingfinger 执行完成 - 处理记录: %d, 更新: %d, 创建: %d, 批次: %d",
            processed_records, updated_count, created_count, batch_count
        )
        
        return {
            'processed_records': processed_records,
            'updated_count': updated_count,
            'created_count': created_count,
            'batch_count': batch_count
        }
        
    except subprocess.TimeoutExpired:
        logger.warning("⚠️ xingfinger 执行超时 - target_id=%s, timeout=%s秒", target_id, timeout)
        raise
    except Exception as e:
        error_msg = f"xingfinger 执行失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e
    finally:
        # 清理资源
        if data_generator is not None:
            try:
                data_generator.close()
            except Exception as e:
                logger.debug("关闭生成器时出错: %s", e)
