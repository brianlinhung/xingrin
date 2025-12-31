import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { OrganizationService } from '@/services/organization.service'
import type { Organization, CreateOrganizationRequest, UpdateOrganizationRequest } from '@/types/organization.types'

// Query Keys - Unified query key management
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (params?: any) => [...organizationKeys.lists(), params] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: number) => [...organizationKeys.details(), id] as const,
}

/**
 * Hook for getting organization list
 * 
 * Features:
 * - Automatic loading state management
 * - Automatic error handling
 * - Pagination support
 * - Automatic caching and revalidation
 * - Conditional query support (enabled option)
 */
// Backend is fixed to sort by update time in descending order, does not support custom sorting
export function useOrganizations(
  params: {
    page?: number
    pageSize?: number
    search?: string
  } = {},
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['organizations', {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      search: params.search || undefined,
    }],
    queryFn: () => OrganizationService.getOrganizations(params || {}),
    select: (response) => {
      // Handle DRF pagination response format
      const page = params.page || 1
      const pageSize = params.pageSize || 10
      const total = response.total || response.count || 0
      const totalPages = Math.ceil(total / pageSize)
      
      return {
        organizations: response.results || [],
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        }
      }
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
    placeholderData: keepPreviousData,
  })
}

/**
 * Get single organization details Hook
 */
export function useOrganization(id: number) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => OrganizationService.getOrganizationById(id),
    enabled: !!id, // Only execute query when id exists
  })
}

/**
 * Get organization's target list Hook
 */
export function useOrganizationTargets(
  id: number,
  params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [...organizationKeys.detail(id), 'targets', params],
    queryFn: () => OrganizationService.getOrganizationTargets(id, params),
    enabled: options?.enabled !== undefined ? (options.enabled && !!id) : !!id,
    placeholderData: keepPreviousData,
  })
}

/**
 * Create organization Mutation Hook
 * 
 * Features:
 * - Automatic submission state management
 * - Automatic list refresh after success
 * - Automatic success/failure notifications
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => 
      OrganizationService.createOrganization(data),
    onMutate: () => {
      toastMessages.loading('common.status.creating', {}, 'create-organization')
    },
    onSuccess: () => {
      toastMessages.dismiss('create-organization')
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toastMessages.success('toast.organization.create.success')
    },
    onError: (error: any) => {
      toastMessages.dismiss('create-organization')
      console.error('Failed to create organization:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.organization.create.error')
    },
  })
}

/**
 * Update organization Mutation Hook
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOrganizationRequest }) =>
      OrganizationService.updateOrganization({ id, ...data }),
    onMutate: ({ id }) => {
      toastMessages.loading('common.status.updating', {}, `update-${id}`)
    },
    onSuccess: ({ id }) => {
      toastMessages.dismiss(`update-${id}`)
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toastMessages.success('toast.organization.update.success')
    },
    onError: (error: any, { id }) => {
      toastMessages.dismiss(`update-${id}`)
      console.error('Failed to update organization:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.organization.update.error')
    },
  })
}

/**
 * 删除组织的 Mutation Hook（乐观更新）
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => OrganizationService.deleteOrganization(id),
    onMutate: async (deletedId) => {
      toastMessages.loading('common.status.deleting', {}, `delete-${deletedId}`)
      
      await queryClient.cancelQueries({ queryKey: ['organizations'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['organizations'] })

      queryClient.setQueriesData(
        { queryKey: ['organizations'] },
        (old: any) => {
          if (old?.organizations) {
            return {
              ...old,
              organizations: old.organizations.filter((org: Organization) => org.id !== deletedId)
            }
          }
          return old
        }
      )

      return { previousData, deletedId }
    },
    onSuccess: (response, deletedId) => {
      toastMessages.dismiss(`delete-${deletedId}`)
      const { organizationName } = response
      toastMessages.success('toast.organization.delete.success', { name: organizationName })
    },
    onError: (error: any, deletedId, context) => {
      toastMessages.dismiss(`delete-${deletedId}`)
      
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      console.error('Failed to delete organization:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.organization.delete.error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['targets'] })
    },
  })
}

/**
 * 批量删除组织的 Mutation Hook（乐观更新）
 */
export function useBatchDeleteOrganizations() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (ids: number[]) => 
      OrganizationService.batchDeleteOrganizations(ids),
    onMutate: async (deletedIds) => {
      toastMessages.loading('common.status.batchDeleting', {}, 'batch-delete')
      
      await queryClient.cancelQueries({ queryKey: ['organizations'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['organizations'] })

      queryClient.setQueriesData(
        { queryKey: ['organizations'] },
        (old: any) => {
          if (old?.organizations) {
            return {
              ...old,
              organizations: old.organizations.filter(
                (org: Organization) => !deletedIds.includes(org.id)
              )
            }
          }
          return old
        }
      )

      return { previousData, deletedIds }
    },
    onSuccess: (response) => {
      toastMessages.dismiss('batch-delete')
      const { deletedCount } = response
      toastMessages.success('toast.organization.delete.bulkSuccess', { count: deletedCount })
    },
    onError: (error: any, deletedIds, context) => {
      toastMessages.dismiss('batch-delete')
      
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      console.error('Failed to batch delete organizations:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.organization.delete.error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['targets'] })
    },
  })
}



/**
 * 解除组织与目标关联的 Mutation Hook（批量）
 */
export function useUnlinkTargetsFromOrganization() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: { organizationId: number; targetIds: number[] }) => 
      OrganizationService.unlinkTargetsFromOrganization(data),
    onMutate: ({ organizationId }) => {
      toastMessages.loading('common.status.unlinking', {}, `unlink-${organizationId}`)
    },
    onSuccess: (response, { organizationId, targetIds }) => {
      toastMessages.dismiss(`unlink-${organizationId}`)
      toastMessages.success('toast.target.unlink.bulkSuccess', { count: targetIds.length })
      
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId }) => {
      toastMessages.dismiss(`unlink-${organizationId}`)
      console.error('Failed to unlink targets:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.target.unlink.error')
    },
  })
}
