"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { FilterField } from "@/components/common/smart-filter-input"
import type { Subdomain } from "@/types/subdomain.types"
import type { PaginationInfo } from "@/types/common.types"
import type { DownloadOption } from "@/types/data-table.types"

// 子域名页面的过滤字段配置
const SUBDOMAIN_FILTER_FIELDS: FilterField[] = [
  { key: "name", label: "Name", description: "Subdomain name" },
]

// 子域名页面的示例
const SUBDOMAIN_FILTER_EXAMPLES = [
  'name="api.example.com"',
  'name="*.test.com"',
]

// 组件属性类型定义
interface SubdomainsDataTableProps {
  data: Subdomain[]
  columns: ColumnDef<Subdomain>[]
  onAddNew?: () => void
  onBulkAdd?: () => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Subdomain[]) => void
  // 智能过滤
  filterValue?: string
  onFilterChange?: (value: string) => void
  isSearching?: boolean
  addButtonText?: string
  // 下载回调函数
  onDownloadAll?: () => void
  onDownloadInteresting?: () => void
  onDownloadImportant?: () => void
  onDownloadSelected?: () => void
  // 服务端分页支持
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
}

/**
 * 子域名数据表格组件
 * 使用 UnifiedDataTable 统一组件
 */
export function SubdomainsDataTable({
  data = [],
  columns,
  onAddNew,
  onBulkAdd,
  onBulkDelete,
  onSelectionChange,
  filterValue,
  onFilterChange,
  isSearching = false,
  addButtonText = "Add",
  onDownloadAll,
  onDownloadImportant,
  onDownloadSelected,
  pagination: externalPagination,
  setPagination: setExternalPagination,
  paginationInfo,
  onPaginationChange,
}: SubdomainsDataTableProps) {
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
      label: "Download All Subdomains",
      onClick: onDownloadAll,
    })
  }
  if (onDownloadSelected) {
    downloadOptions.push({
      key: "selected",
      label: "Download Selected Subdomains",
      onClick: onDownloadSelected,
      disabled: (count) => count === 0,
    })
  }
  if (onDownloadImportant) {
    downloadOptions.push({
      key: "important",
      label: "Download Important Subdomains",
      onClick: onDownloadImportant,
    })
  }

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={externalPagination}
      setPagination={setExternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={onPaginationChange}
      // 智能过滤
      searchMode="smart"
      searchValue={filterValue}
      onSearch={handleSmartSearch}
      isSearching={isSearching}
      filterFields={SUBDOMAIN_FILTER_FIELDS}
      filterExamples={SUBDOMAIN_FILTER_EXAMPLES}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="Delete"
      // 添加按钮
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
