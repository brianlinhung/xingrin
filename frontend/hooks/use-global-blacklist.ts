import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  getGlobalBlacklist,
  updateGlobalBlacklist,
  type GlobalBlacklistResponse,
  type UpdateGlobalBlacklistRequest,
} from '@/services/global-blacklist.service'

const QUERY_KEY = ['global-blacklist']

/**
 * Hook to fetch global blacklist
 */
export function useGlobalBlacklist() {
  return useQuery<GlobalBlacklistResponse>({
    queryKey: QUERY_KEY,
    queryFn: getGlobalBlacklist,
  })
}

/**
 * Hook to update global blacklist
 */
export function useUpdateGlobalBlacklist() {
  const queryClient = useQueryClient()
  const t = useTranslations('pages.settings.blacklist')

  return useMutation({
    mutationFn: (data: UpdateGlobalBlacklistRequest) => updateGlobalBlacklist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success(t('toast.saveSuccess'))
    },
    onError: () => {
      toast.error(t('toast.saveError'))
    },
  })
}
