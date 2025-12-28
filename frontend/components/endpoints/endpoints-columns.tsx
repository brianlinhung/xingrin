"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { Endpoint } from "@/types/endpoint.types"
import { ExpandableCell, ExpandableTagList } from "@/components/ui/data-table/expandable-cell"

interface CreateColumnsProps {
  formatDate: (dateString: string) => string
}

function HttpStatusBadge({ statusCode }: { statusCode: number | null | undefined }) {
  if (statusCode === null || statusCode === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground px-2 py-1 font-mono">
        -
      </Badge>
    )
  }

  const getStatusVariant = (code: number): "default" | "secondary" | "destructive" | "outline" => {
    if (code >= 200 && code < 300) {
      return "outline"
    } else if (code >= 300 && code < 400) {
      return "secondary"
    } else if (code >= 400 && code < 500) {
      return "default"
    } else if (code >= 500) {
      return "destructive"
    } else {
      return "secondary"
    }
  }

  const variant = getStatusVariant(statusCode)

  return (
    <Badge variant={variant} className="px-2 py-1 font-mono tabular-nums">
      {statusCode}
    </Badge>
  )
}

export function createEndpointColumns({
  formatDate,
}: CreateColumnsProps): ColumnDef<Endpoint>[] {
  return [
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
    {
      accessorKey: "url",
      meta: { title: "URL" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="URL" />
      ),
      size: 400,
      minSize: 200,
      maxSize: 700,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("url")} />
      ),
    },
    {
      accessorKey: "title",
      meta: { title: "Title" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      size: 150,
      minSize: 100,
      maxSize: 300,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("title")} />
      ),
    },
    {
      accessorKey: "statusCode",
      meta: { title: "Status" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
      cell: ({ row }) => {
        const status = row.getValue("statusCode") as number | null | undefined
        return <HttpStatusBadge statusCode={status} />
      },
    },
    {
      accessorKey: "contentLength",
      meta: { title: "Content Length" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content Length" />
      ),
      size: 100,
      minSize: 80,
      maxSize: 150,
      cell: ({ row }) => {
        const len = row.getValue("contentLength") as number | null | undefined
        if (len === null || len === undefined) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        return <span className="font-mono tabular-nums">{new Intl.NumberFormat().format(len)}</span>
      },
    },
    {
      accessorKey: "location",
      meta: { title: "Location" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      size: 150,
      minSize: 100,
      maxSize: 300,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("location")} />
      ),
    },
    {
      accessorKey: "webserver",
      meta: { title: "Web Server" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Web Server" />
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("webserver")} />
      ),
    },
    {
      accessorKey: "contentType",
      meta: { title: "Content Type" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content Type" />
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("contentType")} />
      ),
    },
    {
      accessorKey: "tech",
      meta: { title: "Technologies" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Technologies" />
      ),
      size: 200,
      minSize: 150,
      cell: ({ row }) => {
        const tech = (row.getValue("tech") as string[] | null | undefined) || []
        return (
          <ExpandableTagList
            items={tech}
            maxVisible={3}
            variant="outline"
          />
        )
      },
    },
    {
      accessorKey: "bodyPreview",
      meta: { title: "Body Preview" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Body Preview" />
      ),
      size: 350,
      minSize: 250,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("bodyPreview")} />
      ),
    },
    {
      accessorKey: "vhost",
      meta: { title: "VHost" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="VHost" />
      ),
      size: 80,
      minSize: 60,
      maxSize: 100,
      cell: ({ row }) => {
        const vhost = row.getValue("vhost") as boolean | null | undefined
        if (vhost === null || vhost === undefined) return <span className="text-sm text-muted-foreground">-</span>
        return <span className="text-sm font-mono">{vhost ? "true" : "false"}</span>
      },
    },
    {
      accessorKey: "gfPatterns",
      meta: { title: "GF Patterns" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="GF Patterns" />
      ),
      size: 150,
      minSize: 100,
      maxSize: 250,
      cell: ({ row }) => {
        const patterns = (row.getValue("gfPatterns") as string[] | null | undefined) || []
        return (
          <ExpandableTagList
            items={patterns}
            maxVisible={3}
            variant="secondary"
          />
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "responseTime",
      meta: { title: "Response Time" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Response Time" />
      ),
      size: 100,
      minSize: 80,
      maxSize: 150,
      cell: ({ row }) => {
        const rt = row.getValue("responseTime") as number | null | undefined
        if (rt === null || rt === undefined) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        const formatted = `${rt.toFixed(4)}s`
        return <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatted}</span>
      },
    },
    {
      accessorKey: "createdAt",
      meta: { title: "Created At" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string | undefined
        return <div className="text-sm">{createdAt ? formatDate(createdAt) : "-"}</div>
      },
    },
  ]
}
