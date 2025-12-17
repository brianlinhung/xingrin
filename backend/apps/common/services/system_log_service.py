"""
系统日志服务模块

提供系统日志的读取和处理功能，支持：
- 从多个日志目录读取日志文件
- 按时间戳排序日志条目
- 限制返回行数，防止内存溢出
"""

import glob
import json
import logging
import subprocess
from datetime import datetime


logger = logging.getLogger(__name__)


class SystemLogService:
    """
    系统日志服务类
    
    负责读取和处理系统日志文件，支持从容器内路径或宿主机挂载路径读取日志。
    日志会按时间戳排序后返回，支持 JSON 格式的结构化日志解析。
    """
    
    def __init__(self):
        # 日志文件搜索路径（按优先级排序，找到第一个有效路径后停止）
        self.log_globs = [
            "/app/backend/logs/*",      # Docker 容器内路径
            "/opt/xingrin/logs/*",      # 宿主机挂载路径
        ]
        self.default_lines = 200        # 默认返回行数
        self.max_lines = 10000          # 最大返回行数限制
        self.timeout_seconds = 3        # tail 命令超时时间

    def get_logs_content(self, lines: int | None = None) -> str:
        """
        获取系统日志内容
        
        Args:
            lines: 返回的日志行数，默认 200 行，最大 10000 行
            
        Returns:
            str: 按时间排序的日志内容，每行以换行符分隔
        """
        # 参数校验和默认值处理
        if lines is None:
            lines = self.default_lines

        lines = int(lines)
        if lines < 1:
            lines = 1
        if lines > self.max_lines:
            lines = self.max_lines

        # 查找日志文件（按优先级匹配第一个有效的日志目录）
        files: list[str] = []
        for pattern in self.log_globs:
            matched = sorted(glob.glob(pattern))
            if matched:
                files = matched
                break
        
        if not files:
            return ""

        # 使用 tail 命令读取日志文件末尾内容
        # -q: 静默模式，不输出文件名头
        # -n: 指定读取行数
        cmd = ["tail", "-q", "-n", str(lines), *files]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.timeout_seconds,
            check=False,
        )

        if result.returncode != 0:
            logger.warning(
                "tail command failed: returncode=%s stderr=%s",
                result.returncode,
                (result.stderr or "").strip(),
            )

        # 过滤空行
        raw = result.stdout or ""
        raw_lines = [ln for ln in raw.splitlines() if ln.strip()]

        # 解析日志行，提取时间戳用于排序
        # 支持 JSON 格式日志（包含 asctime 字段）和方括号格式 [2025-12-17 17:09:06]
        parsed: list[tuple[datetime | None, int, str]] = []
        for idx, line in enumerate(raw_lines):
            ts: datetime | None = None
            # 尝试解析 JSON 格式日志
            if line.startswith("{") and line.endswith("}"):
                try:
                    obj = json.loads(line)
                    asctime = obj.get("asctime")
                    if isinstance(asctime, str):
                        ts = datetime.strptime(asctime, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    ts = None
            # 尝试解析方括号格式日志: [2025-12-17 17:09:06]
            elif line.startswith("["):
                try:
                    # 提取第一个方括号内的时间戳
                    end_bracket = line.find("]")
                    if end_bracket > 1:
                        time_str = line[1:end_bracket]
                        ts = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    ts = None
            parsed.append((ts, idx, line))

        # 按时间戳排序（无时间戳的行排在最后，保持原始顺序）
        parsed.sort(key=lambda x: (x[0] is None, x[0] or datetime.min, x[1]))
        sorted_lines = [x[2] for x in parsed]
        
        # 截取最后 N 行
        if len(sorted_lines) > lines:
            sorted_lines = sorted_lines[-lines:]

        return "\n".join(sorted_lines) + ("\n" if sorted_lines else "")
