import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"

import { systemLogService } from "@/services/system-log.service"
import { useToastMessages } from "@/lib/toast-helpers"

export function useSystemLogs(options?: { lines?: number; enabled?: boolean }) {
  const hadErrorRef = useRef(false)
  const toastMessages = useToastMessages()

  const query = useQuery({
    queryKey: ["system", "logs", { lines: options?.lines ?? null }],
    queryFn: () => systemLogService.getSystemLogs({ lines: options?.lines }),
    enabled: options?.enabled ?? true,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    retry: false,
  })

  useEffect(() => {
    if (query.isError && !hadErrorRef.current) {
      hadErrorRef.current = true
      toastMessages.error('toast.systemLog.fetch.error')
    }

    if (query.isSuccess && hadErrorRef.current) {
      hadErrorRef.current = false
      toastMessages.success('toast.systemLog.fetch.recovered')
    }
  }, [query.isError, query.isSuccess, toastMessages])

  return query
}
