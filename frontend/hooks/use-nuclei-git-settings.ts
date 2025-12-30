"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'
import { NucleiGitService } from "@/services/nuclei-git.service"
import type { UpdateNucleiGitSettingsRequest } from "@/types/nuclei-git.types"

export function useNucleiGitSettings() {
  return useQuery({
    queryKey: ["nuclei", "git", "settings"],
    queryFn: () => NucleiGitService.getSettings(),
  })
}

export function useUpdateNucleiGitSettings() {
  const qc = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: UpdateNucleiGitSettingsRequest) => NucleiGitService.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nuclei", "git", "settings"] })
      toastMessages.success('toast.nucleiGit.settings.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.nucleiGit.settings.error')
    },
  })
}
