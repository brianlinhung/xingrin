"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"
import type { WappalyzerFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

/**
 * JSON 对象展示单元格 - 显示原始 JSON
 */
function JsonCell({ data }: { data: any }) {
  const [expanded, setExpanded] = React.useState(false)
  
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <span className="text-muted-foreground">-</span>
  }
  
  const jsonStr = JSON.stringify(data)
  const isLong = jsonStr.length > 50
  
  return (
    <div className="flex flex-col gap-1">
      <div className={`font-mono text-xs ${expanded ? "break-all whitespace-pre-wrap" : "truncate"}`}>
        {expanded ? JSON.stringify(data, null, 2) : jsonStr}
      </div>
      {isLong && (
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
 * 数组展示单元格 - 显示原始数组
 */
function ArrayCell({ data }: { data: any[] }) {
  const [expanded, setExpanded] = React.useState(false)
  
  if (!data || data.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }
  
  const displayItems = expanded ? data : data.slice(0, 2)
  const hasMore = data.length > 2
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayItems.map((item, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
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
 * 创建 Wappalyzer 指纹表格列定义
 */
export function createWappalyzerFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<WappalyzerFingerprint>[] {
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
    // 应用名称
    {
      accessorKey: "name",
      meta: { title: "Name" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
      enableResizing: true,
      size: 180,
    },
    // 分类 - 直接显示数组
    {
      accessorKey: "cats",
      meta: { title: "Cats" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cats" />
      ),
      cell: ({ row }) => {
        const cats = row.getValue("cats") as number[]
        if (!cats || cats.length === 0) return "-"
        return <span className="font-mono text-xs">{JSON.stringify(cats)}</span>
      },
      enableResizing: true,
      size: 120,
    },
    // Cookies
    {
      accessorKey: "cookies",
      meta: { title: "Cookies" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cookies" />
      ),
      cell: ({ row }) => <JsonCell data={row.getValue("cookies")} />,
      enableResizing: true,
      size: 200,
    },
    // Headers
    {
      accessorKey: "headers",
      meta: { title: "Headers" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Headers" />
      ),
      cell: ({ row }) => <JsonCell data={row.getValue("headers")} />,
      enableResizing: true,
      size: 200,
    },
    // Script Src
    {
      accessorKey: "scriptSrc",
      meta: { title: "ScriptSrc" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ScriptSrc" />
      ),
      cell: ({ row }) => <ArrayCell data={row.getValue("scriptSrc")} />,
      enableResizing: true,
      size: 200,
    },
    // JS
    {
      accessorKey: "js",
      meta: { title: "JS" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="JS" />
      ),
      cell: ({ row }) => <ArrayCell data={row.getValue("js")} />,
      enableResizing: true,
      size: 180,
    },
    // Implies
    {
      accessorKey: "implies",
      meta: { title: "Implies" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Implies" />
      ),
      cell: ({ row }) => <ArrayCell data={row.getValue("implies")} />,
      enableResizing: true,
      size: 180,
    },
    // Meta
    {
      accessorKey: "meta",
      meta: { title: "Meta" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Meta" />
      ),
      cell: ({ row }) => <JsonCell data={row.getValue("meta")} />,
      enableResizing: true,
      size: 200,
    },
    // HTML
    {
      accessorKey: "html",
      meta: { title: "HTML" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="HTML" />
      ),
      cell: ({ row }) => <ArrayCell data={row.getValue("html")} />,
      enableResizing: true,
      size: 200,
    },
    // 描述
    {
      accessorKey: "description",
      meta: { title: "Description" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => <ExpandableCell value={row.getValue("description")} maxLines={2} />,
      enableResizing: true,
      size: 250,
    },
    // 官网
    {
      accessorKey: "website",
      meta: { title: "Website" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Website" />
      ),
      cell: ({ row }) => <ExpandableCell value={row.getValue("website")} variant="url" maxLines={1} />,
      enableResizing: true,
      size: 200,
    },
    // CPE
    {
      accessorKey: "cpe",
      meta: { title: "CPE" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CPE" />
      ),
      cell: ({ row }) => {
        const cpe = row.getValue("cpe") as string
        return cpe ? <span className="font-mono text-xs">{cpe}</span> : "-"
      },
      enableResizing: true,
      size: 180,
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
