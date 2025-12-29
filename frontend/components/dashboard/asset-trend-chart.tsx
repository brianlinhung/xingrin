"use client"

import { useState, useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { useStatisticsHistory } from "@/hooks/use-dashboard"
import type { StatisticsHistoryItem } from "@/types/dashboard.types"
import { useTranslations } from "next-intl"

/**
 * Fill missing date data, ensure always returning complete days
 * Based on the earliest record date, fill backwards, missing dates filled with 0
 */
function fillMissingDates(data: StatisticsHistoryItem[] | undefined, days: number): StatisticsHistoryItem[] {
  if (!data || data.length === 0) return []
  
  // Build mapping from date to data
  const dataMap = new Map(data.map(item => [item.date, item]))
  
  // Find the earliest date
  const earliestDate = new Date(data[0].date)
  
  // Generate complete date list (starting from days-1 days before earliest date)
  const result: StatisticsHistoryItem[] = []
  const startDate = new Date(earliestDate)
  startDate.setDate(startDate.getDate() - (days - data.length))
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    const dateStr = currentDate.toISOString().split('T')[0]
    
    const existing = dataMap.get(dateStr)
    if (existing) {
      result.push(existing)
    } else {
      // Fill missing dates with 0
      result.push({
        date: dateStr,
        totalTargets: 0,
        totalSubdomains: 0,
        totalIps: 0,
        totalEndpoints: 0,
        totalWebsites: 0,
        totalVulns: 0,
        totalAssets: 0,
      })
    }
  }
  
  return result
}
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

// Data series key type
type SeriesKey = 'totalSubdomains' | 'totalIps' | 'totalEndpoints' | 'totalWebsites'

// All series
const ALL_SERIES: SeriesKey[] = ['totalSubdomains', 'totalIps', 'totalEndpoints', 'totalWebsites']

export function AssetTrendChart() {
  const { data: rawData, isLoading } = useStatisticsHistory(7)
  const [activeData, setActiveData] = useState<StatisticsHistoryItem | null>(null)
  const t = useTranslations("dashboard.assetTrend")
  
  // Dynamically configure chartConfig using translations
  const chartConfig = useMemo(() => ({
    totalSubdomains: {
      label: t("subdomains"),
      color: "#3b82f6", // Blue
    },
    totalIps: {
      label: t("ips"),
      color: "#f97316", // Orange
    },
    totalEndpoints: {
      label: t("endpoints"),
      color: "#eab308", // Yellow
    },
    totalWebsites: {
      label: t("websites"),
      color: "#22c55e", // Green
    },
  } satisfies ChartConfig), [t])
  
  // Visible series state (show all by default)
  const [visibleSeries, setVisibleSeries] = useState<Set<SeriesKey>>(new Set(ALL_SERIES))
  
  // Currently hovered line
  const [hoveredLine, setHoveredLine] = useState<SeriesKey | null>(null)
  
  // Toggle series visibility
  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Keep at least one visible
        if (next.size > 1) {
          next.delete(key)
        }
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Fill missing dates, ensure always showing 7 days
  const data = useMemo(() => fillMissingDates(rawData, 7), [rawData])

  // Format date display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // Format large numbers (1K, 1M etc.)
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  // Get latest data (use latest value from raw data)
  const latest = rawData && rawData.length > 0 ? rawData[rawData.length - 1] : null
  
  // Display data: show hovered data when hovering, otherwise show latest data
  const displayData = activeData || latest

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[180px] w-full" />
          </div>
        ) : !rawData || rawData.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-muted-foreground">
            {t("noData")}
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="aspect-auto h-[160px] w-full">
              <LineChart
                accessibilityLayer
                data={data}
                margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state?.activePayload?.[0]?.payload) {
                    setActiveData(state.activePayload[0].payload)
                  }
                }}
                onMouseLeave={() => setActiveData(null)}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={45}
                  fontSize={12}
                  tickFormatter={formatNumber}
                />
                {visibleSeries.has('totalSubdomains') && (
                  <Line
                    dataKey="totalSubdomains"
                    type="monotone"
                    stroke="var(--color-totalSubdomains)"
                    strokeWidth={hoveredLine === 'totalSubdomains' ? 4 : 2}
                    dot={{ r: 3, fill: "var(--color-totalSubdomains)" }}
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                    onClick={() => toggleSeries('totalSubdomains')}
                    onMouseEnter={() => setHoveredLine('totalSubdomains')}
                    onMouseLeave={() => setHoveredLine(null)}
                  />
                )}
                {visibleSeries.has('totalIps') && (
                  <Line
                    dataKey="totalIps"
                    type="monotone"
                    stroke="var(--color-totalIps)"
                    strokeWidth={hoveredLine === 'totalIps' ? 4 : 2}
                    dot={{ r: 3, fill: "var(--color-totalIps)" }}
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                    onClick={() => toggleSeries('totalIps')}
                    onMouseEnter={() => setHoveredLine('totalIps')}
                    onMouseLeave={() => setHoveredLine(null)}
                  />
                )}
                {visibleSeries.has('totalEndpoints') && (
                  <Line
                    dataKey="totalEndpoints"
                    type="monotone"
                    stroke="var(--color-totalEndpoints)"
                    strokeWidth={hoveredLine === 'totalEndpoints' ? 4 : 2}
                    dot={{ r: 3, fill: "var(--color-totalEndpoints)" }}
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                    onClick={() => toggleSeries('totalEndpoints')}
                    onMouseEnter={() => setHoveredLine('totalEndpoints')}
                    onMouseLeave={() => setHoveredLine(null)}
                  />
                )}
                {visibleSeries.has('totalWebsites') && (
                  <Line
                    dataKey="totalWebsites"
                    type="monotone"
                    stroke="var(--color-totalWebsites)"
                    strokeWidth={hoveredLine === 'totalWebsites' ? 4 : 2}
                    dot={{ r: 3, fill: "var(--color-totalWebsites)" }}
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                    onClick={() => toggleSeries('totalWebsites')}
                    onMouseEnter={() => setHoveredLine('totalWebsites')}
                    onMouseLeave={() => setHoveredLine(null)}
                  />
                )}
              </LineChart>
            </ChartContainer>
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-sm">
              <span className="text-muted-foreground text-xs">
                {activeData ? formatDate(activeData.date) : t("current")}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSeries('totalSubdomains')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-muted ${
                    !visibleSeries.has('totalSubdomains') ? 'opacity-40' : ''
                  }`}
                >
                  <div 
                    className={`h-2.5 w-2.5 rounded-full ${!visibleSeries.has('totalSubdomains') ? 'bg-muted-foreground' : ''}`} 
                    style={{ backgroundColor: visibleSeries.has('totalSubdomains') ? "#3b82f6" : undefined }} 
                  />
                  <span className={`text-muted-foreground ${!visibleSeries.has('totalSubdomains') ? 'line-through' : ''}`}>{t("subdomains")}</span>
                  <span className="font-medium">{displayData?.totalSubdomains ?? 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeries('totalIps')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-muted ${
                    !visibleSeries.has('totalIps') ? 'opacity-40' : ''
                  }`}
                >
                  <div 
                    className={`h-2.5 w-2.5 rounded-full ${!visibleSeries.has('totalIps') ? 'bg-muted-foreground' : ''}`} 
                    style={{ backgroundColor: visibleSeries.has('totalIps') ? "#f97316" : undefined }} 
                  />
                  <span className={`text-muted-foreground ${!visibleSeries.has('totalIps') ? 'line-through' : ''}`}>{t("ips")}</span>
                  <span className="font-medium">{displayData?.totalIps ?? 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeries('totalEndpoints')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-muted ${
                    !visibleSeries.has('totalEndpoints') ? 'opacity-40' : ''
                  }`}
                >
                  <div 
                    className={`h-2.5 w-2.5 rounded-full ${!visibleSeries.has('totalEndpoints') ? 'bg-muted-foreground' : ''}`} 
                    style={{ backgroundColor: visibleSeries.has('totalEndpoints') ? "#eab308" : undefined }} 
                  />
                  <span className={`text-muted-foreground ${!visibleSeries.has('totalEndpoints') ? 'line-through' : ''}`}>{t("endpoints")}</span>
                  <span className="font-medium">{displayData?.totalEndpoints ?? 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSeries('totalWebsites')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-muted ${
                    !visibleSeries.has('totalWebsites') ? 'opacity-40' : ''
                  }`}
                >
                  <div 
                    className={`h-2.5 w-2.5 rounded-full ${!visibleSeries.has('totalWebsites') ? 'bg-muted-foreground' : ''}`} 
                    style={{ backgroundColor: visibleSeries.has('totalWebsites') ? "#22c55e" : undefined }} 
                  />
                  <span className={`text-muted-foreground ${!visibleSeries.has('totalWebsites') ? 'line-through' : ''}`}>{t("websites")}</span>
                  <span className="font-medium">{displayData?.totalWebsites ?? 0}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
