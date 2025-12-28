import type { ColumnDef, SortingState, VisibilityState, Table, Header, Column, RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"

/**
 * 扩展 TanStack Table 的 ColumnMeta 类型
 * 用于存储列的元数据，如标题
 */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** 列标题，用于列头和列显示控制 */
    title?: string
  }
}

/**
 * 分页状态
 */
export interface PaginationState {
  pageIndex: number
  pageSize: number
}

/**
 * 服务端分页信息
 */
export interface PaginationInfo {
  total: number
  totalPages: number
  page: number
  pageSize: number
}

/**
 * 过滤字段定义
 * 注意：description 是必填的，与 SmartFilterInput 组件保持一致
 */
export interface FilterField {
  key: string
  label: string
  description: string
}

/**
 * 下载选项
 */
export interface DownloadOption {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean | ((selectedCount: number) => boolean)
}

/**
 * 删除确认对话框配置
 */
export interface DeleteConfirmationConfig {
  title?: string
  description?: string | ((count: number) => string)
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * 统一数据表格组件属性
 */
export interface UnifiedDataTableProps<TData> {
  // 核心数据
  data: TData[]
  columns: ColumnDef<TData, any>[]
  getRowId?: (row: TData) => string
  
  // 分页
  pagination?: PaginationState
  setPagination?: React.Dispatch<React.SetStateAction<PaginationState>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: PaginationState) => void
  hidePagination?: boolean
  pageSizeOptions?: number[]
  
  // 工具栏
  hideToolbar?: boolean
  toolbarLeft?: ReactNode
  toolbarRight?: ReactNode
  
  // 搜索/过滤
  searchMode?: 'simple' | 'smart'
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  filterFields?: FilterField[]
  filterExamples?: string[]
  
  // 选择
  enableRowSelection?: boolean
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (selection: Record<string, boolean>) => void
  onSelectionChange?: (selectedRows: TData[]) => void
  
  // 批量操作
  onBulkDelete?: () => void
  bulkDeleteLabel?: string
  showBulkDelete?: boolean
  
  // 添加操作
  onAddNew?: () => void
  onAddHover?: () => void
  addButtonLabel?: string
  showAddButton?: boolean
  
  // 批量添加操作
  onBulkAdd?: () => void
  bulkAddLabel?: string
  showBulkAdd?: boolean
  
  // 下载操作
  downloadOptions?: DownloadOption[]
  
  // 列控制
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  
  // 排序
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  defaultSorting?: SortingState
  
  // 空状态
  emptyMessage?: string
  emptyComponent?: ReactNode
  
  // 确认对话框
  deleteConfirmation?: DeleteConfirmationConfig
  
  // 样式
  className?: string
  tableClassName?: string
}

/**
 * 工具栏组件属性
 */
export interface DataTableToolbarProps {
  // 搜索
  searchMode?: 'simple' | 'smart'
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  isSearching?: boolean
  filterFields?: FilterField[]
  filterExamples?: string[]
  
  // 左侧自定义内容
  leftContent?: ReactNode
  
  // 右侧操作
  children?: ReactNode
  
  // 样式
  className?: string
}

/**
 * 分页组件属性
 */
export interface DataTablePaginationProps<TData> {
  table: Table<TData>
  paginationInfo?: PaginationInfo
  pageSizeOptions?: number[]
  onPaginationChange?: (pagination: PaginationState) => void
  className?: string
}

/**
 * 列头组件属性
 */
export interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

/**
 * 列宽调整组件属性
 */
export interface ColumnResizerProps<TData> {
  header: Header<TData, unknown>
  className?: string
}
