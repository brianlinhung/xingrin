"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

/**
 * 可复制的 Popover 内容组件
 * 直接显示内容，右上角有复制按钮
 */
export function CopyablePopoverContent({ 
  value, 
  className = "" 
}: { 
  value: string
  className?: string 
}) {
  const [copied, setCopied] = React.useState(false)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("已复制")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }
  
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-1 -right-1 h-6 w-6 opacity-60 hover:opacity-100"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      <div className={`text-sm break-all pr-6 max-h-48 overflow-y-auto ${className}`}>
        {value}
      </div>
    </div>
  )
}
