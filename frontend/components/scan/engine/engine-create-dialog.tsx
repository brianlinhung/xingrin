"use client"

import React, { useState } from "react"
import { FileCode, Save, X, AlertCircle, CheckCircle2 } from "lucide-react"
import Editor from "@monaco-editor/react"
import * as yaml from "js-yaml"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useColorTheme } from "@/hooks/use-color-theme"

interface EngineCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (name: string, yamlContent: string) => Promise<void>
}

/**
 * Create new engine dialog
 */
export function EngineCreateDialog({
  open,
  onOpenChange,
  onSave,
}: EngineCreateDialogProps) {
  const t = useTranslations("scan.engine.create")
  const tToast = useTranslations("toast")
  const tCommon = useTranslations("common.actions")
  const [engineName, setEngineName] = useState("")
  const [yamlContent, setYamlContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [yamlError, setYamlError] = useState<{ message: string; line?: number; column?: number } | null>(null)
  const { currentTheme } = useColorTheme()
  const editorRef = React.useRef<any>(null)

  // Default YAML template
  const defaultYaml = `# Please write engine configuration YAML here
# You can refer to configuration examples in engine_config_example.yaml file`;

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setEngineName("")
      setYamlContent(defaultYaml)
      setYamlError(null)
    }
  }, [open])

  // Validate YAML syntax
  const validateYaml = (content: string) => {
    if (!content.trim()) {
      setYamlError(null)
      return true
    }

    try {
      yaml.load(content)
      setYamlError(null)
      return true
    } catch (error) {
      const yamlError = error as yaml.YAMLException
      setYamlError({
        message: yamlError.message,
        line: yamlError.mark?.line ? yamlError.mark.line + 1 : undefined,
        column: yamlError.mark?.column ? yamlError.mark.column + 1 : undefined,
      })
      return false
    }
  }

  // Handle editor content change
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || ""
    setYamlContent(newValue)
    validateYaml(newValue)
  }

  // Handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    setIsEditorReady(true)
  }

  // Handle save
  const handleSave = async () => {
    // Validate engine name
    if (!engineName.trim()) {
      toast.error(tToast("engineNameRequired"))
      return
    }

    // YAML validation
    if (!yamlContent.trim()) {
      toast.error(tToast("configRequired"))
      return
    }

    if (!validateYaml(yamlContent)) {
      toast.error(tToast("yamlSyntaxError"), {
        description: yamlError?.message,
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (onSave) {
        await onSave(engineName, yamlContent)
      } else {
        // TODO: Call actual API to create engine
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      toast.success(tToast("engineCreateSuccess"), {
        description: tToast("engineCreateSuccessDesc", { name: engineName }),
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create engine:", error)
      toast.error(tToast("engineCreateFailed"), {
        description: error instanceof Error ? error.message : tToast("unknownError"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close
  const handleClose = () => {
    if (engineName.trim() || yamlContent !== defaultYaml) {
      const confirmed = window.confirm(t("confirmClose"))
      if (!confirmed) return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-w-[calc(100%-2rem)] h-[90vh] flex flex-col p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {t("title")}
            </DialogTitle>
            <DialogDescription>
              {t("desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="flex flex-col h-full gap-4">
              {/* Engine name input */}
              <div className="space-y-2">
                <Label htmlFor="engine-name">
                  {t("engineName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="engine-name"
                  value={engineName}
                  onChange={(e) => setEngineName(e.target.value)}
                  placeholder={t("engineNamePlaceholder")}
                  disabled={isSubmitting}
                  className="max-w-md"
                />
              </div>

              {/* YAML editor */}
              <div className="flex flex-col flex-1 min-h-0 gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("yamlConfig")}</Label>
                  {/* Syntax validation status */}
                  <div className="flex items-center gap-2">
                    {yamlContent.trim() && (
                      yamlError ? (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{t("syntaxError")}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{t("syntaxValid")}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className={`border rounded-md overflow-hidden flex-1 ${yamlError ? 'border-destructive' : ''}`}>
                  <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={yamlContent}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme={currentTheme.isDark ? "vs-dark" : "light"}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      wordWrap: "off",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      folding: true,
                      foldingStrategy: "indentation",
                      showFoldingControls: "always",
                      bracketPairColorization: {
                        enabled: true,
                      },
                      padding: {
                        top: 16,
                        bottom: 16,
                      },
                      readOnly: isSubmitting,
                    }}
                    loading={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                          <p className="text-sm text-muted-foreground">{t("loadingEditor")}</p>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* Error message display */}
                {yamlError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-destructive mb-1">
                        {yamlError.line && yamlError.column
                          ? t("errorLocation", { line: yamlError.line, column: yamlError.column })
                          : tToast("yamlSyntaxError")}
                      </p>
                      <p className="text-muted-foreground">{yamlError.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !engineName.trim() || !!yamlError || !isEditorReady}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("creating")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("createEngine")}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

