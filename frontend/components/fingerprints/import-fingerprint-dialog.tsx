"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone"
import {
  useImportEholeFingerprints,
  useImportGobyFingerprints,
  useImportWappalyzerFingerprints,
} from "@/hooks/use-fingerprints"

type FingerprintType = "ehole" | "goby" | "wappalyzer"

interface ImportFingerprintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  fingerprintType?: FingerprintType
}

export function ImportFingerprintDialog({
  open,
  onOpenChange,
  onSuccess,
  fingerprintType = "ehole",
}: ImportFingerprintDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const t = useTranslations("tools.fingerprints")
  const tCommon = useTranslations("common.actions")
  const tToast = useTranslations("toast")
  
  const eholeImportMutation = useImportEholeFingerprints()
  const gobyImportMutation = useImportGobyFingerprints()
  const wappalyzerImportMutation = useImportWappalyzerFingerprints()

  // Fingerprint type configuration
  const FINGERPRINT_CONFIG: Record<FingerprintType, {
    title: string
    description: string
    formatHint: string
    validate: (json: any) => { valid: boolean; error?: string }
  }> = {
    ehole: {
      title: t("import.eholeTitle"),
      description: t("import.eholeDesc"),
      formatHint: t.raw("import.eholeFormatHint") as string,
      validate: (json) => {
        if (!json.fingerprint) {
          return { valid: false, error: t("import.eholeInvalidMissing") }
        }
        if (!Array.isArray(json.fingerprint)) {
          return { valid: false, error: t("import.eholeInvalidArray") }
        }
        if (json.fingerprint.length === 0) {
          return { valid: false, error: t("import.emptyData") }
        }
        const first = json.fingerprint[0]
        if (!first.cms || !first.keyword) {
          return { valid: false, error: t("import.eholeInvalidFields") }
        }
        return { valid: true }
      },
    },
    goby: {
      title: t("import.gobyTitle"),
      description: t("import.gobyDesc"),
      formatHint: t.raw("import.gobyFormatHint") as string,
      validate: (json) => {
        // Support both array and object formats
        if (Array.isArray(json)) {
          if (json.length === 0) {
            return { valid: false, error: t("import.emptyData") }
          }
          const first = json[0]
          if (!first.product || !first.rule) {
            return { valid: false, error: t("import.gobyInvalidFields") }
          }
        } else if (typeof json === "object" && json !== null) {
          if (Object.keys(json).length === 0) {
            return { valid: false, error: t("import.emptyData") }
          }
        } else {
          return { valid: false, error: t("import.gobyInvalidFormat") }
        }
        return { valid: true }
      },
    },
    wappalyzer: {
      title: t("import.wappalyzerTitle"),
      description: t("import.wappalyzerDesc"),
      formatHint: t.raw("import.wappalyzerFormatHint") as string,
      validate: (json) => {
        // Support array format
        if (Array.isArray(json)) {
          if (json.length === 0) {
            return { valid: false, error: t("import.emptyData") }
          }
          return { valid: true }
        }
        // Support object format (apps or technologies)
        const apps = json.apps || json.technologies
        if (apps) {
          if (typeof apps !== "object" || Array.isArray(apps)) {
            return { valid: false, error: t("import.wappalyzerInvalidApps") }
          }
          if (Object.keys(apps).length === 0) {
            return { valid: false, error: t("import.emptyData") }
          }
          return { valid: true }
        }
        // Direct object format
        if (typeof json === "object" && json !== null) {
          if (Object.keys(json).length === 0) {
            return { valid: false, error: t("import.emptyData") }
          }
          return { valid: true }
        }
        return { valid: false, error: t("import.wappalyzerInvalidFormat") }
      },
    },
  }

  const config = FINGERPRINT_CONFIG[fingerprintType]
  
  const importMutation = {
    ehole: eholeImportMutation,
    goby: gobyImportMutation,
    wappalyzer: wappalyzerImportMutation,
  }[fingerprintType]

  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles)
  }

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error(tToast("selectFileFirst"))
      return
    }

    const file = files[0]

    // Frontend basic validation
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const validation = config.validate(json)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }
    } catch (e) {
      toast.error(tToast("invalidJsonFile"))
      return
    }

    // Validation passed, submit to backend
    try {
      const result = await importMutation.mutateAsync(file)
      toast.success(t("import.importSuccessDetail", { created: result.created, failed: result.failed }))
      setFiles([])
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || tToast("importFailed"))
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setFiles([])
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Dropzone
            src={files}
            onDrop={handleDrop}
            accept={{ "application/json": [".json"] }}
            maxFiles={1}
            maxSize={50 * 1024 * 1024}  // 50MB
            onError={(error) => toast.error(error.message)}
          >
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>

          <p className="text-xs text-muted-foreground mt-3">
            {t("import.supportedFormat")}{" "}
            <code className="bg-muted px-1 rounded">
              {config.formatHint}
            </code>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={files.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? t("import.importing") : tCommon("import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
