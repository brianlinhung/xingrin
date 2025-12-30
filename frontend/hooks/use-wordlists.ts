"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import {
  getWordlists,
  uploadWordlist,
  deleteWordlist,
  getWordlistContent,
  updateWordlistContent,
} from "@/services/wordlist.service"
import type { GetWordlistsResponse, Wordlist } from "@/types/wordlist.types"

// Get wordlist list
export function useWordlists(params?: { page?: number; pageSize?: number }) {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10

  return useQuery<GetWordlistsResponse>({
    queryKey: ["wordlists", { page, pageSize }],
    queryFn: () => getWordlists(page, pageSize),
  })
}

// Upload wordlist
export function useUploadWordlist() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation<{}, Error, { name: string; description?: string; file: File }>({
    mutationFn: (payload) => uploadWordlist(payload),
    onMutate: () => {
      toastMessages.loading('common.status.uploading', {}, 'upload-wordlist')
    },
    onSuccess: () => {
      toastMessages.dismiss('upload-wordlist')
      toastMessages.success('toast.wordlist.upload.success')
      queryClient.invalidateQueries({ queryKey: ["wordlists"] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('upload-wordlist')
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.wordlist.upload.error')
    },
  })
}

// Delete wordlist
export function useDeleteWordlist() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation<void, Error, number>({
    mutationFn: (id: number) => deleteWordlist(id),
    onMutate: (id) => {
      toastMessages.loading('common.status.deleting', {}, `delete-wordlist-${id}`)
    },
    onSuccess: (_data, id) => {
      toastMessages.dismiss(`delete-wordlist-${id}`)
      toastMessages.success('toast.wordlist.delete.success')
      queryClient.invalidateQueries({ queryKey: ["wordlists"] })
    },
    onError: (error: any, id) => {
      toastMessages.dismiss(`delete-wordlist-${id}`)
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.wordlist.delete.error')
    },
  })
}

// Get wordlist content
export function useWordlistContent(id: number | null) {
  return useQuery<string>({
    queryKey: ["wordlist-content", id],
    queryFn: () => getWordlistContent(id!),
    enabled: id !== null,
  })
}

// Update wordlist content
export function useUpdateWordlistContent() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation<Wordlist, Error, { id: number; content: string }>({
    mutationFn: ({ id, content }) => updateWordlistContent(id, content),
    onMutate: () => {
      toastMessages.loading('common.actions.saving', {}, 'update-wordlist-content')
    },
    onSuccess: (data) => {
      toastMessages.dismiss('update-wordlist-content')
      toastMessages.success('toast.wordlist.update.success')
      queryClient.invalidateQueries({ queryKey: ["wordlists"] })
      queryClient.invalidateQueries({ queryKey: ["wordlist-content", data.id] })
    },
    onError: (error: any) => {
      toastMessages.dismiss('update-wordlist-content')
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.wordlist.update.error')
    },
  })
}
