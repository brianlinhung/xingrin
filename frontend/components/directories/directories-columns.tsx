"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"
import type { Directory } from "@/types/directory.types"

/**
 * HTTP 状态码徽章组件
 */
function StatusBadge({ status }: { status: number | null }) {
  if (!status) return <span className="text-muted-foreground">-</span>

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
    <Badge variant="default" className={className}>
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
      size: 400,
      minSize: 200,
      maxSize: 800,
      meta: { title: "URL" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="URL" />
      ),
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("url")} />
      ),
    },
    // Status 列
    {
      accessorKey: "status",
      size: 80,
      minSize: 60,
      maxSize: 120,
      enableResizing: false,
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    // Content Length 列
    {
      accessorKey: "contentLength",
      size: 100,
      minSize: 80,
      maxSize: 150,
      meta: { title: "Length" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Length" />
      ),
      cell: ({ row }) => {
        const length = row.getValue("contentLength") as number | null
        return <span>{length !== null ? length.toLocaleString() : "-"}</span>
      },
    },
    // Words 列
    {
      accessorKey: "words",
      size: 80,
      minSize: 60,
      maxSize: 120,
      meta: { title: "Words" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Words" />
      ),
      cell: ({ row }) => {
        const words = row.getValue("words") as number | null
        return <span>{words !== null ? words.toLocaleString() : "-"}</span>
      },
    },
    // Lines 列
    {
      accessorKey: "lines",
      size: 80,
      minSize: 60,
      maxSize: 120,
      meta: { title: "Lines" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Lines" />
      ),
      cell: ({ row }) => {
        const lines = row.getValue("lines") as number | null
        return <span>{lines !== null ? lines.toLocaleString() : "-"}</span>
      },
    },
    // Content Type 列
    {
      accessorKey: "contentType",
      size: 120,
      minSize: 80,
      maxSize: 200,
      enableResizing: false,
      meta: { title: "Content Type" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content Type" />
      ),
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
      size: 100,
      minSize: 80,
      maxSize: 150,
      meta: { title: "Duration" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number | null
        return <span className="text-muted-foreground">{formatDuration(duration)}</span>
      },
    },
    // Created At 列
    {
      accessorKey: "createdAt",
      size: 150,
      minSize: 120,
      maxSize: 200,
      enableResizing: false,
      meta: { title: "Created At" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return <span className="text-muted-foreground">{formatDate(date)}</span>
      },
    },
  ]
}
