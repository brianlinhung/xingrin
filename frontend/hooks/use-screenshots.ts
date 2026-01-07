import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ScreenshotService, type PaginatedResponse, type Screenshot, type ScreenshotSnapshot } from '@/services/screenshot.service'

// 获取目标的截图列表
export function useTargetScreenshots(
  targetId: number,
  params: { page: number; pageSize: number; filter?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['target-screenshots', targetId, params],
    queryFn: () => ScreenshotService.getByTarget(targetId, params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}

// 获取扫描的截图快照列表
export function useScanScreenshots(
  scanId: number,
  params: { page: number; pageSize: number; filter?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['scan-screenshots', scanId, params],
    queryFn: () => ScreenshotService.getByScan(scanId, params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}
