"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { VulnerabilitiesDetailView } from "@/components/vulnerabilities"

/**
 * All vulnerabilities page
 * Displays all vulnerabilities in the system
 */
export default function VulnerabilitiesPage() {
  const t = useTranslations("vulnerabilities")

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Vulnerability list */}
      <div className="px-4 lg:px-6">
        <VulnerabilitiesDetailView />
      </div>
    </div>
  )
}
