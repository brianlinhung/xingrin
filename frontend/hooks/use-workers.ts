/**
 * Worker 节点管理 Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workerService } from '@/services/worker.service'
import type { CreateWorkerRequest, UpdateWorkerRequest } from '@/types/worker.types'
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'

// Query Keys
export const workerKeys = {
  all: ['workers'] as const,
  lists: () => [...workerKeys.all, 'list'] as const,
  list: (page: number, pageSize: number) => [...workerKeys.lists(), { page, pageSize }] as const,
  details: () => [...workerKeys.all, 'detail'] as const,
  detail: (id: number) => [...workerKeys.details(), id] as const,
}

/**
 * 获取 Worker 列表
 */
export function useWorkers(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: workerKeys.list(page, pageSize),
    queryFn: () => workerService.getWorkers(page, pageSize),
  })
}

/**
 * 获取单个 Worker 详情
 */
export function useWorker(id: number) {
  return useQuery({
    queryKey: workerKeys.detail(id),
    queryFn: () => workerService.getWorker(id),
    enabled: id > 0,
  })
}

/**
 * 创建 Worker
 */
export function useCreateWorker() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: CreateWorkerRequest) => workerService.createWorker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workerKeys.lists() })
      toastMessages.success('toast.worker.create.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.worker.create.error')
    },
  })
}

/**
 * 更新 Worker
 */
export function useUpdateWorker() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkerRequest }) =>
      workerService.updateWorker(id, data),
    onSuccess: (_: unknown, { id }: { id: number; data: UpdateWorkerRequest }) => {
      queryClient.invalidateQueries({ queryKey: workerKeys.lists() })
      queryClient.invalidateQueries({ queryKey: workerKeys.detail(id) })
      toastMessages.success('toast.worker.update.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.worker.update.error')
    },
  })
}

/**
 * 删除 Worker
 */
export function useDeleteWorker() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => workerService.deleteWorker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: workerKeys.lists(),
        refetchType: 'active',
      })
      toastMessages.success('toast.worker.delete.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.worker.delete.error')
    },
  })
}

/**
 * 部署 Worker
 */
export function useDeployWorker() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => workerService.deployWorker(id),
    onSuccess: (_: unknown, id: number) => {
      queryClient.invalidateQueries({ queryKey: workerKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: workerKeys.lists() })
      toastMessages.success('toast.worker.deploy.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.worker.deploy.error')
    },
  })
}

/**
 * 重启 Worker
 */
export function useRestartWorker() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => workerService.restartWorker(id),
    onSuccess: (_: unknown, id: number) => {
      queryClient.invalidateQueries({ queryKey: workerKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: workerKeys.lists() })
      toastMessages.success('toast.worker.restart.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.worker.restart.error')
    },
  })
}

/**
 * 停止 Worker
 */
export function useStopWorker() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => workerService.stopWorker(id),
    onSuccess: (_: unknown, id: number) => {
      queryClient.invalidateQueries({ queryKey: workerKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: workerKeys.lists() })
      toastMessages.success('toast.worker.stop.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.worker.stop.error')
    },
  })
}
