"use client"

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { SubdomainService } from "@/services/subdomain.service"
import { OrganizationService } from "@/services/organization.service"
import type { Subdomain, GetSubdomainsResponse, GetAllSubdomainsParams } from "@/types/subdomain.types"
import type { PaginationParams } from "@/types/common.types"

// Query Keys
export const subdomainKeys = {
  all: ['subdomains'] as const,
  lists: () => [...subdomainKeys.all, 'list'] as const,
  list: (params: PaginationParams & { organizationId?: string }) => 
    [...subdomainKeys.lists(), params] as const,
  details: () => [...subdomainKeys.all, 'detail'] as const,
  detail: (id: number) => [...subdomainKeys.details(), id] as const,
}

// 获取单个子域名详情
export function useSubdomain(id: number) {
  return useQuery({
    queryKey: subdomainKeys.detail(id),
    queryFn: () => SubdomainService.getSubdomainById(id),
    enabled: !!id,
  })
}

// 获取组织的子域名列表
export function useOrganizationSubdomains(
  organizationId: number,
  params?: { page?: number; pageSize?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['organizations', 'detail', organizationId, 'subdomains', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => SubdomainService.getSubdomainsByOrgId(organizationId, {
      page: params?.page || 1,
      pageSize: params?.pageSize || 10,
    }),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    select: (response) => ({
      domains: response.domains || [],
      pagination: {
        total: response.total || 0,
        page: response.page || 1,
        pageSize: response.pageSize || 10,
        totalPages: response.totalPages || 0,
      }
    }),
  })
}

// 创建子域名（绑定到资产）
export function useCreateSubdomain() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: { domains: Array<{ name: string }>; assetId: number }) =>
      SubdomainService.createSubdomains(data),
    onMutate: async () => {
      toastMessages.loading('common.status.creating', {}, 'create-subdomain')
    },
    onSuccess: (response) => {
      toastMessages.dismiss('create-subdomain')
      const { createdCount, existedCount, skippedCount = 0 } = response
      if (skippedCount > 0 || existedCount > 0) {
        toastMessages.warning('toast.asset.subdomain.create.partialSuccess', { 
          success: createdCount, 
          skipped: (existedCount || 0) + (skippedCount || 0) 
        })
      } else {
        toastMessages.success('toast.asset.subdomain.create.success', { count: createdCount })
      }
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('create-subdomain')
      console.error('Failed to create subdomain:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.subdomain.create.error')
    },
  })
}

// 从组织中移除子域名
export function useDeleteSubdomainFromOrganization() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: { organizationId: number; targetId: number }) =>
      OrganizationService.unlinkTargetsFromOrganization({
        organizationId: data.organizationId,
        targetIds: [data.targetId],
      }),
    onMutate: ({ organizationId, targetId }) => {
      toastMessages.loading('common.status.removing', {}, `delete-${organizationId}-${targetId}`)
    },
    onSuccess: (_response, { organizationId, targetId }) => {
      toastMessages.dismiss(`delete-${organizationId}-${targetId}`)
      toastMessages.success('toast.asset.subdomain.delete.success')
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId, targetId }) => {
      toastMessages.dismiss(`delete-${organizationId}-${targetId}`)
      console.error('Failed to remove subdomain:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.subdomain.delete.error')
    },
  })
}

// 批量从组织中移除子域名
export function useBatchDeleteSubdomainsFromOrganization() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainIds: number[] }) => 
      SubdomainService.batchDeleteSubdomainsFromOrganization(data),
    onMutate: ({ organizationId }) => {
      toastMessages.loading('common.status.batchRemoving', {}, `batch-delete-${organizationId}`)
    },
    onSuccess: (response, { organizationId }) => {
      toastMessages.dismiss(`batch-delete-${organizationId}`)
      const successCount = response.successCount || 0
      toastMessages.success('toast.asset.subdomain.delete.bulkSuccess', { count: successCount })
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId }) => {
      toastMessages.dismiss(`batch-delete-${organizationId}`)
      console.error('Failed to batch remove subdomains:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.subdomain.delete.error')
    },
  })
}

// 删除单个子域名（使用单独的 DELETE API）
export function useDeleteSubdomain() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => SubdomainService.deleteSubdomain(id),
    onMutate: (id) => {
      toastMessages.loading('common.status.deleting', {}, `delete-subdomain-${id}`)
    },
    onSuccess: (response, id) => {
      toastMessages.dismiss(`delete-subdomain-${id}`)
      toastMessages.success('toast.asset.subdomain.delete.success')
      
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['scans'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, id) => {
      toastMessages.dismiss(`delete-subdomain-${id}`)
      console.error('Failed to delete subdomain:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.subdomain.delete.error')
    },
  })
}

// 批量删除子域名（使用统一的批量删除接口）
export function useBatchDeleteSubdomains() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (ids: number[]) => SubdomainService.batchDeleteSubdomains(ids),
    onMutate: () => {
      toastMessages.loading('common.status.batchDeleting', {}, 'batch-delete-subdomains')
    },
    onSuccess: (response) => {
      toastMessages.dismiss('batch-delete-subdomains')
      toastMessages.success('toast.asset.subdomain.delete.bulkSuccess', { count: response.deletedCount })
      
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['scans'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('batch-delete-subdomains')
      console.error('Failed to batch delete subdomains:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.subdomain.delete.error')
    },
  })
}

// 更新子域名
export function useUpdateSubdomain() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
      SubdomainService.updateSubdomain({ id, ...data }),
    onMutate: ({ id }) => {
      toastMessages.loading('common.status.updating', {}, `update-subdomain-${id}`)
    },
    onSuccess: (_response, { id }) => {
      toastMessages.dismiss(`update-subdomain-${id}`)
      toastMessages.success('common.status.updateSuccess')
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { id }) => {
      toastMessages.dismiss(`update-subdomain-${id}`)
      console.error('Failed to update subdomain:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'common.status.updateFailed')
    },
  })
}

// 获取所有子域名列表
export function useAllSubdomains(
  params: GetAllSubdomainsParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['subdomains', 'all', { page: params.page, pageSize: params.pageSize }],
    queryFn: () => SubdomainService.getAllSubdomains(params),
    select: (response) => ({
      domains: response.domains || [],
      pagination: {
        total: response.total || 0,
        page: response.page || 1,
        pageSize: response.pageSize || 10,
        totalPages: response.totalPages || 0,
      }
    }),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  })
}

// 获取目标的子域名列表
export function useTargetSubdomains(
  targetId: number,
  params?: { page?: number; pageSize?: number; filter?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['targets', targetId, 'subdomains', { page: params?.page, pageSize: params?.pageSize, filter: params?.filter }],
    queryFn: () => SubdomainService.getSubdomainsByTargetId(targetId, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!targetId,
    placeholderData: keepPreviousData,
  })
}

// 获取扫描的子域名列表
export function useScanSubdomains(
  scanId: number,
  params?: { page?: number; pageSize?: number; filter?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['scans', scanId, 'subdomains', { page: params?.page, pageSize: params?.pageSize, filter: params?.filter }],
    queryFn: () => SubdomainService.getSubdomainsByScanId(scanId, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!scanId,
    placeholderData: keepPreviousData,
  })
}

// 批量创建子域名（绑定到目标）
export function useBulkCreateSubdomains() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: { targetId: number; subdomains: string[] }) =>
      SubdomainService.bulkCreateSubdomains(data.targetId, data.subdomains),
    onMutate: async () => {
      toastMessages.loading('common.status.batchCreating', {}, 'bulk-create-subdomains')
    },
    onSuccess: (response, { targetId }) => {
      toastMessages.dismiss('bulk-create-subdomains')
      const { createdCount, skippedCount = 0, invalidCount = 0, mismatchedCount = 0 } = response
      const totalSkipped = skippedCount + invalidCount + mismatchedCount
      
      if (totalSkipped > 0) {
        toastMessages.warning('toast.asset.subdomain.create.partialSuccess', { 
          success: createdCount, 
          skipped: totalSkipped 
        })
      } else if (createdCount > 0) {
        toastMessages.success('toast.asset.subdomain.create.success', { count: createdCount })
      } else {
        toastMessages.warning('toast.asset.subdomain.create.partialSuccess', { 
          success: 0, 
          skipped: 0 
        })
      }
      
      queryClient.invalidateQueries({ queryKey: ['targets', targetId, 'subdomains'] })
      queryClient.invalidateQueries({ queryKey: ['subdomains'] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('bulk-create-subdomains')
      console.error('Failed to bulk create subdomains:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.subdomain.create.error')
    },
  })
}
