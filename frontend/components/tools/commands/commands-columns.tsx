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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MoreHorizontal, Eye, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { CopyablePopoverContent } from "@/components/ui/copyable-popover-content"

/**
 * 数据表格列头组件
 */
function DataTableColumnHeader({
  column,
  title,
}: {
  column: { getCanSort: () => boolean; getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }
  title: string
}) {
  if (!column.getCanSort()) {
    return <div className="-ml-3 font-medium">{title}</div>
  }

  const isSorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8 data-[state=open]:bg-accent hover:bg-muted"
    >
      {title}
      {isSorted === "asc" ? (
        <ChevronUp />
      ) : isSorted === "desc" ? (
        <ChevronDown />
      ) : (
        <ChevronsUpDown />
      )}
    </Button>
  )
}

/**
 * 命令表格列定义
 */
export const commandColumns: ColumnDef<Command>[] = [
  // 选择列
  {
    id: "select",
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="名称" />
    ),
    cell: ({ row }) => {
      const displayName = row.getValue("displayName") as string
      const name = row.original.name
      return (
        <div className="flex flex-col max-w-[200px]">
          <TooltipProvider delayDuration={500} skipDelayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium truncate cursor-default">{displayName || name}</span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{displayName || name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {displayName && name && name.length > 20 && (
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={name} className="font-mono" />
              </PopoverContent>
            </Popover>
          )}
          {displayName && name && name.length <= 20 && (
            <span className="text-xs text-muted-foreground font-mono">{name}</span>
          )}
        </div>
      )
    },
  },
  
  // 所属工具列
  {
    accessorKey: "tool",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="所属工具" />
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="命令模板" />
    ),
    cell: ({ row }) => {
      const template = row.getValue("commandTemplate") as string
      if (!template) return <span className="text-muted-foreground text-sm">-</span>
      
      const maxLength = 60
      const isLong = template.length > maxLength
      const displayText = isLong ? template.substring(0, maxLength) + "..." : template

      return (
        <div className="flex items-center gap-1 max-w-[500px]">
          <span className="text-sm font-mono truncate">
            {displayText}
          </span>
          {isLong && (
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={template} className="font-mono text-xs" />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    },
  },
  
  // 描述列
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="描述" />
    ),
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return (
        <TooltipProvider delayDuration={500} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[300px] truncate text-sm cursor-default">
                {description || "-"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              <p className="text-xs max-w-[400px]">{description || "暂无描述"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
  
  // 更新时间列
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="更新时间" />
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
