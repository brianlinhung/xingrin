import { Button } from "@/components/ui/button"
// Import separator component
import { Separator } from "@/components/ui/separator"
// Import sidebar trigger component
import { SidebarTrigger } from "@/components/ui/sidebar"
// Import notification drawer component
import { NotificationDrawer } from "@/components/notifications"
// Import color theme switcher component
import { ColorThemeSwitcher } from "@/components/color-theme-switcher"
// Import quick scan component
import { QuickScanDialog } from "@/components/scan/quick-scan-dialog"
// Import language switcher component
import { LanguageSwitcher } from "@/components/language-switcher"

/**
 * Site header component
 * Displayed at the top of the page, contains sidebar toggle button, page title and external links
 */
export function SiteHeader() {
  return (
    // header element, uses flex layout to arrange content horizontally
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      {/* Content container, takes full width */}
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar toggle button, with negative left margin for alignment */}
        <SidebarTrigger className="-ml-1" />

        {/* Right button area, using ml-auto to push to the right */}
        <div className="ml-auto flex items-center gap-2">
          {/* Quick scan button */}
          <QuickScanDialog />
          
          {/* Notification drawer button */}
          <NotificationDrawer />
          
          {/* Color theme switcher button */}
          <ColorThemeSwitcher />
          
          {/* Language switcher button */}
          <LanguageSwitcher />
          
          {/* GitHub link button, hidden on small screens */}
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/yyhuni/xingrin"
              rel="noopener noreferrer" // Security attribute, prevents new window from accessing original window
              target="_blank" // Open in new tab
              className="dark:text-foreground" // Text color in dark mode
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
