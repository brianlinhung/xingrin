"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Building2, AlertTriangle } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { TargetsDataTable } from "./targets/targets-data-table"
import { createTargetColumns } from "./targets/targets-columns"
import { AddTargetDialog } from "./targets/add-target-dialog"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getDateLocale } from "@/lib/date-utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useOrganization, useOrganizationTargets, useUnlinkTargetsFromOrganization } from "@/hooks/use-organizations"
import type { Target } from "@/types/target.types"
import { toast } from "sonner"

/**
 * Organization detail view component
 * Displays organization statistics and target list
 */
export function OrganizationDetailView({
  organizationId
}: {
  organizationId: string
}) {
  const [selectedTargets, setSelectedTargets] = useState<Target[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [targetToDelete, setTargetToDelete] = useState<Target | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tTooltips = useTranslations("tooltips")
  const tTarget = useTranslations("target")
  const tConfirm = useTranslations("common.confirm")
  const tOrg = useTranslations("organization")
  const locale = useLocale()

  // Build translation object
  const translations = useMemo(() => ({
    columns: {
      targetName: tColumns("target.target"),
      type: tColumns("common.type"),
    },
    actions: {
      selectAll: tCommon("actions.selectAll"),
      selectRow: tCommon("actions.selectRow"),
    },
    tooltips: {
      viewDetails: tTooltips("viewDetails"),
      unlinkTarget: tTooltips("unlinkTarget"),
      clickToCopy: tTooltips("clickToCopy"),
      copied: tTooltips("copied"),
    },
    types: {
      domain: tTarget("types.domain"),
      ip: tTarget("types.ip"),
      cidr: tTarget("types.cidr"),
    },
  }), [tColumns, tCommon, tTooltips, tTarget])

  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  // Use unlink targets mutation
  const unlinkTargets = useUnlinkTargetsFromOrganization()

  // Use React Query to get organization basic info
  const {
    data: organization,
    isLoading: isLoadingOrg,
    error: orgError,
  } = useOrganization(parseInt(organizationId))

  // Use React Query to get organization's target list
  const {
    data: targetsData,
    isLoading: isLoadingTargets,
    isFetching: isFetchingTargets,
    error: targetsError,
    refetch
  } = useOrganizationTargets(
    parseInt(organizationId),
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
    }
  )

  // Reset search state when request completes
  React.useEffect(() => {
    if (!isFetchingTargets && isSearching) {
      setIsSearching(false)
    }
  }, [isFetchingTargets, isSearching])

  const isLoading = isLoadingOrg || isLoadingTargets
  const error = orgError || targetsError

  // Helper function - format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString(getDateLocale(locale), {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // Navigation function
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // Handle unlink target
  const handleDeleteTarget = (target: Target) => {
    setTargetToDelete(target)
    setDeleteDialogOpen(true)
  }

  // Confirm unlink target
  const confirmDelete = async () => {
    if (!targetToDelete) return

    setDeleteDialogOpen(false)
    const targetId = targetToDelete.id
    setTargetToDelete(null)

    // Call unlink API
    unlinkTargets.mutate({
      organizationId: parseInt(organizationId),
      targetIds: [targetId]
    })
  }

  // Handle bulk unlink
  const handleBulkDelete = () => {
    if (selectedTargets.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // Confirm bulk unlink
  const confirmBulkDelete = async () => {
    if (selectedTargets.length === 0) return

    const targetIds = selectedTargets.map(target => target.id)

    setBulkDeleteDialogOpen(false)
    setSelectedTargets([])

    // Call bulk unlink API
    unlinkTargets.mutate({
      organizationId: parseInt(organizationId),
      targetIds
    })
  }

  // Handle add target
  const handleAddTarget = () => {
    setIsAddDialogOpen(true)
  }

  // Handle add success
  const handleAddSuccess = () => {
    setIsAddDialogOpen(false)
    refetch()
  }

  // Handle pagination change
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
    setSelectedTargets([])
  }

  // Create column definitions
  const targetColumns = useMemo(
    () =>
      createTargetColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteTarget,
        t: translations,
      }),
    [formatDate, navigate, handleDeleteTarget, translations]
  )

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tCommon("status.loadFailed")}</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || tCommon("status.loadError")}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {tCommon("actions.reload")}
        </button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {/* Page header skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Table skeleton */}
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="mx-auto text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-lg font-semibold mb-2">{tOrg("notFound")}</h3>
        <p className="text-muted-foreground">{tOrg("notFoundDesc", { id: organizationId })}</p>
      </div>
    )
  }

  // Calculate statistics
  const stats = {
    totalTargets: targetsData?.total || 0,
  }

  return (
    <>
      {/* Page header - simplified version */}
      <div className="px-4 lg:px-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {organization.name}
            </h2>
            <p className="text-muted-foreground">
              {organization.description || tOrg("noDescription")}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
              <span>{tOrg("createdAt", { date: formatDate(organization.createdAt) })}</span>
              <span>·</span>
              <span>{tOrg("targetCountLabel", { count: stats.totalTargets })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target list */}
      <div className="px-4 lg:px-6">
        <TargetsDataTable
          data={targetsData?.results || []}
          columns={targetColumns}
          onAddNew={handleAddTarget}
          onBulkDelete={handleBulkDelete}
          onSelectionChange={setSelectedTargets}
          searchPlaceholder={tColumns("target.target")}
          searchValue={searchQuery}
          onSearch={handleSearchChange}
          isSearching={isSearching}
          addButtonText={tCommon("actions.add")}
          pagination={pagination}
          setPagination={setPagination}
          paginationInfo={targetsData ? {
            total: targetsData.total,
            page: targetsData.page,
            pageSize: targetsData.pageSize,
            totalPages: targetsData.totalPages,
          } : undefined}
          onPaginationChange={handlePaginationChange}
        />
      </div>

      {/* Add target dialog */}
      <AddTargetDialog
        organizationId={parseInt(organizationId)}
        organizationName={organization.name}
        onAdd={handleAddSuccess}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Unlink confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("unlinkTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("unlinkTargetMessage", { name: targetToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tConfirm("confirmUnlink")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk unlink confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("bulkUnlinkTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("bulkUnlinkTargetMessage", { count: selectedTargets.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedTargets.map((target) => (
                <li key={target.id} className="flex items-center">
                  <span className="font-medium">{target.name}</span>
                  {target.description && (
                    <span className="text-muted-foreground ml-2">- {target.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tConfirm("confirmUnlinkCount", { count: selectedTargets.length })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
