"use client"

import { useTranslations } from "next-intl"
import { IconRadar } from "@tabler/icons-react"
import { ScanHistoryList } from "@/components/scan/history/scan-history-list"
import { ScanHistoryStatCards } from "@/components/scan/history/scan-history-stat-cards"

/**
 * Scan history page
 * Displays historical records of all scan tasks
 */
export default function ScanHistoryPage() {
  const t = useTranslations("scan.history")

  return (
    <div className="@container/main flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Page title */}
      <div className="flex items-center gap-3 px-4 lg:px-6">
        <IconRadar className="size-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Statistics cards */}
      <div className="px-4 lg:px-6">
        <ScanHistoryStatCards />
      </div>

      {/* Scan history list */}
      <div className="px-4 lg:px-6">
        <ScanHistoryList />
      </div>
    </div>
  )
}
