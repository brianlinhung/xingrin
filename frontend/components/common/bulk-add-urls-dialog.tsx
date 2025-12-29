"use client"

import React, { useState, useRef } from "react"
import { Plus, Link } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/loading-spinner"
import { URLValidator, type TargetType } from "@/lib/url-validator"
import { useBulkCreateEndpoints } from "@/hooks/use-endpoints"
import { useBulkCreateWebsites } from "@/hooks/use-websites"
import { useBulkCreateDirectories } from "@/hooks/use-directories"

export type AssetType = 'endpoint' | 'website' | 'directory'

interface BulkAddUrlsDialogProps {
  targetId: number
  assetType: AssetType
  targetName?: string      // Target name (used for URL matching validation)
  targetType?: TargetType  // Target type (domain/ip/cidr)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

const ASSET_TYPE_LABELS: Record<AssetType, { title: string; description: string; placeholder: string }> = {
  endpoint: {
    title: 'Bulk Add Endpoints',
    description: 'Enter endpoint URL list, one per line.',
    placeholder: `Please enter endpoint URLs, one per line
Example:
https://example.com/api/v1
https://example.com/api/v2
https://example.com/login`,
  },
  website: {
    title: 'Bulk Add Websites',
    description: 'Enter website URL list, one per line.',
    placeholder: `Please enter website URLs, one per line
Example:
https://example.com
https://www.example.com
https://api.example.com`,
  },
  directory: {
    title: 'Bulk Add Directories',
    description: 'Enter directory URL list, one per line.',
    placeholder: `Please enter directory URLs, one per line
Example:
https://example.com/admin
https://example.com/api
https://example.com/uploads`,
  },
}

/**
 * Bulk add URLs dialog component
 * 
 * Supports three asset types: Endpoints, Websites, Directories.
 * Provides text input with line numbers, supports real-time validation and error hints.
 */
export function BulkAddUrlsDialog({
  targetId,
  assetType,
  targetName,
  targetType,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
}: BulkAddUrlsDialogProps) {
  const tBulkAdd = useTranslations("bulkAdd.common")
  
  // Dialog open/close state
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  // Form data state
  const [inputText, setInputText] = useState("")

  // Validation result state
  const [validationResult, setValidationResult] = useState<{
    validCount: number
    invalidCount: number
    duplicateCount: number
    mismatchedCount: number
    firstError?: { index: number; url: string; error: string }
    firstMismatch?: { index: number; url: string }
  } | null>(null)

  // Line number column and textarea refs (for synchronized scrolling)
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Use bulk create mutations
  const bulkCreateEndpoints = useBulkCreateEndpoints()
  const bulkCreateWebsites = useBulkCreateWebsites()
  const bulkCreateDirectories = useBulkCreateDirectories()

  // Select corresponding mutation based on asset type
  const getMutation = () => {
    switch (assetType) {
      case 'endpoint':
        return bulkCreateEndpoints
      case 'website':
        return bulkCreateWebsites
      case 'directory':
        return bulkCreateDirectories
    }
  }

  const mutation = getMutation()
  const labels = ASSET_TYPE_LABELS[assetType]

  // Handle input changes
  const handleInputChange = (value: string) => {
    setInputText(value)

    // Parse and validate
    const parsed = URLValidator.parse(value)
    if (parsed.length === 0) {
      setValidationResult(null)
      return
    }

    const result = URLValidator.validateBatch(parsed, targetName, targetType)
    setValidationResult({
      validCount: result.validCount,
      invalidCount: result.invalidCount,
      duplicateCount: result.duplicateCount,
      mismatchedCount: result.mismatchedCount,
      firstError: result.invalidItems[0]
        ? {
            index: result.invalidItems[0].index,
            url: result.invalidItems[0].url,
            error: result.invalidItems[0].error || tBulkAdd("formatInvalid"),
          }
        : undefined,
      firstMismatch: result.mismatchedItems[0]
        ? {
            index: result.mismatchedItems[0].index,
            url: result.mismatchedItems[0].url,
          }
        : undefined,
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputText.trim()) return
    if (!validationResult || validationResult.validCount === 0) return

    // Parse valid URLs
    const parsed = URLValidator.parse(inputText)
    const result = URLValidator.validateBatch(parsed)

    mutation.mutate(
      { targetId, urls: result.urls },
      {
        onSuccess: () => {
          // Reset form
          setInputText("")
          setValidationResult(null)
          // Close dialog
          setOpen(false)
          // Call external callback
          onSuccess?.()
        },
      }
    )
  }

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!mutation.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        setInputText("")
        setValidationResult(null)
      }
    }
  }

  // Synchronized scrolling
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  // Calculate line count
  const lineCount = Math.max(inputText.split("\n").length, 8)

  // Form validation: valid count > 0, invalid count = 0, mismatch count = 0 (except CIDR type)
  const hasMismatchError = validationResult !== null && 
    validationResult.mismatchedCount > 0 && 
    targetType !== 'cidr'  // CIDR type cannot be validated on frontend, don't block submission
  
  const isFormValid =
    inputText.trim().length > 0 &&
    validationResult !== null &&
    validationResult.validCount > 0 &&
    validationResult.invalidCount === 0 &&
    !hasMismatchError

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Bulk Add
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <span>{labels.title}</span>
          </DialogTitle>
          <DialogDescription>
            {labels.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="urls">
                URL List <span className="text-destructive">*</span>
              </Label>
              <div className="flex border rounded-md overflow-hidden h-[220px]">
                {/* Line number column */}
                <div className="flex-shrink-0 w-12 border-r bg-muted/50">
                  <div
                    ref={lineNumbersRef}
                    className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.4] h-full overflow-y-auto scrollbar-hide"
                  >
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i + 1} className="h-[20px]">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Input box */}
                <div className="flex-1 overflow-hidden">
                  <Textarea
                    ref={textareaRef}
                    id="urls"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={labels.placeholder}
                    disabled={mutation.isPending}
                    className="font-mono h-full overflow-y-auto resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.4] text-sm py-3"
                    style={{ lineHeight: "20px" }}
                  />
                </div>
              </div>

              {/* Validation summary */}
              {validationResult && (
                <div className="text-xs space-y-1">
                  <div className="text-muted-foreground">
                    Valid: {validationResult.validCount} items
                    {validationResult.duplicateCount > 0 && (
                      <span className="text-yellow-600 ml-2">
                        Duplicate: {validationResult.duplicateCount} items
                      </span>
                    )}
                    {validationResult.invalidCount > 0 && (
                      <span className="text-destructive ml-2">
                        Invalid: {validationResult.invalidCount} items
                      </span>
                    )}
                    {validationResult.mismatchedCount > 0 && (
                      <span className="text-destructive ml-2">
                        Mismatched: {validationResult.mismatchedCount} items
                      </span>
                    )}
                  </div>
                  {validationResult.firstError && (
                    <div className="text-destructive">
                      Line {validationResult.firstError.index + 1}: &quot;
                      {validationResult.firstError.url.length > 50 
                        ? validationResult.firstError.url.substring(0, 50) + '...'
                        : validationResult.firstError.url}&quot; -{" "}
                      {validationResult.firstError.error}
                    </div>
                  )}
                  {validationResult.firstMismatch && !validationResult.firstError && (
                    <div className="text-destructive">
                      Line {validationResult.firstMismatch.index + 1}: &quot;
                      {validationResult.firstMismatch.url.length > 50 
                        ? validationResult.firstMismatch.url.substring(0, 50) + '...'
                        : validationResult.firstMismatch.url}&quot; - 
                      URL does not belong to target {targetName}, please remove before submitting
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !isFormValid}
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Bulk Add
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
