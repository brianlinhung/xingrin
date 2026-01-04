"use client"

import { useEffect, useRef, useMemo } from "react"
import type { ScanLog } from "@/services/scan.service"

interface ScanLogListProps {
  logs: ScanLog[]
  loading?: boolean
}

/**
 * 格式化时间为 HH:mm:ss
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

/**
 * HTML 转义，防止 XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 扫描日志列表组件
 * 
 * 特性：
 * - 预渲染 HTML 字符串，减少 DOM 节点提升性能
 * - 颜色区分：info=默认, warning=黄色, error=红色
 * - 自动滚动到底部
 */
export function ScanLogList({ logs, loading }: ScanLogListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)  // 跟踪用户是否在底部
  
  // 预渲染 HTML 字符串
  const htmlContent = useMemo(() => {
    if (logs.length === 0) return ''
    
    return logs.map(log => {
      const time = formatTime(log.createdAt)
      const content = escapeHtml(log.content)
      const levelStyle = log.level === 'error' 
        ? 'color:#ef4444' 
        : log.level === 'warning' 
          ? 'color:#eab308' 
          : ''
      
      return `<div style="line-height:1.625;word-break:break-all;${levelStyle}"><span style="color:#6b7280">${time}</span> ${content}</div>`
    }).join('')
  }, [logs])
  
  // 监听滚动事件，检测用户是否在底部
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // 允许 30px 的容差，认为在底部附近
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 30
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
  
  // 只有用户在底部时才自动滚动
  useEffect(() => {
    if (containerRef.current && isAtBottomRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [htmlContent])
  
  return (
    <div 
      ref={containerRef}
      className="h-[400px] overflow-y-auto font-mono text-[11px] p-3 bg-muted/30 rounded-lg"
    >
      {logs.length === 0 && !loading && (
        <div className="text-muted-foreground text-center py-8">
          暂无日志
        </div>
      )}
      {htmlContent && (
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      )}
      {loading && logs.length === 0 && (
        <div className="text-muted-foreground text-center py-8">
          加载中...
        </div>
      )}
    </div>
  )
}
