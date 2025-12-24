"use client"

import React, { useState, useRef } from "react"
import { Plus, Globe, Loader2 } from "lucide-react"

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
import { SubdomainValidator } from "@/lib/subdomain-validator"
import { useBulkCreateSubdomains } from "@/hooks/use-subdomains"

interface BulkAddSubdomainsDialogProps {
  targetId: number
  targetName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * 批量添加子域名弹窗组件
 * 
 * 参考 AddTargetDialog 的设计模式，提供带行号的文本输入框，
 * 支持实时验证和错误提示。
 */
export function BulkAddSubdomainsDialog({
  targetId,
  targetName,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
}: BulkAddSubdomainsDialogProps) {
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
    firstError?: { index: number; subdomain: string; error: string }
  } | null>(null)

  // 行号列和输入框的 ref（用于同步滚动）
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 使用批量创建 mutation
  const bulkCreateSubdomains = useBulkCreateSubdomains()

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setInputText(value)

    // 解析并验证
    const parsed = SubdomainValidator.parse(value)
    if (parsed.length === 0) {
      setValidationResult(null)
      return
    }

    const result = SubdomainValidator.validateBatch(parsed)
    setValidationResult({
      validCount: result.validCount,
      invalidCount: result.invalidCount,
      duplicateCount: result.duplicateCount,
      firstError: result.invalidItems[0]
        ? {
            index: result.invalidItems[0].index,
            subdomain: result.invalidItems[0].subdomain,
            error: result.invalidItems[0].error || "格式无效",
          }
        : undefined,
    })
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputText.trim()) return
    if (!validationResult || validationResult.validCount === 0) return

    // 解析有效的子域名
    const parsed = SubdomainValidator.parse(inputText)
    const result = SubdomainValidator.validateBatch(parsed)

    bulkCreateSubdomains.mutate(
      { targetId, subdomains: result.subdomains },
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
    if (!bulkCreateSubdomains.isPending) {
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

  // 表单验证
  const isFormValid =
    inputText.trim().length > 0 &&
    validationResult !== null &&
    validationResult.validCount > 0

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
            <Globe className="h-5 w-5" />
            <span>批量添加子域名</span>
          </DialogTitle>
          <DialogDescription>
            输入子域名列表，支持换行、逗号或空格分隔。
            {targetName && (
              <span className="block mt-1">
                子域名必须属于 <code className="bg-muted px-1 rounded">{targetName}</code>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subdomains">
                子域名列表 <span className="text-destructive">*</span>
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
                    id="subdomains"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={`请输入子域名，每行一个
支持换行、逗号、空格分隔
例如：
api.example.com
www.example.com
mail.example.com`}
                    disabled={bulkCreateSubdomains.isPending}
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
                  </div>
                  {validationResult.firstError && (
                    <div className="text-destructive">
                      第 {validationResult.firstError.index + 1} 行: &quot;
                      {validationResult.firstError.subdomain}&quot; -{" "}
                      {validationResult.firstError.error}
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
              disabled={bulkCreateSubdomains.isPending}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={bulkCreateSubdomains.isPending || !isFormValid}
            >
              {bulkCreateSubdomains.isPending ? (
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
