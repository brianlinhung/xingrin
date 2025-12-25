"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconTrash,
  IconDownload,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SmartFilterInput, PREDEFINED_FIELDS, type FilterField } from "@/components/common/smart-filter-input"

import type { Vulnerability } from "@/types/vulnerability.types"
import type { PaginationInfo } from "@/types/common.types"

// 漏洞页面的过滤字段
const VULNERABILITY_FILTER_FIELDS: FilterField[] = [
  { key: "type", label: "Type", description: "Vulnerability type" },
  PREDEFINED_FIELDS.severity,
  { key: "source", label: "Source", description: "Scanner source" },
  PREDEFINED_FIELDS.url,
]

// 漏洞页面的示例
const VULNERABILITY_FILTER_EXAMPLES = [
  'type="xss" || type="sqli"',
  'severity="critical" || severity="high"',
  'source="nuclei" && severity="high"',
  'type="xss" && url="/api/*"',
]

interface VulnerabilitiesDataTableProps {
  data: Vulnerability[]
  columns: ColumnDef<Vulnerability>[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Vulnerability[]) => void
  onDownloadAll?: () => void
  onDownloadSelected?: () => void
  hideToolbar?: boolean
}

export function VulnerabilitiesDataTable({
  data = [],
  columns,
  filterValue,
  onFilterChange,
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
  onDownloadAll,
  onDownloadSelected,
  hideToolbar = false,
}: VulnerabilitiesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const [internalPagination, setInternalPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const useServerPagination = !!paginationInfo && !!pagination && !!setPagination
  const tablePagination = useServerPagination ? pagination : internalPagination
  const setTablePagination = useServerPagination ? setPagination : setInternalPagination

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      columnSizing,
      pagination: tablePagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(tablePagination) : updater
      setTablePagination?.(nextPagination as { pageIndex: number; pageSize: number })
      onPaginationChange?.(nextPagination)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: useServerPagination,
    pageCount: useServerPagination
      ? paginationInfo?.totalPages ?? -1
      : Math.ceil(data.length / tablePagination.pageSize) || 1,
  })

  const totalItems = useServerPagination
    ? paginationInfo?.total ?? data.length
    : table.getFilteredRowModel().rows.length

  // 处理选中行变化
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, onSelectionChange, table])

  // 处理智能过滤搜索
  const handleFilterSearch = (_filters: any[], rawQuery: string) => {
    onFilterChange?.(rawQuery)
  }

  return (
    <div className="w-full space-y-4">
      {/* 工具栏 */}
      {!hideToolbar && (
        <div className="flex items-center justify-between">
          {/* 智能过滤输入框 */}
          <SmartFilterInput
            fields={VULNERABILITY_FILTER_FIELDS}
            examples={VULNERABILITY_FILTER_EXAMPLES}
            value={filterValue}
            onSearch={handleFilterSearch}
            className="flex-1 max-w-xl"
          />

          {/* 右侧操作按钮 */}
          <div className="flex items-center space-x-2">
            {/* 列显示控制 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                  Columns
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "select" && "Select"}
                      {column.id === "title" && "Title"}
                      {column.id === "severity" && "Severity"}
                      {column.id === "status" && "Status"}
                      {column.id === "url" && "URL"}
                      {column.id === "createdAt" && "Created At"}
                      {column.id === "actions" && "Actions"}
                      {!["select", "title", "severity", "status", "url", "createdAt", "actions"].includes(column.id) && column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 下载按钮 */}
            {(onDownloadAll || onDownloadSelected) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <IconDownload />
                    Download
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Download Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {onDownloadAll && (
                    <DropdownMenuItem onClick={onDownloadAll}>
                      <IconDownload className="h-4 w-4" />
                      Download All Vulnerabilities
                    </DropdownMenuItem>
                  )}
                  {onDownloadSelected && (
                    <DropdownMenuItem 
                      onClick={onDownloadSelected}
                      disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                    >
                      <IconDownload className="h-4 w-4" />
                      Download Selected Vulnerabilities
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* 批量删除按钮 */}
            {onBulkDelete && (
              <Button 
                onClick={onBulkDelete}
                size="sm"
                variant="outline"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                className={
                  table.getFilteredSelectedRowModel().rows.length === 0
                    ? "text-muted-foreground"
                    : "text-destructive hover:text-destructive hover:bg-destructive/10"
                }
              >
                <IconTrash />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table style={{ minWidth: table.getCenterTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="relative group"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          className="absolute -right-2.5 top-0 h-full w-8 cursor-col-resize select-none touch-none bg-transparent flex justify-center"
                        >
                          <div className="w-1.5 h-full bg-transparent group-hover:bg-border" />
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控制 */}
      <div className="flex items-center justify-between px-2">
        {/* 选中行信息 */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {paginationInfo ? paginationInfo.total : table.getFilteredRowModel().rows.length} row(s) selected
        </div>

        {/* 分页控制器 */}
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* 每页显示数量选择 */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[90px]" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100, 200, 500, 1000].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 页码信息 */}
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>

          {/* 分页按钮 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
