"use client"

import React, { useState, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { useTargetEndpoints, useTarget } from "@/hooks/use-targets"
import { useDeleteEndpoint, useScanEndpoints } from "@/hooks/use-endpoints"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import { LoadingSpinner } from "@/components/loading-spinner"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { BulkAddUrlsDialog } from "@/components/common/bulk-add-urls-dialog"
import type { TargetType } from "@/lib/url-validator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Endpoint } from "@/types/endpoint.types"
import { EndpointService } from "@/services/endpoint.service"
import { toast } from "sonner"

/**
 * 目标端点详情视图组件
 * 用于显示和管理目标下的端点列表
 */
export function EndpointsDetailView({
  targetId,
  scanId,
}: {
  targetId?: number
  scanId?: number
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null)
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([])
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false)

  // 分页状态管理
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // 获取目标信息（用于 URL 匹配校验）
  const { data: target } = useTarget(targetId || 0, { enabled: !!targetId })

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  // 删除相关 hooks
  const deleteEndpoint = useDeleteEndpoint()

  // 使用 React Query 获取端点数据：优先按 targetId，其次按 scanId（历史快照）
  const targetEndpointsQuery = useTargetEndpoints(targetId || 0, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: searchQuery || undefined,
  }, { enabled: !!targetId })

  const scanEndpointsQuery = useScanEndpoints(scanId || 0, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: searchQuery || undefined,
  }, { enabled: !!scanId })

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = targetId ? targetEndpointsQuery : scanEndpointsQuery

  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

  // 辅助函数 - 格式化日期
  const formatDate = React.useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [])


  // 确认删除端点
  const confirmDelete = async () => {
    if (!endpointToDelete) return

    setDeleteDialogOpen(false)
    setEndpointToDelete(null)

    deleteEndpoint.mutate(endpointToDelete.id)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  const handleSelectionChange = React.useCallback((selectedRows: Endpoint[]) => {
    setSelectedEndpoints(selectedRows)
  }, [])

  // 创建列定义
  const endpointColumns = useMemo(
    () =>
      createEndpointColumns({
        formatDate,
      }),
    [formatDate]
  )

  // 格式化日期为 YYYY-MM-DD HH:MM:SS（与后端一致）
  const formatDateForCSV = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // CSV 转义
  const escapeCSV = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // 格式化数组为逗号分隔字符串
  const formatArrayForCSV = (arr: string[] | undefined): string => {
    if (!arr || arr.length === 0) return ''
    return arr.join(',')
  }

  // 生成 CSV 内容
  const generateCSV = (items: Endpoint[]): string => {
    const BOM = '\ufeff'
    const headers = [
      'url', 'host', 'location', 'title', 'status_code',
      'content_length', 'content_type', 'webserver', 'tech',
      'body_preview', 'vhost', 'matched_gf_patterns', 'created_at'
    ]
    
    const rows = items.map(item => [
      escapeCSV(item.url),
      escapeCSV(item.host),
      escapeCSV(item.location),
      escapeCSV(item.title),
      escapeCSV(item.statusCode),
      escapeCSV(item.contentLength),
      escapeCSV(item.contentType),
      escapeCSV(item.webserver),
      escapeCSV(formatArrayForCSV(item.tech)),
      escapeCSV(item.bodyPreview),
      escapeCSV(item.vhost),
      escapeCSV(formatArrayForCSV(item.tags ?? undefined)),
      escapeCSV(formatDateForCSV(item.createdAt ?? ''))
    ].join(','))
    
    return BOM + [headers.join(','), ...rows].join('\n')
  }

  // 下载所有端点 URL
  const handleDownloadAll = async () => {
    try {
      let blob: Blob | null = null

      if (scanId) {
        const data = await EndpointService.exportEndpointsByScanId(scanId)
        blob = data
      } else if (targetId) {
        const data = await EndpointService.exportEndpointsByTargetId(targetId)
        blob = data
      } else {
        const endpoints: Endpoint[] = (data as any)?.endpoints || []
        if (!endpoints || endpoints.length === 0) {
          return
        }
        const csvContent = generateCSV(endpoints)
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      }

      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "endpoints"
      a.href = url
      a.download = `${prefix}-endpoints-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("下载端点列表失败", error)
      toast.error("下载端点列表失败，请稍后重试")
    }
  }

  // 下载选中的端点 URL
  const handleDownloadSelected = () => {
    if (selectedEndpoints.length === 0) {
      return
    }
    const csvContent = generateCSV(selectedEndpoints)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "endpoints"
    a.href = url
    a.download = `${prefix}-endpoints-selected-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载端点数据时出现错误，请重试"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重新加载
        </button>
      </div>
    )
  }

  // 加载状态（仅首次加载时显示骨架屏）
  if (isLoading && !data) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={2}
        rows={6}
        columns={5}
      />
    )
  }

  return (
    <>
      <EndpointsDataTable
        data={data?.endpoints || []}
        columns={endpointColumns}
        searchPlaceholder="搜索主机名..."
        searchValue={searchQuery}
        onSearch={handleSearchChange}
        isSearching={isSearching}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        totalCount={data?.pagination?.total || 0}
        totalPages={data?.pagination?.totalPages || 1}
        onSelectionChange={handleSelectionChange}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onBulkAdd={targetId ? () => setBulkAddDialogOpen(true) : undefined}
      />

      {/* 批量添加弹窗 */}
      {targetId && (
        <BulkAddUrlsDialog
          targetId={targetId}
          assetType="endpoint"
          targetName={target?.name}
          targetType={target?.type as TargetType}
          open={bulkAddDialogOpen}
          onOpenChange={setBulkAddDialogOpen}
          onSuccess={() => refetch()}
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该端点及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEndpoint.isPending}
            >
              {deleteEndpoint.isPending ? (
                <>
                  <LoadingSpinner />
                  删除中...
                </>
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
