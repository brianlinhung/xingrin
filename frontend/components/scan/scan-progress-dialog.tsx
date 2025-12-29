"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  IconCircleCheck,
  IconLoader,
  IconClock,
  IconCircleX,
  IconPlayerStop,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"
import type { ScanStage, ScanRecord, StageProgress, StageStatus } from "@/types/scan.types"

/**
 * Scan stage details
 */
interface StageDetail {
  stage: ScanStage      // Stage name (from engine_config key)
  status: StageStatus
  duration?: string     // Duration, e.g. "2m30s"
  detail?: string       // Additional info, e.g. "Found 120 subdomains"
  resultCount?: number  // Result count
}

/**
 * Scan progress data
 */
export interface ScanProgressData {
  id: number
  targetName: string
  engineName: string
  status: string
  progress: number
  currentStage?: ScanStage
  startedAt?: string
  errorMessage?: string  // Error message (present when failed)
  stages: StageDetail[]
}

interface ScanProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ScanProgressData | null
}

/** Scan status style configuration */
const SCAN_STATUS_STYLES: Record<string, string> = {
  running: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20",
  cancelled: "bg-[#848d97]/10 text-[#848d97] border-[#848d97]/20",
  completed: "bg-[#238636]/10 text-[#238636] border-[#238636]/20 dark:text-[#3fb950]",
  failed: "bg-[#da3633]/10 text-[#da3633] border-[#da3633]/20 dark:text-[#f85149]",
  initiated: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20",
}

/**
 * Pulsing dot animation (consistent with scan-history)
 */
function PulsingDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-3 w-3", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
    </span>
  )
}

/**
 * Scan status icon (for title, consistent with scan-history status column animation)
 */
function ScanStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <PulsingDot className="text-[#d29922]" />
    case "completed":
      return <IconCircleCheck className="h-5 w-5 text-[#238636] dark:text-[#3fb950]" />
    case "cancelled":
      return <IconCircleX className="h-5 w-5 text-[#848d97]" />
    case "failed":
      return <IconCircleX className="h-5 w-5 text-[#da3633] dark:text-[#f85149]" />
    case "initiated":
      return <PulsingDot className="text-[#d29922]" />
    default:
      return <PulsingDot className="text-muted-foreground" />
  }
}

/**
 * Scan status badge
 */
function ScanStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const className = SCAN_STATUS_STYLES[status] || "bg-muted text-muted-foreground"
  const label = t(`status_${status}`)
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

/**
 * Stage status icon
 */
function StageStatusIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "completed":
      return <IconCircleCheck className="h-5 w-5 text-[#238636] dark:text-[#3fb950]" />
    case "running":
      return <PulsingDot className="text-[#d29922]" />
    case "failed":
      return <IconCircleX className="h-5 w-5 text-[#da3633] dark:text-[#f85149]" />
    case "cancelled":
      return <IconCircleX className="h-5 w-5 text-[#d29922]" />
    default:
      return <IconClock className="h-5 w-5 text-muted-foreground" />
  }
}

/**
 * Single stage row
 */
function StageRow({ stage, t }: { stage: StageDetail; t: (key: string) => string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-4 rounded-lg transition-colors",
        stage.status === "running" && "bg-[#d29922]/10 border border-[#d29922]/20",
        stage.status === "completed" && "bg-muted/50",
        stage.status === "failed" && "bg-[#da3633]/10",
        stage.status === "cancelled" && "bg-[#d29922]/10",
      )}
    >
      <div className="flex items-center gap-3">
        <StageStatusIcon status={stage.status} />
        <div>
          <span className="font-medium">{t(`stages.${stage.stage}`)}</span>
          {stage.detail && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {stage.detail}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 text-right">
        {/* Status/Duration */}
        {stage.status === "running" && (
          <Badge variant="outline" className="bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20">
            {t("stage_running")}
          </Badge>
        )}
        {stage.status === "completed" && stage.duration && (
          <span className="text-sm text-muted-foreground font-mono">
            {stage.duration}
          </span>
        )}
        {stage.status === "pending" && (
          <span className="text-sm text-muted-foreground">{t("stage_pending")}</span>
        )}
        {stage.status === "failed" && (
          <Badge variant="outline" className="bg-[#da3633]/10 text-[#da3633] border-[#da3633]/20 dark:text-[#f85149]">
            {t("stage_failed")}
          </Badge>
        )}
        {stage.status === "cancelled" && (
          <Badge variant="outline" className="bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20">
            {t("stage_cancelled")}
          </Badge>
        )}
      </div>
    </div>
  )
}

/**
 * Scan progress dialog
 */
export function ScanProgressDialog({
  open,
  onOpenChange,
  data,
}: ScanProgressDialogProps) {
  const t = useTranslations("scan.progress")
  const locale = useLocale()
  
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanStatusIcon status={data.status} />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {/* Basic information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("target")}</span>
            <span className="font-medium">{data.targetName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("engine")}</span>
            <Badge variant="secondary">{data.engineName}</Badge>
          </div>
          {data.startedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("startTime")}</span>
              <span className="font-mono text-xs">{formatDateTime(data.startedAt, locale)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("status")}</span>
            <ScanStatusBadge status={data.status} t={t} />
          </div>
          {/* Error message (shown when failed) */}
          {data.errorMessage && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">{t("errorReason")}</p>
              <p className="text-sm text-destructive/80 mt-1 break-words">{data.errorMessage}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Total progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("totalProgress")}</span>
            <span className="font-mono text-muted-foreground">{data.progress}%</span>
          </div>

          <div className="h-2 bg-primary/10 rounded-full overflow-hidden border border-border">
            <div 
              className={`h-full transition-all ${
                data.status === "completed" ? "bg-[#238636]/80" : 
                data.status === "failed" ? "bg-[#da3633]/80" : 
                data.status === "running" ? "bg-[#d29922]/80 progress-striped" : 
                data.status === "cancelled" ? "bg-[#848d97]/80" :
                data.status === "cancelling" ? "bg-[#d29922]/80 progress-striped" :
                data.status === "initiated" ? "bg-[#d29922]/80 progress-striped" :
                "bg-muted-foreground/80"
              }`}
              style={{ width: `${data.status === "completed" ? 100 : data.progress}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* Stage list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {data.stages.map((stage) => (
            <StageRow key={stage.stage} stage={stage} t={t} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Format duration (seconds -> readable string)
 */
function formatDuration(seconds?: number): string | undefined {
  if (seconds === undefined || seconds === null) return undefined
  if (seconds < 1) return "<1s"
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
}

/**
 * Format date time (ISO string -> readable format)
 */
function formatDateTime(isoString?: string, locale: string = "zh"): string {
  if (!isoString) return ""
  try {
    const date = new Date(isoString)
    return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  } catch {
    return isoString
  }
}

/** Get stage result count from summary */
function getStageResultCount(stageName: string, summary: ScanRecord["summary"]): number | undefined {
  if (!summary) return undefined
  switch (stageName) {
    case "subdomain_discovery":
    case "subdomainDiscovery":
      return summary.subdomains
    case "site_scan":
    case "siteScan":
      return summary.websites
    case "directory_scan":
    case "directoryScan":
      return summary.directories
    case "url_fetch":
    case "urlFetch":
      return summary.endpoints
    case "vuln_scan":
    case "vulnScan":
      return summary.vulnerabilities?.total
    default:
      return undefined
  }
}

/**
 * Build ScanProgressData from ScanRecord
 * 
 * Stage names come directly from engine_config keys, no mapping needed
 * Stage order follows the order field, consistent with Flow execution order
 */
export function buildScanProgressData(scan: ScanRecord): ScanProgressData {
  const stages: StageDetail[] = []
  
  if (scan.stageProgress) {
    // Sort by order then iterate
    const sortedEntries = Object.entries(scan.stageProgress)
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    
    for (const [stageName, progress] of sortedEntries) {
      const resultCount = progress.status === "completed" 
        ? getStageResultCount(stageName, scan.summary)
        : undefined
      
      stages.push({
        stage: stageName,
        status: progress.status,
        duration: formatDuration(progress.duration),
        detail: progress.detail || progress.error || progress.reason,
        resultCount,
      })
    }
  }
  
  return {
    id: scan.id,
    targetName: scan.targetName,
    engineName: scan.engineName,
    status: scan.status,
    progress: scan.progress,
    currentStage: scan.currentStage,
    startedAt: scan.createdAt,
    errorMessage: scan.errorMessage,
    stages,
  }
}
