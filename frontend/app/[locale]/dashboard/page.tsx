import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards"
import { AssetTrendChart } from "@/components/dashboard/asset-trend-chart"
import { VulnSeverityChart } from "@/components/dashboard/vuln-severity-chart"
import { DashboardDataTable } from "@/components/dashboard/dashboard-data-table"

/**
 * Dashboard page component
 * This is the main dashboard page of the application, containing cards, charts and data tables
 * Layout structure has been moved to the root layout component
 */
export default function Page() {
  return (
    // Content area containing cards, charts and data tables
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Top statistics cards */}
      <DashboardStatCards />

      {/* Chart area - Trend chart + Vulnerability distribution */}
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        {/* Asset trend line chart */}
        <AssetTrendChart />

        {/* Vulnerability severity distribution */}
        <VulnSeverityChart />
      </div>

      {/* Vulnerabilities / Scan history tab */}
      <div className="px-4 lg:px-6">
        <DashboardDataTable />
      </div>
    </div>
  )
}
