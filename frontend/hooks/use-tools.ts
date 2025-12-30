"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { ToolService } from "@/services/tool.service"
import type { Tool, GetToolsParams, CreateToolRequest, UpdateToolRequest } from "@/types/tool.types"

// Query Keys
export const toolKeys = {
  all: ['tools'] as const,
  lists: () => [...toolKeys.all, 'list'] as const,
  list: (params: GetToolsParams) => [...toolKeys.lists(), params] as const,
}

// 获取工具列表
export function useTools(params: GetToolsParams = {}) {
  return useQuery({
    queryKey: toolKeys.list(params),
    queryFn: () => ToolService.getTools(params),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return {
        tools: response.tools || [],
        pagination: {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 10,
          totalPages: response.totalPages || 0,
        }
      }
    },
  })
}

// 创建工具
export function useCreateTool() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: CreateToolRequest) => ToolService.createTool(data),
    onMutate: async () => {
      toastMessages.loading('common.status.creating', {}, 'create-tool')
    },
    onSuccess: () => {
      toastMessages.dismiss('create-tool')
      toastMessages.success('toast.tool.create.success')
      queryClient.invalidateQueries({ 
        queryKey: toolKeys.all,
        refetchType: 'active' 
      })
    },
    onError: (error: any) => {
      toastMessages.dismiss('create-tool')
      console.error('Failed to create tool:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.tool.create.error')
    },
  })
}

// 更新工具
export function useUpdateTool() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateToolRequest }) => 
      ToolService.updateTool(id, data),
    onMutate: async () => {
      toastMessages.loading('common.status.updating', {}, 'update-tool')
    },
    onSuccess: () => {
      toastMessages.dismiss('update-tool')
      toastMessages.success('toast.tool.update.success')
      queryClient.invalidateQueries({ 
        queryKey: toolKeys.all,
        refetchType: 'active' 
      })
    },
    onError: (error: any) => {
      toastMessages.dismiss('update-tool')
      console.error('Failed to update tool:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.tool.update.error')
    },
  })
}

// 删除工具
export function useDeleteTool() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => ToolService.deleteTool(id),
    onMutate: async () => {
      toastMessages.loading('common.status.deleting', {}, 'delete-tool')
    },
    onSuccess: () => {
      toastMessages.dismiss('delete-tool')
      toastMessages.success('toast.tool.delete.success')
      queryClient.invalidateQueries({ 
        queryKey: toolKeys.all,
        refetchType: 'active' 
      })
    },
    onError: (error: any) => {
      toastMessages.dismiss('delete-tool')
      console.error('Failed to delete tool:', error)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.tool.delete.error')
    },
  })
}
