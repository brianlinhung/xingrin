"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from "lucide-react"
import type { WebSite } from "@/types/website.types"
import { CopyablePopoverContent } from "@/components/ui/copyable-popover-content"

/**
 * 数据表格列头组件 - 支持排序
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
        <ChevronUp className="h-4 w-4" />
      ) : isSorted === "desc" ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronsUpDown className="h-4 w-4" />
      )}
    </Button>
  )
}

interface CreateWebSiteColumnsProps {
  formatDate: (dateString: string) => string
}

export function createWebSiteColumns({
  formatDate,
}: CreateWebSiteColumnsProps): ColumnDef<WebSite>[] {
  return [
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
    {
      accessorKey: "url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="URL" />
      ),
      size: 300,
      minSize: 200,
      maxSize: 400,
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
    {
      accessorKey: "host",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Host" />
      ),
      cell: ({ row }) => {
        const host = row.getValue("host") as string
        if (!host) return <span className="text-muted-foreground text-sm">-</span>
        return <span className="text-sm font-mono">{host}</span>
      },
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => {
        const title = row.getValue("title") as string
        if (!title) return "-"
        
        const maxLength = 30
        const isLong = title.length > maxLength
        const displayText = isLong ? title.substring(0, maxLength) : title
        
        if (!isLong) {
          return <span className="text-sm">{title}</span>
        }
        
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{displayText}</span>
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={title} />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
    },
    {
      accessorKey: "statusCode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
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
      accessorKey: "contentLength",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content Length" />
      ),
      cell: ({ row }) => {
        const contentLength = row.getValue("contentLength") as number
        if (!contentLength) return "-"
        return contentLength.toString()
      },
    },
    {
      accessorKey: "location",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => {
        const location = row.getValue("location") as string
        if (!location) return "-"
        
        const maxLength = 50
        const isLong = location.length > maxLength
        const displayText = isLong ? location.substring(0, maxLength) : location
        
        if (!isLong) {
          return <span className="text-sm">{location}</span>
        }
        
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{displayText}</span>
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={location} />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
    },
    {
      accessorKey: "webserver",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Web Server" />
      ),
      cell: ({ row }) => {
        const webserver = row.getValue("webserver") as string
        if (!webserver) return "-"
        
        const maxLength = 20
        const isLong = webserver.length > maxLength
        const displayText = isLong ? webserver.substring(0, maxLength) : webserver
        
        if (!isLong) {
          return <span className="text-sm">{webserver}</span>
        }
        
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{displayText}</span>
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={webserver} />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
    },
    {
      accessorKey: "contentType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Content Type" />
      ),
      cell: ({ row }) => {
        const contentType = row.getValue("contentType") as string
        if (!contentType) return "-"
        
        const maxLength = 25
        const isLong = contentType.length > maxLength
        const displayText = isLong ? contentType.substring(0, maxLength) : contentType
        
        if (!isLong) {
          return <span className="text-sm">{contentType}</span>
        }
        
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{displayText}</span>
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={contentType} />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
    },
    {
      accessorKey: "tech",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Technologies" />
      ),
      cell: ({ row }) => {
        const tech = row.getValue("tech") as string[]
        if (!tech || tech.length === 0) return "-"
        
        // 显示前2个技术，如果有更多就显示省略
        const displayTech = tech.slice(0, 2)
        const hasMore = tech.length > 2

        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {displayTech.map((technology, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {technology}
              </Badge>
            ))}
            {hasMore && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-muted">
                    +{tech.length - 2}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">所有技术栈 ({tech.length})</h4>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {tech.map((technology, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {technology}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "bodyPreview",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Body Preview" />
      ),
      cell: ({ row }) => {
        const bodyPreview = row.getValue("bodyPreview") as string
        if (!bodyPreview) return "-"
        
        const maxLength = 30
        const isLong = bodyPreview.length > maxLength
        const displayText = isLong ? bodyPreview.substring(0, maxLength) : bodyPreview
        
        if (!isLong) {
          return <span className="text-sm">{bodyPreview}</span>
        }
        
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{displayText}</span>
            <Popover>
              <PopoverTrigger asChild>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground flex-shrink-0 transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-3">
                <CopyablePopoverContent value={bodyPreview} />
              </PopoverContent>
            </Popover>
          </div>
        )
      },
    },
    {
      accessorKey: "vhost",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="VHost" />
      ),
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
      accessorKey: "discoveredAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Discovered At" />
      ),
      cell: ({ row }) => {
        const discoveredAt = row.getValue("discoveredAt") as string
        return <div className="text-sm">{discoveredAt ? formatDate(discoveredAt) : "-"}</div>
      },
    },
  ]
}
