/**
 * 扫描日志轮询 Hook
 * 
 * 功能：
 * - 初始加载获取全部日志
 * - 增量轮询获取新日志（3s 间隔）
 * - 扫描结束后停止轮询
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getScanLogs, type ScanLog } from '@/services/scan.service'

interface UseScanLogsOptions {
  scanId: number
  enabled?: boolean
  pollingInterval?: number  // 默认 3000ms
}

interface UseScanLogsReturn {
  logs: ScanLog[]
  loading: boolean
  refetch: () => void
}

export function useScanLogs({
  scanId,
  enabled = true,
  pollingInterval = 3000,
}: UseScanLogsOptions): UseScanLogsReturn {
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [loading, setLoading] = useState(false)
  const lastLogId = useRef<number | null>(null)
  const isMounted = useRef(true)
  
  const fetchLogs = useCallback(async (incremental = false) => {
    if (!enabled || !isMounted.current) return
    
    setLoading(true)
    try {
      const params: { limit: number; afterId?: number } = { limit: 200 }
      if (incremental && lastLogId.current !== null) {
        params.afterId = lastLogId.current
      }
      
      const response = await getScanLogs(scanId, params)
      const newLogs = response.results
      
      if (!isMounted.current) return
      
      if (newLogs.length > 0) {
        // 使用 ID 作为游标，ID 是唯一且自增的，避免时间戳重复导致的重复日志
        lastLogId.current = newLogs[newLogs.length - 1].id
        
        if (incremental) {
          // 按 ID 去重，防止 React Strict Mode 或竞态条件导致的重复
          setLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id))
            const uniqueNewLogs = newLogs.filter(l => !existingIds.has(l.id))
            return uniqueNewLogs.length > 0 ? [...prev, ...uniqueNewLogs] : prev
          })
        } else {
          setLogs(newLogs)
        }
      }
    } catch (error) {
      console.error('Failed to fetch scan logs:', error)
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [scanId, enabled])
  
  // 初始加载
  useEffect(() => {
    isMounted.current = true
    if (enabled) {
      // 重置状态
      setLogs([])
      lastLogId.current = null
      fetchLogs(false)
    }
    return () => {
      isMounted.current = false
    }
  }, [scanId, enabled])
  
  // 轮询
  useEffect(() => {
    if (!enabled) return
    
    const interval = setInterval(() => {
      fetchLogs(true)  // 增量查询
    }, pollingInterval)
    
    return () => clearInterval(interval)
  }, [enabled, pollingInterval, fetchLogs])
  
  const refetch = useCallback(() => {
    setLogs([])
    lastLogId.current = null
    fetchLogs(false)
  }, [fetchLogs])
  
  return { logs, loading, refetch }
}
