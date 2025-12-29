"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { ScheduledScanDataTable } from "@/components/scan/scheduled/scheduled-scan-data-table"
import { createScheduledScanColumns } from "@/components/scan/scheduled/scheduled-scan-columns"
import { useScheduledScans } from "@/hooks/use-scheduled-scans"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { getDateLocale } from "@/lib/date-utils"

export function DashboardScheduledScans() {
  const [pagination, setPagination] = React.useState({ page: 1, pageSize: 10 })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const router = useRouter()
  const locale = useLocale()

  // Internationalization
  const tColumns = React.useMemo(() => useTranslations("columns"), [])
  const tCommon = React.useMemo(() => useTranslations("common"), [])
  const tScan = React.useMemo(() => useTranslations("scan"), [])

  // Build translation object
  const translations = React.useMemo(() => ({
    columns: {
      taskName: tColumns("scheduledScan.taskName"),
      scanEngine: tColumns("scheduledScan.scanEngine"),
      cronExpression: tColumns("scheduledScan.cronExpression"),
      scope: tColumns("scheduledScan.scope"),
      status: tColumns("common.status"),
      nextRun: tColumns("scheduledScan.nextRun"),
      runCount: tColumns("scheduledScan.runCount"),
      lastRun: tColumns("scheduledScan.lastRun"),
    },
    actions: {
      editTask: tScan("editTask"),
      delete: tCommon("actions.delete"),
      openMenu: tCommon("actions.openMenu"),
    },
    status: {
      enabled: tCommon("status.enabled"),
      disabled: tCommon("status.disabled"),
    },
    cron: {
      everyMinute: tScan("cron.everyMinute"),
      everyNMinutes: tScan("cron.everyNMinutes"),
      everyHour: tScan("cron.everyHour"),
      everyNHours: tScan("cron.everyNHours"),
      everyDay: tScan("cron.everyDay"),
      everyWeek: tScan("cron.everyWeek"),
      everyMonth: tScan("cron.everyMonth"),
      weekdays: tScan.raw("cron.weekdays") as string[],
    },
  }), [tColumns, tCommon, tScan])

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const { data, isLoading, isFetching } = useScheduledScans({
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: searchQuery || undefined,
  })

  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString(getDateLocale(locale), { hour12: false })
  const handleEdit = () => router.push(`/scan/scheduled/`)
  const handleDelete = () => {}
  const handleToggleStatus = () => {}

  const columns = React.useMemo(
    () =>
      createScheduledScanColumns({
        formatDate,
        handleEdit,
        handleDelete,
        handleToggleStatus,
        t: translations,
      }),
    [formatDate, handleEdit, translations]
  )

  if (isLoading && !data) {
    return (
      <DataTableSkeleton
        withPadding={false}
        toolbarButtonCount={2}
        rows={4}
        columns={3}
      />
    )
  }

  const list = data?.results ?? []

  return (
    <ScheduledScanDataTable
      data={list}
      columns={columns}
      searchPlaceholder={tScan("scheduled.searchPlaceholder")}
      searchValue={searchQuery}
      onSearch={handleSearchChange}
      isSearching={isSearching}
      page={pagination.page}
      pageSize={pagination.pageSize}
      total={data?.total || 0}
      totalPages={data?.totalPages || 1}
      onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
      onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
    />
  )
}
