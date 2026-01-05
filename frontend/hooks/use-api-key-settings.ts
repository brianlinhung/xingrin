import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiKeySettingsService } from '@/services/api-key-settings.service'
import type { ApiKeySettings } from '@/types/api-key-settings.types'
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'

export function useApiKeySettings() {
  return useQuery({
    queryKey: ['api-key-settings'],
    queryFn: () => ApiKeySettingsService.getSettings(),
  })
}

export function useUpdateApiKeySettings() {
  const qc = useQueryClient()
  const toastMessages = useToastMessages()
  
  return useMutation({
    mutationFn: (data: Partial<ApiKeySettings>) =>
      ApiKeySettingsService.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-key-settings'] })
      toastMessages.success('toast.apiKeys.settings.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.apiKeys.settings.error')
    },
  })
}
