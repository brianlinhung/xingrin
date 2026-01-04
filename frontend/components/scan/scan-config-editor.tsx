"use client"

import React, { useMemo } from "react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { YamlEditor } from "@/components/ui/yaml-editor"
import { cn } from "@/lib/utils"
import { CAPABILITY_CONFIG, parseEngineCapabilities } from "@/lib/engine-config"

import type { ScanEngine } from "@/types/engine.types"

interface ScanConfigEditorProps {
  configuration: string
  onChange: (value: string) => void
  onValidationChange?: (isValid: boolean) => void
  selectedEngines?: ScanEngine[]
  selectedCapabilities?: string[]
  isConfigEdited?: boolean
  disabled?: boolean
  showCapabilities?: boolean
  className?: string
}

export function ScanConfigEditor({
  configuration,
  onChange,
  onValidationChange,
  selectedEngines = [],
  selectedCapabilities: propCapabilities,
  isConfigEdited = false,
  disabled = false,
  showCapabilities = true,
  className,
}: ScanConfigEditorProps) {
  const t = useTranslations("scan.initiate")
  const tStages = useTranslations("scan.progress.stages")

  // Calculate capabilities from selected engines if not provided
  const capabilities = useMemo(() => {
    if (propCapabilities) return propCapabilities
    if (!selectedEngines.length) return []
    const allCaps = new Set<string>()
    selectedEngines.forEach((engine) => {
      parseEngineCapabilities(engine.configuration || "").forEach((cap) => allCaps.add(cap))
    })
    return Array.from(allCaps)
  }, [selectedEngines, propCapabilities])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Capabilities header */}
      {showCapabilities && (
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
          {capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {capabilities.map((capKey) => {
                const config = CAPABILITY_CONFIG[capKey]
                return (
                  <Badge key={capKey} variant="outline" className={cn("text-xs py-0", config?.color)}>
                    {tStages(capKey)}
                  </Badge>
                )
              })}
            </div>
          )}
          {isConfigEdited && (
            <Badge variant="outline" className="ml-auto text-xs">
              {t("configEdited")}
            </Badge>
          )}
        </div>
      )}
      
      {/* YAML Editor */}
      <div className="flex-1 overflow-hidden">
        <YamlEditor
          value={configuration}
          onChange={onChange}
          disabled={disabled}
          onValidationChange={onValidationChange}
        />
      </div>
    </div>
  )
}
