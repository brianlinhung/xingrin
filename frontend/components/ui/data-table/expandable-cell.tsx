"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface ExpandableCellProps {
  /** 要显示的值 */
  value: string | null | undefined
  /** 显示变体 */
  variant?: "text" | "url" | "mono" | "muted"
  /** 最大显示行数，默认 3 */
  maxLines?: number
  /** 额外的 CSS 类名 */
  className?: string
  /** 空值时显示的占位符 */
  placeholder?: string
  /** 展开按钮文本 */
  expandLabel?: string
  /** 收起按钮文本 */
  collapseLabel?: string
}

/**
 * 统一的可展开单元格组件
 * 
 * 特性：
 * - 默认显示最多 3 行（可配置）
 * - 自动检测内容是否溢出
 * - 只在内容超出时显示展开/收起按钮
 * - 支持 text、url、mono、muted 四种变体
 */
export function ExpandableCell({
  value,
  variant = "text",
  maxLines = 3,
  className,
  placeholder = "-",
  expandLabel = "展开",
  collapseLabel = "收起",
}: ExpandableCellProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [isOverflowing, setIsOverflowing] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // 检测内容是否溢出
  React.useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const checkOverflow = () => {
      // 比较 scrollHeight 和 clientHeight 来判断是否溢出
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1)
    }

    checkOverflow()

    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(el)

    return () => resizeObserver.disconnect()
  }, [value, expanded])

  if (!value) {
    return <span className="text-muted-foreground text-sm">{placeholder}</span>
  }

  const lineClampClass = {
    1: "line-clamp-1",
    2: "line-clamp-2",
    3: "line-clamp-3",
    4: "line-clamp-4",
    5: "line-clamp-5",
    6: "line-clamp-6",
  }[maxLines] || "line-clamp-3"

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={contentRef}
        className={cn(
          "text-sm break-all leading-relaxed whitespace-normal",
          variant === "mono" && "font-mono text-xs text-muted-foreground",
          variant === "url" && "text-muted-foreground",
          variant === "muted" && "text-muted-foreground",
          !expanded && lineClampClass,
          className
        )}
      >
        {value}
      </div>
      {(isOverflowing || expanded) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-start"
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  )
}

/**
 * URL 专用的可展开单元格
 */
export function ExpandableUrlCell(props: Omit<ExpandableCellProps, "variant">) {
  return <ExpandableCell {...props} variant="url" />
}

/**
 * 代码/等宽字体的可展开单元格
 */
export function ExpandableMonoCell(props: Omit<ExpandableCellProps, "variant">) {
  return <ExpandableCell {...props} variant="mono" />
}

// ============================================================================
// Badge 列表相关组件
// ============================================================================

export interface BadgeItem {
  id: number | string
  name: string
}

export interface ExpandableBadgeListProps {
  /** Badge 项目列表 */
  items: BadgeItem[] | null | undefined
  /** 默认显示的数量，默认 2 */
  maxVisible?: number
  /** Badge 变体 */
  variant?: "default" | "secondary" | "outline" | "destructive"
  /** 空值时显示的占位符 */
  placeholder?: string
  /** 额外的 CSS 类名 */
  className?: string
  /** 点击 Badge 时的回调 */
  onItemClick?: (item: BadgeItem) => void
}

/**
 * 可展开的 Badge 列表组件
 * 
 * 特性：
 * - 默认显示前 N 个 Badge（可配置）
 * - 超过数量时显示展开按钮
 * - 点击展开按钮显示所有 Badge
 * - 展开后显示收起按钮
 */
export function ExpandableBadgeList({
  items,
  maxVisible = 2,
  variant = "secondary",
  placeholder = "-",
  className,
  onItemClick,
}: ExpandableBadgeListProps) {
  const [expanded, setExpanded] = React.useState(false)

  if (!items || items.length === 0) {
    return <span className="text-sm text-muted-foreground">{placeholder}</span>
  }

  const hasMore = items.length > maxVisible
  const displayItems = expanded ? items : items.slice(0, maxVisible)
  const remainingCount = items.length - maxVisible

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {displayItems.map((item) => (
        <Badge
          key={item.id}
          variant={variant}
          className={cn(
            "text-xs",
            onItemClick && "cursor-pointer hover:bg-accent"
          )}
          title={item.name}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
        >
          {item.name}
        </Badge>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>收起</span>
            </>
          ) : (
            <>
              <span>展开</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// 字符串列表相关组件
// ============================================================================

export interface ExpandableTagListProps {
  /** 标签列表 */
  items: string[] | null | undefined
  /** 默认显示的数量，默认 3 */
  maxVisible?: number
  /** Badge 变体 */
  variant?: "default" | "secondary" | "outline" | "destructive"
  /** 空值时显示的占位符 */
  placeholder?: string
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * 可展开的标签列表组件（用于字符串数组）
 * 
 * 适用于 tech 列表、tags 列表等场景
 */
export function ExpandableTagList({
  items,
  maxVisible = 3,
  variant = "outline",
  placeholder = "-",
  className,
}: ExpandableTagListProps) {
  const [expanded, setExpanded] = React.useState(false)

  if (!items || items.length === 0) {
    return <span className="text-sm text-muted-foreground">{placeholder}</span>
  }

  const hasMore = items.length > maxVisible
  const displayItems = expanded ? items : items.slice(0, maxVisible)
  const remainingCount = items.length - maxVisible

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {displayItems.map((item, index) => (
        <Badge
          key={`${item}-${index}`}
          variant={variant}
          className="text-xs"
          title={item}
        >
          {item}
        </Badge>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>收起</span>
            </>
          ) : (
            <>
              <span>展开</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
