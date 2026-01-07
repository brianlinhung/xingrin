"use client"

import React, { useCallback, useMemo, useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { WebSitesDataTable } from "./websites-data-table"
import { createWebSiteColumns } from "./websites-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetWebSites, useScanWebSites } from "@/hooks/use-websites"
import { useTarget } from "@/hooks/use-targets"
import { WebsiteService } from "@/services/website.service"
import { BulkAddUrlsDialog } from "@/components/common/bulk-add-urls-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getDateLocale } from "@/lib/date-utils"
import type { TargetType } from "@/lib/url-validator"
import type { WebSite } from "@/types/website.types"
import { toast } from "sonner"

export function WebSitesView({
  targetId,
  scanId,
}: {
  targetId?: number
  scanId?: number
}) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedWebSites, setSelectedWebSites] = useState<WebSite[]>([])
  const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [filterQuery, setFilterQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tToast = useTranslations("toast")
  const tStatus = useTranslations("common.status")
  const locale = useLocale()

  // Build translation object
  const translations = useMemo(() => ({
    columns: {
      url: tColumns("common.url"),
      host: tColumns("website.host"),
      title: tColumns("endpoint.title"),
      status: tColumns("common.status"),
      technologies: tColumns("endpoint.technologies"),
      contentLength: tColumns("endpoint.contentLength"),
      location: tColumns("endpoint.location"),
      webServer: tColumns("endpoint.webServer"),
      contentType: tColumns("endpoint.contentType"),
      responseBody: tColumns("endpoint.responseBody"),
      vhost: tColumns("endpoint.vhost"),
      responseHeaders: tColumns("website.responseHeaders"),
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

  const targetQuery = useTargetWebSites(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      filter: filterQuery || undefined,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanWebSites(
    scanId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      filter: filterQuery || undefined,
    },
    { enabled: !!scanId }
  )

  const activeQuery = targetId ? targetQuery : scanQuery
  const { data, isLoading, isFetching, error, refetch } = activeQuery

  // Reset search state when request completes
  useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString(getDateLocale(locale), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [locale])

  const columns = useMemo(
    () =>
      createWebSiteColumns({
        formatDate,
        t: translations,
      }),
    [formatDate, translations]
  )

  const websites: WebSite[] = useMemo(() => {
    if (!data?.results) return []
    return data.results
  }, [data])

  const paginationInfo = data
    ? {
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
    }
    : undefined

  const handleSelectionChange = useCallback((selectedRows: WebSite[]) => {
    setSelectedWebSites(selectedRows)
  }, [])

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
  const generateCSV = (items: WebSite[]): string => {
    const BOM = '\ufeff'
    const headers = [
      'url', 'host', 'location', 'title', 'status_code',
      'content_length', 'content_type', 'webserver', 'tech',
      'response_body', 'vhost', 'created_at'
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
      escapeCSV(formatDateForCSV(item.createdAt))
    ].join(','))
    
    return BOM + [headers.join(','), ...rows].join('\n')
  }

  // Handle download all websites
  const handleDownloadAll = async () => {
    try {
      let blob: Blob | null = null

      if (scanId) {
        const data = await WebsiteService.exportWebsitesByScanId(scanId)
        blob = data
      } else if (targetId) {
        const data = await WebsiteService.exportWebsitesByTargetId(targetId)
        blob = data
      } else {
        if (!websites || websites.length === 0) {
          return
        }
        const csvContent = generateCSV(websites)
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      }

      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "websites"
      a.href = url
      a.download = `${prefix}-websites-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download website list", error)
      toast.error(tToast("downloadFailed"))
    }
  }

  // Handle download selected websites
  const handleDownloadSelected = () => {
    if (selectedWebSites.length === 0) {
      return
    }
    const csvContent = generateCSV(selectedWebSites)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "websites"
    a.href = url
    a.download = `${prefix}-websites-selected-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedWebSites.length === 0) return
    
    setIsDeleting(true)
    try {
      const ids = selectedWebSites.map(w => w.id)
      const result = await WebsiteService.bulkDelete(ids)
      toast.success(tToast("deleteSuccess", { count: result.deletedCount }))
      setSelectedWebSites([])
      setDeleteDialogOpen(false)
      refetch()
    } catch (error) {
      console.error("Failed to delete websites", error)
      toast.error(tToast("deleteFailed"))
    } finally {
      setIsDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tStatus("error")}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {tStatus("error")}
        </p>
        <Button onClick={() => refetch()}>{tCommon("actions.retry")}</Button>
      </div>
    )
  }

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
      <WebSitesDataTable
        data={websites}
        columns={columns}
        filterValue={filterQuery}
        onFilterChange={handleFilterChange}
        isSearching={isSearching}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={setPagination}
        onSelectionChange={handleSelectionChange}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onBulkDelete={targetId ? () => setDeleteDialogOpen(true) : undefined}
        onBulkAdd={targetId ? () => setBulkAddDialogOpen(true) : undefined}
      />

      {/* Bulk add dialog */}
      {targetId && (
        <BulkAddUrlsDialog
          targetId={targetId}
          assetType="website"
          targetName={target?.name}
          targetType={target?.type as TargetType}
          open={bulkAddDialogOpen}
          onOpenChange={setBulkAddDialogOpen}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={tCommon("actions.confirmDelete")}
        description={tCommon("actions.deleteConfirmMessage", { count: selectedWebSites.length })}
        onConfirm={handleBulkDelete}
        loading={isDeleting}
        variant="destructive"
      />
    </>
  )
}
