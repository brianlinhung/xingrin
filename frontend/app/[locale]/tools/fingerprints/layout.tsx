"use client"

import React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Fingerprint, HelpCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFingerprintStats } from "@/hooks/use-fingerprints"
import { useTranslations } from "next-intl"

// Fingerprint library description
const FINGERPRINT_HELP = `
• EHole: Red team key asset identification tool, supports keyword, favicon hash and other identification methods
• Goby: Attack surface mapping tool, contains a large number of web applications and device fingerprints
• Wappalyzer: Browser extension that can identify the technology stack used by websites
`.trim()

/**
 * Fingerprint management layout
 * Provides tab navigation to switch between different fingerprint libraries
 */
export default function FingerprintsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: stats, isLoading } = useFingerprintStats()
  const t = useTranslations("tools.fingerprints")

  // Get currently active tab
  const getActiveTab = () => {
    if (pathname.includes("/ehole")) return "ehole"
    if (pathname.includes("/goby")) return "goby"
    if (pathname.includes("/wappalyzer")) return "wappalyzer"
    return "ehole"
  }

  // Tab path mapping
  const basePath = "/tools/fingerprints"
  const tabPaths = {
    ehole: `${basePath}/ehole/`,
    goby: `${basePath}/goby/`,
    wappalyzer: `${basePath}/wappalyzer/`,
  }

  // Fingerprint library counts
  const counts = {
    ehole: stats?.ehole || 0,
    goby: stats?.goby || 0,
    wappalyzer: stats?.wappalyzer || 0,
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="px-4 lg:px-6">
          <Skeleton className="h-10 w-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Fingerprint className="h-6 w-6" />
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("pageDescription")}</p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Tabs value={getActiveTab()} className="w-full">
            <TabsList>
              <TabsTrigger value="ehole" asChild>
                <Link href={tabPaths.ehole} className="flex items-center gap-0.5">
                  EHole
                  {counts.ehole > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                      {counts.ehole}
                    </Badge>
                  )}
                </Link>
              </TabsTrigger>
              <TabsTrigger value="goby" asChild>
                <Link href={tabPaths.goby} className="flex items-center gap-0.5">
                  Goby
                  {counts.goby > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                      {counts.goby}
                    </Badge>
                  )}
                </Link>
              </TabsTrigger>
              <TabsTrigger value="wappalyzer" asChild>
                <Link href={tabPaths.wappalyzer} className="flex items-center gap-0.5">
                  Wappalyzer
                  {counts.wappalyzer > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                      {counts.wappalyzer}
                    </Badge>
                  )}
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm whitespace-pre-line">
                {FINGERPRINT_HELP}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Sub-page content */}
      {children}
    </div>
  )
}
