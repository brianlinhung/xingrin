"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { getNucleiTemplateTree, getNucleiTemplateContent, refreshNucleiTemplates, saveNucleiTemplate, uploadNucleiTemplate } from "@/services/nuclei.service"
import type { NucleiTemplateTreeNode, NucleiTemplateContent, UploadNucleiTemplatePayload, SaveNucleiTemplatePayload } from "@/types/nuclei.types"

export function useNucleiTemplateTree() {
  return useQuery<NucleiTemplateTreeNode[]>({
    queryKey: ["nuclei", "templates", "tree"],
    queryFn: () => getNucleiTemplateTree(),
  })
}

export function useNucleiTemplateContent(path: string | null) {
  return useQuery<NucleiTemplateContent>({
    queryKey: ["nuclei", "templates", "content", path],
    queryFn: () => getNucleiTemplateContent(path as string),
    enabled: !!path,
  })
}

export function useRefreshNucleiTemplates() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: () => refreshNucleiTemplates(),
    onMutate: () => {
      toastMessages.loading('toast.nucleiTemplate.refresh.loading', {}, 'refresh-nuclei-templates')
    },
    onSuccess: () => {
      toastMessages.dismiss('refresh-nuclei-templates')
      toastMessages.success('toast.nucleiTemplate.refresh.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei", "templates", "tree"] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('refresh-nuclei-templates')
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiTemplate.refresh.error')
    },
  })
}

export function useUploadNucleiTemplate() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation<void, Error, UploadNucleiTemplatePayload>({
    mutationFn: (payload) => uploadNucleiTemplate(payload),
    onMutate: () => {
      toastMessages.loading('common.status.uploading', {}, 'upload-nuclei-template')
    },
    onSuccess: () => {
      toastMessages.dismiss('upload-nuclei-template')
      toastMessages.success('toast.nucleiTemplate.upload.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei", "templates", "tree"] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('upload-nuclei-template')
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiTemplate.upload.error')
    },
  })
}

export function useSaveNucleiTemplate() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation<void, Error, SaveNucleiTemplatePayload>({
    mutationFn: (payload) => saveNucleiTemplate(payload),
    onMutate: () => {
      toastMessages.loading('common.actions.saving', {}, 'save-nuclei-template')
    },
    onSuccess: (_data, variables) => {
      toastMessages.dismiss('save-nuclei-template')
      toastMessages.success('toast.nucleiTemplate.save.success')
      queryClient.invalidateQueries({ queryKey: ["nuclei", "templates", "content", variables.path] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('save-nuclei-template')
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiTemplate.save.error')
    },
  })
}
