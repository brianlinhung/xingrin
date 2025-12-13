"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"


import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronsUpDown, ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react"

import type { Subdomain } from "@/types/subdomain.types"

import { CopyablePopoverContent } from "@/components/ui/copyable-popover-content"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
}

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
 * 创建目标域名表格列定义
 */
export const createSubdomainColumns = ({
  formatDate,
}: CreateColumnsProps): ColumnDef<Subdomain>[] => [
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

  // 子域名列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subdomain" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      if (!name) return <span className="text-muted-foreground text-sm">-</span>
      
      const maxLength = 40
      const isLong = name.length > maxLength
      const displayName = isLong ? name.substring(0, maxLength) + "..." : name

      return (
        <div className="flex items-center gap-1 max-w-[350px]">
          <span className="text-sm font-medium">
            {displayName}
          </span>
          {isLong && (
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={name} className="font-mono text-xs" />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    },
  },

  // 发现时间列
  {
    accessorKey: "discoveredAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="发现时间" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<string | undefined>()
      return value ? formatDate(value) : "-"
    },
  },

]
