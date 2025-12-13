"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconDots } from "@tabler/icons-react"
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import type { Directory } from "@/types/directory.types"
import { CopyablePopoverContent } from "@/components/ui/copyable-popover-content"

/**
 * HTTP 状态码徽章组件
 */
function StatusBadge({ status }: { status: number | null }) {
  if (!status) return <span className="text-muted-foreground">-</span>

  let variant: "default" | "secondary" | "destructive" | "outline" = "default"
  let className = ""

  if (status >= 200 && status < 300) {
    className = "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
  } else if (status >= 300 && status < 400) {
    className = "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
  } else if (status >= 400 && status < 500) {
    className = "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
  } else if (status >= 500) {
    className = "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
  }

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  )
}

/**
 * 格式化持续时间（纳秒转毫秒）
 */
function formatDuration(nanoseconds: number | null): string {
  if (nanoseconds === null) return "-"
  const milliseconds = nanoseconds / 1000000
  return `${milliseconds.toFixed(2)} ms`
}

/**
 * 创建目录表格列定义
 */
export function createDirectoryColumns({
  formatDate,
}: {
  formatDate: (date: string) => string
}): ColumnDef<Directory>[] {
  return [
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
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    // URL 列
    {
      accessorKey: "url",
      size: 300,
      minSize: 200,
      maxSize: 400,
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            URL
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const url = row.getValue("url") as string
        if (!url) return <span className="text-muted-foreground text-sm">-</span>
        
        const maxLength = 40
        const isLong = url.length > maxLength
        const displayUrl = isLong ? url.substring(0, maxLength) + "..." : url

        return (
          <div className="flex items-center gap-1 w-[280px] min-w-[280px]">
            <span className="text-sm font-mono truncate">
              {displayUrl}
            </span>
            {isLong && (
              <Popover>
                <PopoverTrigger asChild>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-3">
                  <CopyablePopoverContent value={url} className="font-mono text-xs" />
                </PopoverContent>
              </Popover>
            )}
          </div>
        )
      },
    },
    // Status 列
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Status
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    // Content Length 列
    {
      accessorKey: "contentLength",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Length
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const length = row.getValue("contentLength") as number | null
        return <span>{length !== null ? length.toLocaleString() : "-"}</span>
      },
    },
    // Words 列
    {
      accessorKey: "words",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Words
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const words = row.getValue("words") as number | null
        return <span>{words !== null ? words.toLocaleString() : "-"}</span>
      },
    },
    // Lines 列
    {
      accessorKey: "lines",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Lines
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const lines = row.getValue("lines") as number | null
        return <span>{lines !== null ? lines.toLocaleString() : "-"}</span>
      },
    },
    // Content Type 列
    {
      accessorKey: "contentType",
      header: "Content Type",
      cell: ({ row }) => {
        const contentType = row.getValue("contentType") as string
        return contentType ? (
          <Badge variant="outline">{contentType}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    // Duration 列
    {
      accessorKey: "duration",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Duration
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number | null
        return <span className="text-muted-foreground">{formatDuration(duration)}</span>
      },
    },
    // Discovered At 列
    {
      accessorKey: "discoveredAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Discovered At
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("discoveredAt") as string
        return <span className="text-muted-foreground">{formatDate(date)}</span>
      },
    },
    // 操作列
    {
      id: "actions",
      cell: ({ row }) => {
        const directory = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打开菜单</span>
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(directory.url)
                  toast.success("URL 已复制")
                }}
              >
                复制 URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
