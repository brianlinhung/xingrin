"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入表格相关类型和组件
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// 导入图标组件
import { MoreHorizontal, Play, Calendar, Edit, Trash2, Eye } from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
// 导入 Next.js Link 组件
import Link from "next/link"

// 导入类型定义
import type { Organization } from "@/types/organization.types"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string      // 日期格式化函数
  navigate: (path: string) => void                // 导航函数
  handleEdit: (org: Organization) => void         // 编辑处理函数
  handleDelete: (org: Organization) => void       // 删除处理函数
  handleInitiateScan: (org: Organization) => void // 发起扫描处理函数
  handleScheduleScan: (org: Organization) => void // 计划扫描处理函数
}

/**
 * 组织行操作组件
 * 提供计划扫描、编辑、删除等操作
 */
function OrganizationRowActions({ 
  onScheduleScan,
  onEdit, 
  onDelete 
}: {
  onScheduleScan: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onScheduleScan}>
          <Calendar />
          Schedule Scan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Edit />
          Edit Organization
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 创建组织表格列定义
 * 
 * @param formatDate - 日期格式化函数
 * @param navigate - 页面导航函数
 * @param handleEdit - 编辑处理函数
 * @param handleDelete - 删除处理函数
 * @returns 表格列定义数组
 */
export const createOrganizationColumns = ({
  formatDate,
  navigate,
  handleEdit,
  handleDelete,
  handleInitiateScan,
  handleScheduleScan,
}: CreateColumnsProps): ColumnDef<Organization>[] => [
  // 选择列 - 支持单选和全选
  {
    id: "select",
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableResizing: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,  // 禁用排序
    enableHiding: false,   // 禁用隐藏
  },
  
  // 组织名称列
  {
    accessorKey: "name",
    size: 200,
    minSize: 150,
    meta: { title: "Organization" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => {
      const organization = row.original
      return (
        <div className="flex-1 min-w-0">
          <Link 
            href={`/organization/${organization.id}`}
            className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 transition-colors break-all leading-relaxed whitespace-normal"
          >
            {row.getValue("name")}
          </Link>
        </div>
      )
    },
  },
  
  // 组织描述列
  {
    accessorKey: "description",
    size: 300,
    minSize: 200,
    meta: { title: "Description" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <ExpandableCell value={row.getValue("description")} variant="muted" />
    ),
  },
  
  // Total Targets 列
  {
    accessorKey: "targetCount",
    size: 120,
    minSize: 80,
    meta: { title: "Total Targets" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Targets" />
    ),
    cell: ({ row }) => {
      const targetCount = row.original.targetCount ?? 0
      return (
        <div className="text-sm">
          <Badge variant="secondary" className="text-xs">
            {targetCount}
          </Badge>
        </div>
      )
    },
  },

  // Added 列（创建时间）
  {
    accessorKey: "createdAt",
    size: 150,
    minSize: 120,
    meta: { title: "Added" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Added" />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string | undefined
      // 检查是否为零值时间
      const isZeroTime = createdAt && (
        createdAt === "0001-01-01T00:00:00Z" ||
        createdAt.startsWith("0001-01-01")
      )

      return (
        <div className="text-sm text-muted-foreground">
          {createdAt && !isZeroTime ? formatDate(createdAt) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
  },
  
  // 操作列
  {
    id: "actions",
    size: 120,
    minSize: 120,
    maxSize: 120,
    enableResizing: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        {/* Target Summary 按钮 */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate(`/organization/${row.original.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Target Summary</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Initiate Scan 按钮 */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleInitiateScan(row.original)}
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Initiate Scan</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 更多操作菜单 */}
        <OrganizationRowActions
          onScheduleScan={() => handleScheduleScan(row.original)}
          onEdit={() => handleEdit(row.original)}
          onDelete={() => handleDelete(row.original)}
        />
      </div>
    ),
    enableSorting: false,  // 禁用排序
    enableHiding: false,   // 禁用隐藏
  },
]
