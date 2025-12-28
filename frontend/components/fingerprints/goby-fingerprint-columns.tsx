"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { GobyFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

/**
 * 规则详情单元格组件 - 显示原始 JSON 数据
 */
function RuleDetailsCell({ rules }: { rules: any[] }) {
  const [expanded, setExpanded] = React.useState(false)
  
  if (!rules || rules.length === 0) return <span className="text-muted-foreground">-</span>
  
  const displayRules = expanded ? rules : rules.slice(0, 2)
  const hasMore = rules.length > 2
  
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-xs space-y-0.5">
        {displayRules.map((r, idx) => (
          <div key={idx} className={expanded ? "break-all" : "truncate"}>
            {JSON.stringify(r)}
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
 * 创建 Goby 指纹表格列定义
 */
export function createGobyFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<GobyFingerprint>[] {
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
    // 产品名称
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
      size: 200,
    },
    // 逻辑表达式
    {
      accessorKey: "logic",
      meta: { title: "Logic" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Logic" />
      ),
      cell: ({ row }) => {
        const logic = row.getValue("logic") as string
        return <span className="font-mono text-xs">{logic}</span>
      },
      enableResizing: false,
      size: 100,
    },
    // 规则数量
    {
      accessorKey: "rule",
      meta: { title: "Rules" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rules" />
      ),
      cell: ({ row }) => {
        const rules = row.getValue("rule") as any[]
        return <span>{rules?.length || 0}</span>
      },
      enableResizing: false,
      size: 80,
    },
    // 规则详情
    {
      id: "ruleDetails",
      meta: { title: "Rule Details" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rule Details" />
      ),
      cell: ({ row }) => <RuleDetailsCell rules={row.original.rule || []} />,
      enableResizing: true,
      size: 300,
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
