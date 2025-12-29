"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { UnifiedDataTable } from "@/components/ui/data-table"
import type { ScanEngine } from "@/types/engine.types"

// Component props type definitions
interface EngineDataTableProps {
  data: ScanEngine[]
  columns: ColumnDef<ScanEngine>[]
  onAddNew?: () => void
  searchPlaceholder?: string
  searchColumn?: string
  addButtonText?: string
}

/**
 * Scan engine data table component
 * Uses UnifiedDataTable unified component
 */
export function EngineDataTable({
  data = [],
  columns,
  onAddNew,
  searchPlaceholder,
  addButtonText,
}: EngineDataTableProps) {
  const t = useTranslations("common.status")
  const tEngine = useTranslations("scan.engine")
  
  // Local search state
  const [searchValue, setSearchValue] = React.useState("")

  // Filter data (local filtering)
  const filteredData = React.useMemo(() => {
    if (!searchValue) return data
    return data.filter((item) => {
      const name = item.name || ""
      return name.toLowerCase().includes(searchValue.toLowerCase())
    })
  }, [data, searchValue])

  return (
    <UnifiedDataTable
      data={filteredData}
      columns={columns}
      getRowId={(row) => String(row.id)}
      enableRowSelection={false}
      onAddNew={onAddNew}
      addButtonLabel={addButtonText || tEngine("createEngine")}
      showBulkDelete={false}
      emptyMessage={t("noData")}
      toolbarLeft={
        <Input
          placeholder={searchPlaceholder || tEngine("searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="max-w-sm h-8"
        />
      }
    />
  )
}

