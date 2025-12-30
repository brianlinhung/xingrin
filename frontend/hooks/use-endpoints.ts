"use client"

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { EndpointService } from "@/services/endpoint.service"
import type { 
  Endpoint, 
  CreateEndpointRequest,
  UpdateEndpointRequest,
  GetEndpointsRequest,
  GetEndpointsResponse,
  BatchDeleteEndpointsRequest,
  BatchDeleteEndpointsResponse
} from "@/types/endpoint.types"

// Query Keys
export const endpointKeys = {
  all: ['endpoints'] as const,
  lists: () => [...endpointKeys.all, 'list'] as const,
  list: (params: GetEndpointsRequest) => 
    [...endpointKeys.lists(), params] as const,
  details: () => [...endpointKeys.all, 'detail'] as const,
  detail: (id: number) => [...endpointKeys.details(), id] as const,
  byTarget: (targetId: number, params: GetEndpointsRequest) => 
    [...endpointKeys.all, 'target', targetId, params] as const,
  bySubdomain: (subdomainId: number, params: GetEndpointsRequest) => 
    [...endpointKeys.all, 'subdomain', subdomainId, params] as const,
  byScan: (scanId: number, params: GetEndpointsRequest) =>
    [...endpointKeys.all, 'scan', scanId, params] as const,
}

// 获取单个 Endpoint 详情
export function useEndpoint(id: number) {
  return useQuery({
    queryKey: endpointKeys.detail(id),
    queryFn: () => EndpointService.getEndpointById(id),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as Endpoint
    },
    enabled: !!id,
  })
}

// 获取 Endpoint 列表
export function useEndpoints(params?: GetEndpointsRequest) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: endpointKeys.list(defaultParams),
    queryFn: () => EndpointService.getEndpoints(defaultParams),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as GetEndpointsResponse
    },
  })
}

// 根据目标ID获取 Endpoint 列表（使用专用路由）
export function useEndpointsByTarget(targetId: number, params?: Omit<GetEndpointsRequest, 'targetId'>, filter?: string) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: [...endpointKeys.byTarget(targetId, defaultParams), filter],
    queryFn: () => EndpointService.getEndpointsByTargetId(targetId, defaultParams, filter),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as GetEndpointsResponse
    },
    enabled: !!targetId,
    placeholderData: keepPreviousData,
  })
}

// 根据扫描ID获取 Endpoint 列表（历史快照）
export function useScanEndpoints(scanId: number, params?: Omit<GetEndpointsRequest, 'targetId'>, options?: { enabled?: boolean }, filter?: string) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    ...params,
  }

  return useQuery({
    queryKey: [...endpointKeys.byScan(scanId, defaultParams), filter],
    queryFn: () => EndpointService.getEndpointsByScanId(scanId, defaultParams, filter),
    enabled: options?.enabled !== undefined ? options.enabled : !!scanId,
    select: (response: any) => {
      // 后端使用通用分页格式：results/total/page/pageSize/totalPages
      return {
        endpoints: response.results || [],
        pagination: {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || response.page_size || defaultParams.pageSize || 10,
          totalPages: response.totalPages || response.total_pages || 0,
        },
      }
    },
    placeholderData: keepPreviousData,
  })
}

// 创建 Endpoint（完全自动化）
export function useCreateEndpoint() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: {
      endpoints: Array<CreateEndpointRequest>
    }) => EndpointService.createEndpoints(data),
    onMutate: async () => {
      toastMessages.loading('common.status.creating', {}, 'create-endpoint')
    },
    onSuccess: (response) => {
      toastMessages.dismiss('create-endpoint')
      
      const { createdCount, existedCount } = response
      
      if (existedCount > 0) {
        toastMessages.warning('toast.asset.endpoint.create.partialSuccess', { 
          success: createdCount, 
          skipped: existedCount 
        })
      } else {
        toastMessages.success('toast.asset.endpoint.create.success', { count: createdCount })
      }
      
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('create-endpoint')
      console.error('Failed to create endpoint:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.endpoint.create.error')
    },
  })
}

// 删除单个 Endpoint
export function useDeleteEndpoint() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => EndpointService.deleteEndpoint(id),
    onMutate: (id) => {
      toastMessages.loading('common.status.deleting', {}, `delete-endpoint-${id}`)
    },
    onSuccess: (response, id) => {
      toastMessages.dismiss(`delete-endpoint-${id}`)
      toastMessages.success('toast.asset.endpoint.delete.success')
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
    onError: (error: any, id) => {
      toastMessages.dismiss(`delete-endpoint-${id}`)
      console.error('Failed to delete endpoint:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.endpoint.delete.error')
    },
  })
}

// 批量删除 Endpoint
export function useBatchDeleteEndpoints() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: BatchDeleteEndpointsRequest) => EndpointService.batchDeleteEndpoints(data),
    onMutate: () => {
      toastMessages.loading('common.status.batchDeleting', {}, 'batch-delete-endpoints')
    },
    onSuccess: (response) => {
      toastMessages.dismiss('batch-delete-endpoints')
      const { deletedCount } = response
      toastMessages.success('toast.asset.endpoint.delete.bulkSuccess', { count: deletedCount })
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('batch-delete-endpoints')
      console.error('Failed to batch delete endpoints:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.endpoint.delete.error')
    },
  })
}

// 批量创建端点（绑定到目标）
export function useBulkCreateEndpoints() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: { targetId: number; urls: string[] }) =>
      EndpointService.bulkCreateEndpoints(data.targetId, data.urls),
    onMutate: async () => {
      toastMessages.loading('common.status.batchCreating', {}, 'bulk-create-endpoints')
    },
    onSuccess: (response, { targetId }) => {
      toastMessages.dismiss('bulk-create-endpoints')
      const { createdCount } = response
      
      if (createdCount > 0) {
        toastMessages.success('toast.asset.endpoint.create.success', { count: createdCount })
      } else {
        toastMessages.warning('toast.asset.endpoint.create.partialSuccess', { success: 0, skipped: 0 })
      }
      
      queryClient.invalidateQueries({ queryKey: endpointKeys.byTarget(targetId, {}) })
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('bulk-create-endpoints')
      console.error('Failed to bulk create endpoints:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.asset.endpoint.create.error')
    },
  })
}
