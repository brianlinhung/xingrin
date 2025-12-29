"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface ExpandableCellProps {
  /** Value to display */
  value: string | null | undefined
  /** Display variant */
  variant?: "text" | "url" | "mono" | "muted"
  /** Maximum display lines, default 3 */
  maxLines?: number
  /** Additional CSS class name */
  className?: string
  /** Placeholder when value is empty */
  placeholder?: string
  /** Expand button text */
  expandLabel?: string
  /** Collapse button text */
  collapseLabel?: string
}

/**
 * Unified expandable cell component
 * 
 * Features:
 * - Default display up to 3 lines (configurable)
 * - Auto-detect content overflow
 * - Show expand/collapse button only when content overflows
 * - Supports text, url, mono, muted variants
 */
export function ExpandableCell({
  value,
  variant = "text",
  maxLines = 3,
  className,
  placeholder = "-",
  expandLabel = "Expand",
  collapseLabel = "Collapse",
}: ExpandableCellProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [isOverflowing, setIsOverflowing] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Detect content overflow
  React.useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const checkOverflow = () => {
      // Compare scrollHeight and clientHeight to determine overflow
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1)
    }

    checkOverflow()

    // Listen for window size changes
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
 * URL-specific expandable cell
 */
export function ExpandableUrlCell(props: Omit<ExpandableCellProps, "variant">) {
  return <ExpandableCell {...props} variant="url" />
}

/**
 * Code/monospace font expandable cell
 */
export function ExpandableMonoCell(props: Omit<ExpandableCellProps, "variant">) {
  return <ExpandableCell {...props} variant="mono" />
}

// ============================================================================
// Badge list related components
// ============================================================================

export interface BadgeItem {
  id: number | string
  name: string
}

export interface ExpandableBadgeListProps {
  /** Badge item list */
  items: BadgeItem[] | null | undefined
  /** Default display count, default 2 */
  maxVisible?: number
  /** Badge variant */
  variant?: "default" | "secondary" | "outline" | "destructive"
  /** Placeholder when value is empty */
  placeholder?: string
  /** Additional CSS class name */
  className?: string
  /** Callback when Badge is clicked */
  onItemClick?: (item: BadgeItem) => void
}

/**
 * Expandable Badge list component
 * 
 * Features:
 * - Default display first N Badges (configurable)
 * - Show expand button when exceeding count
 * - Click expand button to show all Badges
 * - Show collapse button after expansion
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
              <span>Collapse</span>
            </>
          ) : (
            <>
              <span>Expand</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// String list related components
// ============================================================================

export interface ExpandableTagListProps {
  /** Tag list */
  items: string[] | null | undefined
  /** Default display count, default 3 */
  maxVisible?: number
  /** Badge variant */
  variant?: "default" | "secondary" | "outline" | "destructive"
  /** Placeholder when value is empty */
  placeholder?: string
  /** Additional CSS class name */
  className?: string
}

/**
 * Expandable tag list component (for string arrays)
 * 
 * Suitable for tech lists, tags lists and other scenarios
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
              <span>Collapse</span>
            </>
          ) : (
            <>
              <span>Expand</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
