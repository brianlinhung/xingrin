"use client"

// Import organization management component
import { OrganizationList } from "@/components/organization/organization-list"
// Import icons
import { Building2 } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * Organization management page
 * Sub-page under asset management that displays organization list and related operations
 */
export default function OrganizationPage() {
  const t = useTranslations("pages.organization")

  return (
    // Content area containing organization management features
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 />
            {t("title")}
          </h2>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      {/* Organization list component */}
      <div className="px-4 lg:px-6">
        <OrganizationList />
      </div>
    </div>
  )
}
