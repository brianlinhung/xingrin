import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationSettingsService } from '@/services/notification-settings.service'
import type { UpdateNotificationSettingsRequest } from '@/types/notification-settings.types'
import { useToastMessages } from '@/lib/toast-helpers'
import { getErrorCode } from '@/lib/response-parser'

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => NotificationSettingsService.getSettings(),
  })
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient()
  const toastMessages = useToastMessages()
  
  return useMutation({
    mutationFn: (data: UpdateNotificationSettingsRequest) =>
      NotificationSettingsService.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-settings'] })
      toastMessages.success('toast.notification.settings.success')
    },
    onError: (error: any) => {
      toastMessages.errorFromCode(getErrorCode(error?.response?.data), 'toast.notification.settings.error')
    },
  })
}
