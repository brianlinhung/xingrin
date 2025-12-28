"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { WebSite } from "@/types/website.types"
import { ExpandableCell, ExpandableTagList } from "@/components/ui/data-table/expandable-cell"

interface CreateWebSiteColumnsProps {
  formatDate: (dateString: string) => string
}

export function createWebSiteColumns({
  formatDate,
}: CreateWebSiteColumnsProps): ColumnDef<WebSite>[] {
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
      accessorKey: "host",
      meta: { title: "Host" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Host" />
      ),
      size: 200,
      minSize: 100,
      maxSize: 250,
      cell: ({ row }) => (
        <ExpandableCell value={row.getValue("host")} />
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
      enableResizing: false,
      cell: ({ row }) => {
        const statusCode = row.getValue("statusCode") as number
        if (!statusCode) return "-"
        
        let variant: "default" | "secondary" | "destructive" | "outline" = "default"
        if (statusCode >= 200 && statusCode < 300) {
          variant = "default"
        } else if (statusCode >= 300 && statusCode < 400) {
          variant = "secondary"
        } else if (statusCode >= 400) {
          variant = "destructive"
        }
        
        return <Badge variant={variant}>{statusCode}</Badge>
      },
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
        const tech = row.getValue("tech") as string[]
        return <ExpandableTagList items={tech} maxVisible={3} variant="outline" />
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
        const contentLength = row.getValue("contentLength") as number
        if (!contentLength) return "-"
        return contentLength.toString()
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
      enableResizing: false,
      cell: ({ row }) => {
        const vhost = row.getValue("vhost") as boolean | null
        if (vhost === null) return "-"
        return (
          <Badge variant={vhost ? "default" : "secondary"} className="text-xs">
            {vhost ? "true" : "false"}
          </Badge>
        )
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
      enableResizing: false,
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string
        return <div className="text-sm">{createdAt ? formatDate(createdAt) : "-"}</div>
      },
    },
  ]
}
