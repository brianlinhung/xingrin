"use client"

import React, { useState, useRef } from "react"
import { Plus, Link } from "lucide-react"

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
  targetName?: string      // 目标名称（用于 URL 匹配校验）
  targetType?: TargetType  // 目标类型（domain/ip/cidr）
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

const ASSET_TYPE_LABELS: Record<AssetType, { title: string; description: string; placeholder: string }> = {
  endpoint: {
    title: '批量添加端点',
    description: '输入端点 URL 列表，每行一个。',
    placeholder: `请输入端点 URL，每行一个
例如：
https://example.com/api/v1
https://example.com/api/v2
https://example.com/login`,
  },
  website: {
    title: '批量添加网站',
    description: '输入网站 URL 列表，每行一个。',
    placeholder: `请输入网站 URL，每行一个
例如：
https://example.com
https://www.example.com
https://api.example.com`,
  },
  directory: {
    title: '批量添加目录',
    description: '输入目录 URL 列表，每行一个。',
    placeholder: `请输入目录 URL，每行一个
例如：
https://example.com/admin
https://example.com/api
https://example.com/uploads`,
  },
}

/**
 * 批量添加 URL 弹窗组件
 * 
 * 支持 Endpoints、Websites、Directories 三种资产类型。
 * 提供带行号的文本输入框，支持实时验证和错误提示。
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
  // 对话框开关状态
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  // 表单数据状态
  const [inputText, setInputText] = useState("")

  // 验证结果状态
  const [validationResult, setValidationResult] = useState<{
    validCount: number
    invalidCount: number
    duplicateCount: number
    mismatchedCount: number
    firstError?: { index: number; url: string; error: string }
    firstMismatch?: { index: number; url: string }
  } | null>(null)

  // 行号列和输入框的 ref（用于同步滚动）
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 使用批量创建 mutation
  const bulkCreateEndpoints = useBulkCreateEndpoints()
  const bulkCreateWebsites = useBulkCreateWebsites()
  const bulkCreateDirectories = useBulkCreateDirectories()

  // 根据资产类型选择对应的 mutation
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

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setInputText(value)

    // 解析并验证
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
            error: result.invalidItems[0].error || "格式无效",
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

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputText.trim()) return
    if (!validationResult || validationResult.validCount === 0) return

    // 解析有效的 URL
    const parsed = URLValidator.parse(inputText)
    const result = URLValidator.validateBatch(parsed)

    mutation.mutate(
      { targetId, urls: result.urls },
      {
        onSuccess: () => {
          // 重置表单
          setInputText("")
          setValidationResult(null)
          // 关闭对话框
          setOpen(false)
          // 调用外部回调
          onSuccess?.()
        },
      }
    )
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!mutation.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        setInputText("")
        setValidationResult(null)
      }
    }
  }

  // 同步滚动
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  // 计算行数
  const lineCount = Math.max(inputText.split("\n").length, 8)

  // 表单验证：有效数量 > 0，无效数量 = 0，不匹配数量 = 0（CIDR 类型除外）
  const hasMismatchError = validationResult !== null && 
    validationResult.mismatchedCount > 0 && 
    targetType !== 'cidr'  // CIDR 类型前端无法校验，不阻止提交
  
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
            批量添加
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
                URL 列表 <span className="text-destructive">*</span>
              </Label>
              <div className="flex border rounded-md overflow-hidden h-[220px]">
                {/* 行号列 */}
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
                {/* 输入框 */}
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

              {/* 验证摘要 */}
              {validationResult && (
                <div className="text-xs space-y-1">
                  <div className="text-muted-foreground">
                    有效: {validationResult.validCount} 个
                    {validationResult.duplicateCount > 0 && (
                      <span className="text-yellow-600 ml-2">
                        重复: {validationResult.duplicateCount} 个
                      </span>
                    )}
                    {validationResult.invalidCount > 0 && (
                      <span className="text-destructive ml-2">
                        无效: {validationResult.invalidCount} 个
                      </span>
                    )}
                    {validationResult.mismatchedCount > 0 && (
                      <span className="text-destructive ml-2">
                        不匹配: {validationResult.mismatchedCount} 个
                      </span>
                    )}
                  </div>
                  {validationResult.firstError && (
                    <div className="text-destructive">
                      第 {validationResult.firstError.index + 1} 行: &quot;
                      {validationResult.firstError.url.length > 50 
                        ? validationResult.firstError.url.substring(0, 50) + '...'
                        : validationResult.firstError.url}&quot; -{" "}
                      {validationResult.firstError.error}
                    </div>
                  )}
                  {validationResult.firstMismatch && !validationResult.firstError && (
                    <div className="text-destructive">
                      第 {validationResult.firstMismatch.index + 1} 行: &quot;
                      {validationResult.firstMismatch.url.length > 50 
                        ? validationResult.firstMismatch.url.substring(0, 50) + '...'
                        : validationResult.firstMismatch.url}&quot; - 
                      URL 不属于目标 {targetName}，请移除后再提交
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
              取消
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !isFormValid}
            >
              {mutation.isPending ? (
                <>
                  <LoadingSpinner />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  批量添加
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
