"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Play, Server, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LoadingSpinner } from "@/components/loading-spinner"
import { EnginePresetSelector } from "./engine-preset-selector"
import { ScanConfigEditor } from "./scan-config-editor"

import type { Organization } from "@/types/organization.types"

import { initiateScan } from "@/services/scan.service"
import { toast } from "sonner"
import { useEngines } from "@/hooks/use-engines"

interface InitiateScanDialogProps {
  organization?: Organization | null
  organizationId?: number
  targetId?: number
  targetName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InitiateScanDialog({
  organization,
  organizationId,
  targetId,
  targetName,
  open,
  onOpenChange,
  onSuccess,
}: InitiateScanDialogProps) {
  const t = useTranslations("scan.initiate")
  const tToast = useTranslations("toast")
  const [step, setStep] = useState(1)
  const [selectedEngineIds, setSelectedEngineIds] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  
  // Configuration state management
  const [configuration, setConfiguration] = useState("")
  const [isConfigEdited, setIsConfigEdited] = useState(false)
  const [isYamlValid, setIsYamlValid] = useState(true)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [pendingConfigChange, setPendingConfigChange] = useState<string | null>(null)

  const { data: engines } = useEngines()

  const steps = [
    { id: 1, title: t("steps.selectEngine"), icon: Server },
    { id: 2, title: t("steps.editConfig"), icon: Settings },
  ]

  const selectedEngines = useMemo(() => {
    if (!selectedEngineIds.length || !engines) return []
    return engines.filter((e) => selectedEngineIds.includes(e.id))
  }, [selectedEngineIds, engines])

  // Handle configuration change from preset selector (may need confirmation)
  const handlePresetConfigChange = useCallback((value: string) => {
    if (isConfigEdited && configuration !== value) {
      setPendingConfigChange(value)
      setShowOverwriteConfirm(true)
    } else {
      setConfiguration(value)
      setIsConfigEdited(false)
    }
  }, [isConfigEdited, configuration])

  // Handle manual config editing
  const handleManualConfigChange = useCallback((value: string) => {
    setConfiguration(value)
    setIsConfigEdited(true)
  }, [])

  const handleEngineIdsChange = useCallback((engineIds: number[]) => {
    setSelectedEngineIds(engineIds)
  }, [])

  const handleOverwriteConfirm = () => {
    if (pendingConfigChange !== null) {
      setConfiguration(pendingConfigChange)
      setIsConfigEdited(false)
    }
    setShowOverwriteConfirm(false)
    setPendingConfigChange(null)
  }

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false)
    setPendingConfigChange(null)
  }

  const handleYamlValidationChange = (isValid: boolean) => {
    setIsYamlValid(isValid)
  }

  const handleInitiate = async () => {
    if (selectedEngineIds.length === 0) {
      toast.error(tToast("noEngineSelected"))
      return
    }
    if (!configuration.trim()) {
      toast.error(tToast("emptyConfig"))
      return
    }
    if (!organizationId && !targetId) {
      toast.error(tToast("paramError"), { description: tToast("paramErrorDesc") })
      return
    }
    setIsSubmitting(true)
    try {
      const response = await initiateScan({
        organizationId,
        targetId,
        configuration,
        engineIds: selectedEngineIds,
        engineNames: selectedEngines.map(e => e.name),
      })
      
      // 后端返回 201 说明成功创建扫描任务
      const scanCount = response.scans?.length || response.count || 0
      toast.success(tToast("scanInitiated"), {
        description: response.message || tToast("scanInitiatedDesc", { count: scanCount }),
      })
      onSuccess?.()
      onOpenChange(false)
      setSelectedEngineIds([])
      setConfiguration("")
      setIsConfigEdited(false)
    } catch (err: unknown) {
      console.error("Failed to initiate scan:", err)
      const error = err as { response?: { data?: { error?: { code?: string; message?: string } } } }
      toast.error(tToast("initiateScanFailed"), {
        description: error?.response?.data?.error?.message || (err instanceof Error ? err.message : tToast("unknownError")),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setStep(1)
        setSelectedPresetId(null)
        setSelectedEngineIds([])
        setConfiguration("")
        setIsConfigEdited(false)
      }
    }
  }

  const canProceedToStep2 = selectedPresetId !== null && selectedEngineIds.length > 0
  const canSubmit = selectedEngineIds.length > 0 && configuration.trim().length > 0 && isYamlValid

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[900px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                {t("title")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {targetName ? (
                  <>{t("targetDesc")} <span className="font-medium text-foreground">{targetName}</span></>
                ) : (
                  <>{t("orgDesc")} <span className="font-medium text-foreground">{organization?.name}</span></>
                )}
              </DialogDescription>
            </div>
            {/* Step indicator */}
            <div className="text-sm text-muted-foreground mr-8">
              {t("stepIndicator", { current: step, total: steps.length })}
            </div>
          </div>
        </DialogHeader>

        <div className="border-t h-[480px] overflow-hidden">
          {/* Step 1: Select preset/engines */}
          {step === 1 && engines && (
            <EnginePresetSelector
              engines={engines}
              selectedEngineIds={selectedEngineIds}
              selectedPresetId={selectedPresetId}
              onPresetChange={setSelectedPresetId}
              onEngineIdsChange={handleEngineIdsChange}
              onConfigurationChange={handlePresetConfigChange}
              disabled={isSubmitting}
            />
          )}

          {/* Step 2: Edit configuration */}
          {step === 2 && (
            <ScanConfigEditor
              configuration={configuration}
              onChange={handleManualConfigChange}
              onValidationChange={handleYamlValidationChange}
              selectedEngines={selectedEngines}
              isConfigEdited={isConfigEdited}
              disabled={isSubmitting}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {step === 1 && selectedEngineIds.length > 0 && (
              <span className="text-primary">{t("selectedCount", { count: selectedEngineIds.length })}</span>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("back")}
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                {t("next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleInitiate} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner />
                    {t("initiating")}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {t("startScan")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Overwrite confirmation dialog */}
      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("overwriteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("overwriteConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverwriteCancel}>
              {t("overwriteConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteConfirm}>
              {t("overwriteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
