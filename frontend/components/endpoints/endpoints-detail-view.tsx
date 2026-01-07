"use client"

import React, { useState, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useTargetEndpoints, useTarget } from "@/hooks/use-targets"
import { useDeleteEndpoint, useScanEndpoints } from "@/hooks/use-endpoints"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import { LoadingSpinner } from "@/components/loading-spinner"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { BulkAddUrlsDialog } from "@/components/common/bulk-add-urls-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getDateLocale } from "@/lib/date-utils"
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
 * Target endpoint detail view component
 * Used to display and manage the endpoint list under a target
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
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination state management
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  const [filterQuery, setFilterQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tToast = useTranslations("toast")
  const tConfirm = useTranslations("common.confirm")
  const locale = useLocale()

  // Build translation object
  const translations = useMemo(() => ({
    columns: {
      url: tColumns("common.url"),
      host: tColumns("endpoint.host"),
      title: tColumns("endpoint.title"),
      status: tColumns("common.status"),
      contentLength: tColumns("endpoint.contentLength"),
      location: tColumns("endpoint.location"),
      webServer: tColumns("endpoint.webServer"),
      contentType: tColumns("endpoint.contentType"),
      technologies: tColumns("endpoint.technologies"),
      responseBody: tColumns("endpoint.responseBody"),
      vhost: tColumns("endpoint.vhost"),
      gfPatterns: tColumns("endpoint.gfPatterns"),
      responseHeaders: tColumns("endpoint.responseHeaders"),
      responseTime: tColumns("endpoint.responseTime"),
      createdAt: tColumns("common.createdAt"),
    },
    actions: {
      selectAll: tCommon("actions.selectAll"),
      selectRow: tCommon("actions.selectRow"),
    },
  }), [tColumns, tCommon])

  // Get target info (for URL matching validation)
  const { data: target } = useTarget(targetId || 0, { enabled: !!targetId })

  const handleFilterChange = (value: string) => {
    setIsSearching(true)
    setFilterQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  // Delete related hooks
  const deleteEndpoint = useDeleteEndpoint()

  // Use React Query to fetch endpoint data: prioritize by targetId, then by scanId (historical snapshot)
  const targetEndpointsQuery = useTargetEndpoints(targetId || 0, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    filter: filterQuery || undefined,
  }, { enabled: !!targetId })

  const scanEndpointsQuery = useScanEndpoints(
    scanId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!scanId },
    filterQuery || undefined,
  )

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

  // Helper function - format date
  const formatDate = React.useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleString(getDateLocale(locale), {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [locale])


  // Confirm delete endpoint
  const confirmDelete = async () => {
    if (!endpointToDelete) return

    setDeleteDialogOpen(false)
    setEndpointToDelete(null)

    deleteEndpoint.mutate(endpointToDelete.id)
  }

  // Handle pagination change
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  const handleSelectionChange = React.useCallback((selectedRows: Endpoint[]) => {
    setSelectedEndpoints(selectedRows)
  }, [])

  // Create column definitions
  const endpointColumns = useMemo(
    () =>
      createEndpointColumns({
        formatDate,
        t: translations,
      }),
    [formatDate, translations]
  )

  // Format date as YYYY-MM-DD HH:MM:SS (consistent with backend)
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

  // CSV escape
  const escapeCSV = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Format array as comma-separated string
  const formatArrayForCSV = (arr: string[] | undefined): string => {
    if (!arr || arr.length === 0) return ''
    return arr.join(',')
  }

  // Generate CSV content
  const generateCSV = (items: Endpoint[]): string => {
    const BOM = '\ufeff'
    const headers = [
      'url', 'host', 'location', 'title', 'status_code',
      'content_length', 'content_type', 'webserver', 'tech',
      'response_body', 'vhost', 'matched_gf_patterns', 'created_at'
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
      escapeCSV(item.responseBody),
      escapeCSV(item.vhost),
      escapeCSV(formatDateForCSV(item.createdAt ?? ''))
    ].join(','))
    
    return BOM + [headers.join(','), ...rows].join('\n')
  }

  // Download all endpoint URLs
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
      console.error("Failed to download endpoint list", error)
      toast.error(tToast("downloadFailed"))
    }
  }

  // Download selected endpoint URLs
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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedEndpoints.length === 0) return
    
    setIsDeleting(true)
    try {
      const ids = selectedEndpoints.map(e => e.id)
      const result = await EndpointService.bulkDelete(ids)
      toast.success(tToast("deleteSuccess", { count: result.deletedCount }))
      setSelectedEndpoints([])
      setBulkDeleteDialogOpen(false)
      refetch()
    } catch (error) {
      console.error("Failed to delete endpoints", error)
      toast.error(tToast("deleteFailed"))
    } finally {
      setIsDeleting(false)
    }
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tCommon("status.error")}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || tCommon("status.error")}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {tCommon("actions.retry")}
        </button>
      </div>
    )
  }

  // Loading state (only show skeleton on first load)
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
        filterValue={filterQuery}
        onFilterChange={handleFilterChange}
        isSearching={isSearching}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        totalCount={data?.pagination?.total || 0}
        totalPages={data?.pagination?.totalPages || 1}
        onSelectionChange={handleSelectionChange}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onBulkDelete={targetId ? () => setBulkDeleteDialogOpen(true) : undefined}
        onBulkAdd={targetId ? () => setBulkAddDialogOpen(true) : undefined}
      />

      {/* Bulk add dialog */}
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

      {/* Bulk delete confirmation dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={tConfirm("deleteTitle")}
        description={tCommon("actions.deleteConfirmMessage", { count: selectedEndpoints.length })}
        onConfirm={handleBulkDelete}
        loading={isDeleting}
        variant="destructive"
      />

      {/* Single delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("deleteMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEndpoint.isPending}
            >
              {deleteEndpoint.isPending ? (
                <>
                  <LoadingSpinner />
                  {tCommon("status.loading")}
                </>
              ) : (
                tCommon("actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
