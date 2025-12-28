"use client"

import * as React from "react"
import { IconSearch, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { Target } from "@/types/target.types"
import type { PaginationInfo } from "@/types/common.types"

interface TargetsDataTableProps {
  data: Target[]
  columns: ColumnDef<Target>[]
  onAddNew?: () => void
  onAddHover?: () => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Target[]) => void
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  addButtonText?: string
  // 分页相关属性
  pagination?: { pageIndex: number, pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number, pageSize: number }) => void
  totalCount?: number
  manualPagination?: boolean
}

/**
 * 目标数据表格组件 (target 版本)
 * 使用 UnifiedDataTable 统一组件
 */
export function TargetsDataTable({
  data = [],
  columns,
  onAddNew,
  onAddHover,
  onBulkDelete,
  onSelectionChange,
  searchPlaceholder = "搜索目标名称...",
  searchValue,
  onSearch,
  isSearching = false,
  addButtonText = "添加目标",
  pagination: externalPagination,
  onPaginationChange,
  totalCount,
  manualPagination = false,
}: TargetsDataTableProps) {
  // 内部分页状态
  const [internalPagination, setInternalPagination] = React.useState<{ pageIndex: number, pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  })

  // 本地搜索输入状态
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue ?? "")
  
  React.useEffect(() => {
    setLocalSearchValue(searchValue ?? "")
  }, [searchValue])

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(localSearchValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const pagination = externalPagination || internalPagination

  // 处理分页状态变化
  const handlePaginationChange = (newPagination: { pageIndex: number, pageSize: number }) => {
    if (onPaginationChange) {
      onPaginationChange(newPagination)
    } else {
      setInternalPagination(newPagination)
    }
  }

  // 构建 paginationInfo
  const paginationInfo: PaginationInfo | undefined = manualPagination && totalCount ? {
    total: totalCount,
    totalPages: Math.ceil(totalCount / pagination.pageSize),
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  } : undefined

  return (
    <UnifiedDataTable
      data={data}
      columns={columns}
      getRowId={(row) => String(row.id)}
      // 分页
      pagination={pagination}
      setPagination={onPaginationChange ? undefined : setInternalPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={handlePaginationChange}
      // 选择
      onSelectionChange={onSelectionChange}
      // 批量操作
      onBulkDelete={onBulkDelete}
      bulkDeleteLabel="删除"
      // 添加按钮
      onAddNew={onAddNew}
      onAddHover={onAddHover}
      addButtonLabel={addButtonText}
      showAddButton={!!onAddNew}
      // 空状态
      emptyMessage="暂无数据"
      // 自定义工具栏
      toolbarLeft={
        <div className="flex items-center space-x-2">
          <Input
            placeholder={searchPlaceholder}
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 max-w-sm"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit} disabled={isSearching}>
            {isSearching ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconSearch className="h-4 w-4" />
            )}
          </Button>
        </div>
      }
    />
  )
}
