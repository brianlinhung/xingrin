"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Command } from "@/types/command.types"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Trash2, Copy } from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"


/**
 * 命令表格列定义
 */
export const commandColumns: ColumnDef<Command>[] = [
  // 选择列
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
    enableSorting: false,
    enableHiding: false,
  },
  
  // 名称列
  {
    accessorKey: "displayName",
    size: 200,
    minSize: 150,
    meta: { title: "Name" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const displayName = row.getValue("displayName") as string
      const name = row.original.name
      return (
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium break-all leading-relaxed whitespace-normal">
            {displayName || name}
          </span>
          {displayName && name && displayName !== name && (
            <span className="text-xs text-muted-foreground font-mono break-all leading-relaxed whitespace-normal">
              {name}
            </span>
          )}
        </div>
      )
    },
  },
  
  // 所属工具列
  {
    accessorKey: "tool",
    size: 120,
    minSize: 80,
    meta: { title: "Tool" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tool" />
    ),
    cell: ({ row }) => {
      const tool = row.original.tool
      return (
        <div className="flex items-center gap-2">
          {tool ? (
            <Badge variant="outline">{tool.name}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      )
    },
  },
  
  // 命令模板列
  {
    accessorKey: "commandTemplate",
    size: 350,
    minSize: 250,
    meta: { title: "Command Template" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Command Template" />
    ),
    cell: ({ row }) => (
      <ExpandableCell value={row.getValue("commandTemplate")} variant="mono" />
    ),
  },
  
  // 描述列
  {
    accessorKey: "description",
    size: 250,
    minSize: 150,
    meta: { title: "Description" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <ExpandableCell value={row.getValue("description")} variant="muted" />
    ),
  },
  
  // 更新时间列
  {
    accessorKey: "updatedAt",
    size: 150,
    minSize: 120,
    meta: { title: "Updated At" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("updatedAt"))}
      </div>
    ),
  },
  
  // 操作列
  {
    id: "actions",
    size: 60,
    minSize: 60,
    maxSize: 60,
    enableResizing: false,
    cell: ({ row }) => {
      const command = row.original

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
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(command.commandTemplate)
                  toast.success('已复制命令模板')
                } catch {
                  toast.error('复制失败')
                }
              }}
            >
              <Copy />
              复制命令模板
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
