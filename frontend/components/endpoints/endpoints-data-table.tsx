"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { DownloadOption, PaginationState } from "@/types/data-table.types"
import type { PaginationInfo } from "@/types/common.types"

// 端点页面的过滤字段配置
const ENDPOINT_FILTER_FIELDS: FilterField[] = [
  { key: "url", label: "URL", description: "Endpoint URL" },
  { key: "host", label: "Host", description: "Hostname" },
  { key: "title", label: "Title", description: "Page title" },
  { key: "status", label: "Status", description: "HTTP status code" },
]

// 端点页面的示例
const ENDPOINT_FILTER_EXAMPLES = [
  'url="/api/*" && status="200"',
  'host="api.example.com" || host="admin.example.com"',
  'title="Dashboard" && status!="404"',
]

interface EndpointsDataTableProps<TData extends { id: number | string }, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  // 智能过滤
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  onAddNew?: () => void
  addButtonText?: string
  onSelectionChange?: (selectedRows: TData[]) => void
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  totalCount?: number
  totalPages?: number
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  onBulkAdd?: () => void
}

export function EndpointsDataTable<TData extends { id: number | string }, TValue>({
  columns,
  data,
  filterValue,
  onFilterChange,
  isSearching = false,
  onAddNew,
  addButtonText = "Add",
  onSelectionChange,
  pagination: externalPagination,
  onPaginationChange,
  totalCount,
  totalPages,
  onDownloadAll,
  onDownloadSelected,
  onBulkAdd,
}: EndpointsDataTableProps<TData, TValue>) {
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const pagination = externalPagination || internalPagination

  // 处理智能过滤搜索
  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: PaginationState) => {
    if (onPaginationChange) {
      onPaginationChange(newPagination)
    } else {
      setInternalPagination(newPagination)
    }
  }

  // 构建 paginationInfo
  const paginationInfo: PaginationInfo | undefined = externalPagination && totalCount ? {
    total: totalCount,
    totalPages: totalPages || Math.ceil(totalCount / pagination.pageSize),
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  } : undefined

  // 下载选项
  const downloadOptions: DownloadOption[] = []
  if (onDownloadAll) {
    downloadOptions.push({
      key: "all",
      label: "Download All Endpoints",
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: "Download Selected Endpoints",
      onClick: onDownloadSelected,
      disabled: (count) => count === 0,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns as ColumnDef<TData>[]}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={pagination}
      setPagination={onPaginationChange ? undefined : setInternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={handlePaginationChange}
      // 智能过滤
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      isSearching={isSearching}
      filterFields={ENDPOINT_FILTER_FIELDS}
      filterExamples={ENDPOINT_FILTER_EXAMPLES}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      showBulkDelete={false}
      onAddNew={onAddNew}
      addButtonLabel={addButtonText}
      // 批量添加按钮
      onBulkAdd={onBulkAdd}
      bulkAddLabel="批量添加"
      // 下载
      downloadOptions={downloadOptions.length > 0 ? downloadOptions : undefined}
      // 空状态
      emptyMessage="No results"
    />
  )
}
