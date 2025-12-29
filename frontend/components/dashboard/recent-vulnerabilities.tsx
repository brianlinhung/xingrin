"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { VulnerabilityService } from "@/services/vulnerability.service"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { IconExternalLink } from "@tabler/icons-react"
import type { VulnerabilitySeverity } from "@/types/vulnerability.types"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"

// Unified vulnerability severity color configuration (consistent with charts)
const severityStyles: Record<VulnerabilitySeverity, string> = {
  critical: "bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20 dark:text-[#f85149]",
  high: "bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20",
  medium: "bg-[#d4a72c]/10 text-[#d4a72c] border border-[#d4a72c]/20",
  low: "bg-[#238636]/10 text-[#238636] border border-[#238636]/20 dark:text-[#3fb950]",
  info: "bg-[#848d97]/10 text-[#848d97] border border-[#848d97]/20",
}

export function RecentVulnerabilities() {
  const router = useRouter()
  const t = useTranslations("dashboard.recentVulns")
  const tSeverity = useTranslations("severity")
  const tColumns = useTranslations("columns")
  const locale = useLocale()
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const severityConfig = useMemo(() => ({
    critical: { label: tSeverity("critical"), className: severityStyles.critical },
    high: { label: tSeverity("high"), className: severityStyles.high },
    medium: { label: tSeverity("medium"), className: severityStyles.medium },
    low: { label: tSeverity("low"), className: severityStyles.low },
    info: { label: tSeverity("info"), className: severityStyles.info },
  }), [tSeverity])

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "recent-vulnerabilities"],
    queryFn: () => VulnerabilityService.getAllVulnerabilities({ page: 1, pageSize: 5 }),
  })

  const vulnerabilities = data?.results ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <Link 
          href="/vulnerabilities/" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {t("viewAll")}
          <IconExternalLink className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : vulnerabilities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {t("noData")}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tColumns("common.status")}</TableHead>
                  <TableHead>{tColumns("vulnerability.source")}</TableHead>
                  <TableHead>{tColumns("common.type")}</TableHead>
                  <TableHead>{tColumns("common.url")}</TableHead>
                  <TableHead>{tColumns("common.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vulnerabilities.map((vuln: any) => (
                  <TableRow 
                    key={vuln.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/vulnerabilities/?id=${vuln.id}`)}
                  >
                    <TableCell>
                      <Badge className={severityConfig[vuln.severity as VulnerabilitySeverity]?.className}>
                        {severityConfig[vuln.severity as VulnerabilitySeverity]?.label ?? vuln.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{vuln.source}</Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] truncate">
                      {vuln.vulnType}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                      {vuln.url}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatTime(vuln.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
