"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { Directory } from "@/types/directory.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// 目录页面的过滤字段配置
const DIRECTORY_FILTER_FIELDS: FilterField[] = [
  { key: "url", label: "URL", description: "Directory URL" },
  { key: "status", label: "Status", description: "HTTP status code" },
]

// 目录页面的示例
const DIRECTORY_FILTER_EXAMPLES = [
  'url="/admin" && status="200"',
  'url="/api/*" || url="/config/*"',
  'status="200" && url!="/index.html"',
]

interface DirectoriesDataTableProps {
  data: Directory[]
  columns: ColumnDef<Directory>[]
  // 智能过滤
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Directory[]) => void
  // 下载回调函数
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  onBulkAdd?: () => void
}

export function DirectoriesDataTable({
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
}: DirectoriesDataTableProps) {
  const [selectedRows, setSelectedRows] = React.useState<Directory[]>([])

  // 处理智能过滤搜索
  const handleSmartSearch = (rawQuery: string) => {
    if (onFilterChange) {
      onFilterChange(rawQuery)
    }
  }

  // 处理选中行变化
  const handleSelectionChange = (rows: Directory[]) => {
    setSelectedRows(rows)
    onSelectionChange?.(rows)
  }

  // 下载选项
  const downloadOptions: DownloadOption[] = []
  if (onDownloadAll) {
    downloadOptions.push({
      key: "all",
      label: "Download All Directories",
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: "Download Selected Directories",
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
      filterFields={DIRECTORY_FILTER_FIELDS}
      filterExamples={DIRECTORY_FILTER_EXAMPLES}
      // 选择
      onSelectionChange={handleSelectionChange}
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
