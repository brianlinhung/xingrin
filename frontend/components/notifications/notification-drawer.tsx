"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Bell, AlertTriangle, Activity, Info, Server, BellOff, Wifi, WifiOff, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { transformBackendNotification, useNotificationSSE } from "@/hooks/use-notification-sse"
import { useMarkAllAsRead, useNotifications } from "@/hooks/use-notifications"
import type { Notification, NotificationType, NotificationSeverity } from "@/types/notification.types"

/**
 * Notification drawer component
 * A side panel that slides out from the right, displaying detailed notification information
 */

/** Connection status indicator */
function ConnectionStatus({ isConnected, t }: { isConnected: boolean, t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          isConnected ? "bg-emerald-500" : "bg-gray-400"
        )} />
      </span>
      <span className="text-xs text-muted-foreground">
        {isConnected ? t("status.realtime") : t("status.offline")}
      </span>
    </div>
  )
}

/** Notification skeleton screen */
function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-md border p-3">
          <div className="flex items-start gap-2.5">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Time grouping helper function */
function getTimeGroup(dateStr?: string): 'today' | 'yesterday' | 'earlier' {
  if (!dateStr) return 'earlier'
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  if (date >= today) return 'today'
  if (date >= yesterday) return 'yesterday'
  return 'earlier'
}

export function NotificationDrawer() {
  const t = useTranslations("notificationDrawer")
  const [open, setOpen] = React.useState(false)
  const [activeFilter, setActiveFilter] = React.useState<NotificationType | 'all'>('all')
  const queryParams = React.useMemo(() => ({ pageSize: 100 }), [])
  const { data: notificationResponse, isLoading: isHistoryLoading } = useNotifications(queryParams)
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllAsRead()

  // Filter tab configuration
  const filterTabs: { value: NotificationType | 'all'; label: string; icon?: React.ReactNode }[] = [
    { value: 'all', label: t("filters.all") },
    { value: 'scan', label: t("filters.scan"), icon: <Activity className="h-3 w-3" /> },
    { value: 'vulnerability', label: t("filters.vulnerability"), icon: <AlertTriangle className="h-3 w-3" /> },
    { value: 'asset', label: t("filters.asset"), icon: <Server className="h-3 w-3" /> },
    { value: 'system', label: t("filters.system"), icon: <Info className="h-3 w-3" /> },
  ]

  // Category title mapping
  const categoryTitleMap: Record<NotificationType, string> = {
    scan: t("categories.scan"),
    vulnerability: t("categories.vulnerability"),
    asset: t("categories.asset"),
    system: t("categories.system"),
  }

  // Time group labels
  const timeGroupLabels = {
    today: t("timeGroups.today"),
    yesterday: t("timeGroups.yesterday"),
    earlier: t("timeGroups.earlier"),
  }

  // SSE real-time notifications
  const { notifications: sseNotifications, isConnected, markNotificationsAsRead } = useNotificationSSE()

  const [historyNotifications, setHistoryNotifications] = React.useState<Notification[]>([])

  React.useEffect(() => {
    if (!notificationResponse?.results) return
    const backendNotifications = notificationResponse.results ?? []
    setHistoryNotifications(backendNotifications.map(transformBackendNotification))
  }, [notificationResponse])

  // Merge SSE and API notifications, SSE takes priority
  const allNotifications = React.useMemo(() => {
    const seen = new Set<number>()
    const merged: Notification[] = []

    for (const notification of sseNotifications) {
      if (!seen.has(notification.id)) {
        merged.push(notification)
        seen.add(notification.id)
      }
    }

    for (const notification of historyNotifications) {
      if (!seen.has(notification.id)) {
        merged.push(notification)
        seen.add(notification.id)
      }
    }

    return merged.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [historyNotifications, sseNotifications])

  // Unread notification count
  const unreadCount = allNotifications.filter(n => n.unread).length

  const unreadByType = React.useMemo<Record<NotificationType | 'all', number>>(() => {
    const counts: Record<NotificationType | 'all', number> = {
      all: 0,
      scan: 0,
      vulnerability: 0,
      asset: 0,
      system: 0,
    }

    allNotifications.forEach(notification => {
      if (!notification.unread) return
      counts.all += 1
      if (counts[notification.type] !== undefined) {
        counts[notification.type] += 1
      }
    })

    return counts
  }, [allNotifications])

  // Filtered notification list
  const filteredNotifications = React.useMemo(() => {
    if (activeFilter === 'all') return allNotifications
    return allNotifications.filter(n => n.type === activeFilter)
  }, [allNotifications, activeFilter])

  // Get notification icon
  const severityIconClassMap: Record<NotificationSeverity, string> = {
    critical: "text-[#da3633] dark:text-[#f85149]",
    high: "text-[#d29922]",
    medium: "text-[#d4a72c]",
    low: "text-[#848d97]",
  }

  const getNotificationIcon = (type: NotificationType, severity?: NotificationSeverity) => {
    const severityClass = severity ? severityIconClassMap[severity] : "text-gray-500"

    if (type === "vulnerability") {
      return <AlertTriangle className={cn("h-5 w-5", severityClass)} />
    }
    if (type === "scan") {
      return <Activity className={cn("h-5 w-5", severityClass)} />
    }
    if (type === "asset") {
      return <Server className={cn("h-5 w-5", severityClass)} />
    }
    return <Info className={cn("h-5 w-5", severityClass)} />
  }

  const severityCardClassMap: Record<NotificationSeverity, string> = {
    critical: "border-[#da3633]/30 bg-[#da3633]/5 hover:bg-[#da3633]/10 dark:border-[#f85149]/30 dark:bg-[#f85149]/5 dark:hover:bg-[#f85149]/10",
    high: "border-[#d29922]/30 bg-[#d29922]/5 hover:bg-[#d29922]/10 dark:border-[#d29922]/30 dark:bg-[#d29922]/5 dark:hover:bg-[#d29922]/10",
    medium: "border-[#d4a72c]/30 bg-[#d4a72c]/5 hover:bg-[#d4a72c]/10 dark:border-[#d4a72c]/30 dark:bg-[#d4a72c]/5 dark:hover:bg-[#d4a72c]/10",
    low: "border-[#848d97]/30 bg-[#848d97]/5 hover:bg-[#848d97]/10 dark:border-[#848d97]/30 dark:bg-[#848d97]/5 dark:hover:bg-[#848d97]/10",
  }

  const getNotificationCardClasses = (severity?: NotificationSeverity) => {
    if (!severity) {
      return "border-border bg-card hover:bg-accent/50"
    }
    return cn("border-border", severityCardClassMap[severity] ?? "")
  }

  const handleMarkAll = React.useCallback(() => {
    if (allNotifications.length === 0 || isMarkingAll) return
    markAllAsRead(undefined, {
      onSuccess: () => {
        // Update history notification status
        setHistoryNotifications(prev => prev.map(notification => ({ ...notification, unread: false })))
        // Update SSE real-time notification status
        markNotificationsAsRead()
      },
    })
  }, [allNotifications.length, isMarkingAll, markAllAsRead, markNotificationsAsRead])

  // Group notifications by time
  const groupedNotifications = React.useMemo(() => {
    const groups: Record<'today' | 'yesterday' | 'earlier', Notification[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    }
    
    filteredNotifications.forEach(notification => {
      const group = getTimeGroup(notification.createdAt)
      groups[group].push(notification)
    })
    
    return groups
  }, [filteredNotifications])

  // Render single notification card
  const renderNotificationCard = (notification: Notification) => (
    <div
      key={notification.id}
      className={cn(
        "group relative rounded-lg border p-3 transition-all duration-200 overflow-hidden",
        "hover:shadow-sm hover:scale-[1.01]",
        getNotificationCardClasses(notification.severity)
      )}
    >
      {notification.unread && (
        <span className="absolute right-2 bottom-2 h-2 w-2 rounded-full bg-primary" aria-hidden />
      )}
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 p-1.5 rounded-full shrink-0",
          notification.severity === 'critical' && "bg-[#da3633]/10 dark:bg-[#f85149]/10",
          notification.severity === 'high' && "bg-[#d29922]/10",
          notification.severity === 'medium' && "bg-[#d4a72c]/10",
          (!notification.severity || notification.severity === 'low') && "bg-muted"
        )}>
          {getNotificationIcon(notification.type, notification.severity)}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Category title + time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {categoryTitleMap[notification.type]}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {notification.time}
            </span>
          </div>
          {/* Notification title */}
          <p className="text-sm font-semibold leading-snug truncate">
            {notification.title}
          </p>
          {/* Notification description - supports line breaks */}
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-all line-clamp-4">
            {notification.description}
          </p>
        </div>
      </div>
    </div>
  )

  // Render notification list (with time grouping)
  const renderNotificationList = () => {
    const hasAny = filteredNotifications.length > 0
    
    if (!hasAny) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <BellOff className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">{t("empty")}</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {(['today', 'yesterday', 'earlier'] as const).map(group => {
          const items = groupedNotifications[group]
          if (items.length === 0) return null
          
          return (
            <div key={group}>
              <h3 className="sticky top-0 z-10 text-xs font-medium text-muted-foreground mb-2 px-1 py-1 backdrop-blur bg-background/90">
                {timeGroupLabels[group]}
              </h3>
              <div className="space-y-2">
                {items.map(renderNotificationCard)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive animate-ping opacity-75" />
              <Badge 
                variant="destructive" 
                className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          )}
          <span className="sr-only">{t("title")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[440px] p-0 flex flex-col gap-0">
        <SheetHeader className="border-b px-4 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-sm font-semibold">{t("title")}</SheetTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAll}
                disabled={isMarkingAll || allNotifications.length === 0}
                className="text-xs text-primary hover:text-primary/80 hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline transition-colors"
                title={t("markAllAsRead")}
              >
                {isMarkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("markAllRead")}
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Category filter tabs */}
        <div className="flex gap-1 px-3 py-1.5 border-b overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                activeFilter === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {unreadByType[tab.value] > 0 && (
                <span
                  className={cn(
                    "ml-1 h-1.5 w-1.5 rounded-full",
                    activeFilter === tab.value ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3">
            {isHistoryLoading && allNotifications.length === 0 ? (
              <NotificationSkeleton />
            ) : (
              renderNotificationList()
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
