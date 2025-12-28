"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import type { IPAddress } from "@/types/ip-address.types"
import { ExpandableCell } from "@/components/ui/data-table/expandable-cell"

export function createIPAddressColumns(params: {
  formatDate: (value: string) => string
}) {
  const { formatDate } = params

  const columns: ColumnDef<IPAddress>[] = [
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
    // IP 列
    {
      accessorKey: "ip",
      size: 150,
      minSize: 100,
      maxSize: 200,
      meta: { title: "IP Address" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP Address" />
      ),
      cell: ({ row }) => (
        <ExpandableCell value={row.original.ip} />
      ),
    },
    // host 列
    {
      accessorKey: "hosts",
      size: 200,
      minSize: 150,
      maxSize: 350,
      meta: { title: "Hosts" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hosts" />
      ),
      cell: ({ getValue }) => {
        const hosts = getValue<string[]>()
        if (!hosts || hosts.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        
        // 显示前3个主机名
        const displayHosts = hosts.slice(0, 3)
        const hasMore = hosts.length > 3
        
        return (
          <div className="flex flex-col gap-1">
            {displayHosts.map((host, index) => (
              <ExpandableCell key={index} value={host} maxLines={1} />
            ))}
            {hasMore && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge variant="secondary" className="text-xs w-fit cursor-pointer hover:bg-muted">
                    +{hosts.length - 3} more
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">All Hosts ({hosts.length})</h4>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {hosts.map((host, index) => (
                        <span key={index} className="text-sm break-all">
                          {host}
                        </span>
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
    // createdAt 列
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
      cell: ({ getValue }) => {
        const value = getValue<string | undefined>()
        return value ? formatDate(value) : "-"
      },
    },
    // 开放端口列
    {
      accessorKey: "ports",
      size: 250,
      minSize: 150,
      meta: { title: "Open Ports" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Open Ports" />
      ),
      cell: ({ getValue }) => {
        const ports = getValue<number[]>()
        
        if (!ports || ports.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }

        // 按端口号排序
        const sortedPorts = [...ports].sort((a, b) => a - b)
        
        // 显示前8个端口
        const displayPorts = sortedPorts.slice(0, 8)
        const hasMore = sortedPorts.length > 8

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayPorts.map((port, index) => (
              <Badge 
                key={index} 
                variant="outline"
                className="text-xs font-mono"
              >
                {port}
              </Badge>
            ))}
            {hasMore && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-muted">
                    +{sortedPorts.length - 8} more
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">All Open Ports ({sortedPorts.length})</h4>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {sortedPorts.map((port, index) => (
                        <Badge 
                          key={index} 
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          {port}
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
  ]

  return columns
}
