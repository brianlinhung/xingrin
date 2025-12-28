"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { WebSite } from "@/types/website.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// 网站页面的过滤字段配置
const WEBSITE_FILTER_FIELDS: FilterField[] = [
  { key: "url", label: "URL", description: "Full URL" },
  { key: "host", label: "Host", description: "Hostname" },
  { key: "title", label: "Title", description: "Page title" },
  { key: "status", label: "Status", description: "HTTP status code" },
]

// 网站页面的示例
const WEBSITE_FILTER_EXAMPLES = [
  'host="api.example.com" && status="200"',
  'title="Login" || title="Admin"',
  'url="/api/*" && status!="404"',
]

interface WebSitesDataTableProps {
  data: WebSite[]
  columns: ColumnDef<WebSite>[]
  // 智能过滤
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: WebSite[]) => void
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  onBulkAdd?: () => void
}

export function WebSitesDataTable({
  data = [],
  columns,
  filterValue,
  onFilterChange,
  isSearching = false,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
  onBulkAdd,
}: WebSitesDataTableProps) {
  // 处理智能过滤搜索
  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  // 下载选项
  const downloadOptions: DownloadOption[] = []
  if (onDownloadAll) {
    downloadOptions.push({
      key: "all",
      label: "Download All Websites",
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: "Download Selected Websites",
      onClick: onDownloadSelected,
      disabled: (count) => count === 0,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // 智能过滤
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      isSearching={isSearching}
      filterFields={WEBSITE_FILTER_FIELDS}
      filterExamples={WEBSITE_FILTER_EXAMPLES}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      showAddButton={false}
      // 批量添加按钮
      onBulkAdd={onBulkAdd}
      bulkAddLabel="批量添加"
      // 下载
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // 空状态
      emptyMessage="暂无数据"
    />
  )
}
