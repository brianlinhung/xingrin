"use client"

import React, { useCallback, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { IPAddressesDataTable } from "./ip-addresses-data-table"
import { createIPAddressColumns } from "./ip-addresses-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetIPAddresses, useScanIPAddresses } from "@/hooks/use-ip-addresses"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getDateLocale } from "@/lib/date-utils"
import type { IPAddress } from "@/types/ip-address.types"
import { IPAddressService } from "@/services/ip-address.service"
import { toast } from "sonner"

export function IPAddressesView({
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
  const [selectedIPAddresses, setSelectedIPAddresses] = useState<IPAddress[]>([])
  const [filterQuery, setFilterQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tTooltips = useTranslations("tooltips")
  const tToast = useTranslations("toast")
  const tStatus = useTranslations("common.status")
  const locale = useLocale()

  // Build translation object
  const translations = useMemo(() => ({
    columns: {
      ipAddress: tColumns("ipAddress.ipAddress"),
      hosts: tColumns("ipAddress.hosts"),
      createdAt: tColumns("common.createdAt"),
      openPorts: tColumns("ipAddress.openPorts"),
    },
    actions: {
      selectAll: tCommon("actions.selectAll"),
      selectRow: tCommon("actions.selectRow"),
    },
    tooltips: {
      allHosts: tTooltips("allHosts"),
      allOpenPorts: tTooltips("allOpenPorts"),
    },
  }), [tColumns, tCommon, tTooltips])

  const handleFilterChange = (value: string) => {
    setFilterQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const targetQuery = useTargetIPAddresses(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      filter: filterQuery || undefined,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanIPAddresses(
    scanId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      filter: filterQuery || undefined,
    },
    { enabled: !!scanId }
  )

  const activeQuery = targetId ? targetQuery : scanQuery
  const { data, isLoading, error, refetch } = activeQuery

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
      createIPAddressColumns({
        formatDate,
        t: translations,
      }),
    [formatDate, translations]
  )

  const ipAddresses: IPAddress[] = useMemo(() => {
    return data?.results ?? []
  }, [data])

  const paginationInfo = data
    ? {
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
    }
    : undefined
  const handleSelectionChange = useCallback((selectedRows: IPAddress[]) => {
    setSelectedIPAddresses(selectedRows)
  }, [])

  // Handle download all IP addresses
  const handleDownloadAll = async () => {
    try {
      let blob: Blob | null = null

      if (scanId) {
        blob = await IPAddressService.exportIPAddressesByScanId(scanId)
      } else if (targetId) {
        blob = await IPAddressService.exportIPAddressesByTargetId(targetId)
      } else {
        if (!ipAddresses || ipAddresses.length === 0) {
          return
        }
        // Frontend CSV generation (fallback when no scanId/targetId)
        const csvContent = generateCSV(ipAddresses)
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      }

      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "ip-addresses"
      a.href = url
      a.download = `${prefix}-ip-addresses-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download IP address list", error)
      toast.error(tToast("downloadFailed"))
    }
  }

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

  // Generate CSV content (original format: one row per host+port combination)
  const generateCSV = (items: IPAddress[]): string => {
    const BOM = '\ufeff'
    const headers = ['ip', 'host', 'port', 'created_at']
    
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }
    
    // Expand aggregated data to original format: one row per (ip, host, port) combination
    const rows: string[] = []
    for (const item of items) {
      for (const host of item.hosts) {
        for (const port of item.ports) {
          rows.push([
            escapeCSV(item.ip),
            escapeCSV(host),
            escapeCSV(String(port)),
            escapeCSV(formatDateForCSV(item.createdAt))
          ].join(','))
        }
      }
    }
    
    return BOM + [headers.join(','), ...rows].join('\n')
  }

  // Handle download selected IP addresses
  const handleDownloadSelected = () => {
    if (selectedIPAddresses.length === 0) {
      return
    }
    
    const csvContent = generateCSV(selectedIPAddresses)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "ip-addresses"
    a.href = url
    a.download = `${prefix}-ip-addresses-selected-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIPAddresses.length === 0) return
    
    setIsDeleting(true)
    try {
      // IP addresses are aggregated, pass IP strings instead of IDs
      const ips = selectedIPAddresses.map(ip => ip.ip)
      const result = await IPAddressService.bulkDelete(ips)
      toast.success(tToast("deleteSuccess", { count: result.deletedCount }))
      setSelectedIPAddresses([])
      setDeleteDialogOpen(false)
      refetch()
    } catch (error) {
      console.error("Failed to delete IP addresses", error)
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
          {error.message || tStatus("error")}
        </p>
        <Button onClick={() => refetch()}>{tCommon("actions.retry")}</Button>
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={1}
        rows={6}
        columns={4}
      />
    )
  }

  return (
    <>
      <IPAddressesDataTable
        data={ipAddresses}
        columns={columns}
        filterValue={filterQuery}
        onFilterChange={handleFilterChange}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onSelectionChange={handleSelectionChange}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onBulkDelete={targetId ? () => setDeleteDialogOpen(true) : undefined}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={tCommon("actions.confirmDelete")}
        description={tCommon("actions.deleteConfirmMessage", { count: selectedIPAddresses.length })}
        onConfirm={handleBulkDelete}
        loading={isDeleting}
        variant="destructive"
      />
    </>
  )
}
