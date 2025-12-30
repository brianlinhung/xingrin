import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import {
  getEngines,
  getEngine,
  createEngine,
  updateEngine,
  deleteEngine,
} from '@/services/engine.service'
import type { ScanEngine } from '@/types/engine.types'

/**
 * Get engine list
 */
export function useEngines() {
  return useQuery({
    queryKey: ['engines'],
    queryFn: getEngines,
  })
}

/**
 * Get engine details
 */
export function useEngine(id: number) {
  return useQuery({
    queryKey: ['engines', id],
    queryFn: () => getEngine(id),
    enabled: !!id,
  })
}

/**
 * Create engine
 */
export function useCreateEngine() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: createEngine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines'] })
      toastMessages.success('toast.engine.create.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.engine.create.error')
    },
  })
}

/**
 * Update engine
 */
export function useUpdateEngine() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateEngine>[1] }) =>
      updateEngine(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['engines'] })
      queryClient.invalidateQueries({ queryKey: ['engines', variables.id] })
      toastMessages.success('toast.engine.update.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.engine.update.error')
    },
  })
}

/**
 * Delete engine
 */
export function useDeleteEngine() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: deleteEngine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engines'] })
      toastMessages.success('toast.engine.delete.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.engine.delete.error')
    },
  })
}

