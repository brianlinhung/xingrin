"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { EholeFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

/**
 * 关键词列表单元格 - 默认显示3个，超出可展开
 */
function KeywordListCell({ keywords }: { keywords: string[] }) {
  const [expanded, setExpanded] = React.useState(false)
  
  if (!keywords || keywords.length === 0) return <span className="text-muted-foreground">-</span>
  
  const displayKeywords = expanded ? keywords : keywords.slice(0, 3)
  const hasMore = keywords.length > 3
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayKeywords.map((kw, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            {kw}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  )
}

/**
 * 创建 EHole 指纹表格列定义
 */
export function createEholeFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<EholeFingerprint>[] {
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
      enableResizing: false,
      size: 40,
    },
    // CMS 名称
    {
      accessorKey: "cms",
      meta: { title: "CMS" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CMS" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("cms")}</div>
      ),
      enableResizing: true,
      size: 200,
    },
    // 匹配方式
    {
      accessorKey: "method",
      meta: { title: "Method" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Method" />
      ),
      cell: ({ row }) => {
        const method = row.getValue("method") as string
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {method}
          </Badge>
        )
      },
      enableResizing: false,
      size: 120,
    },
    // 匹配位置
    {
      accessorKey: "location",
      meta: { title: "Location" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => {
        const location = row.getValue("location") as string
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {location}
          </Badge>
        )
      },
      enableResizing: false,
      size: 100,
    },
    // 关键词
    {
      accessorKey: "keyword",
      meta: { title: "Keyword" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Keyword" />
      ),
      cell: ({ row }) => <KeywordListCell keywords={row.getValue("keyword") || []} />,
      enableResizing: true,
      size: 300,
    },
    // 类型
    {
      accessorKey: "type",
      meta: { title: "Type" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        if (!type || type === "-") return "-"
        return <Badge variant="outline">{type}</Badge>
      },
      enableResizing: false,
      size: 100,
    },
    // 重点资产
    {
      accessorKey: "isImportant",
      meta: { title: "Important" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Important" />
      ),
      cell: ({ row }) => {
        const isImportant = row.getValue("isImportant")
        return <span>{String(isImportant)}</span>
      },
      enableResizing: false,
      size: 100,
    },
    // 创建时间
    {
      accessorKey: "createdAt",
      meta: { title: "Created" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="text-sm text-muted-foreground">
            {formatDate(date)}
          </div>
        )
      },
      enableResizing: false,
      size: 160,
    },
  ]
}
