"use client"

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data expires immediately, refetch when switching pages
      staleTime: 0,
      // Cache time (5 minutes) - keep short-term cache for quick returns
      gcTime: 5 * 60 * 1000,
      // Retry configuration
      retry: (failureCount, error: unknown) => {
        // Don't retry 4xx errors
        const err = error as { response?: { status?: number } }
        if (err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
          return false
        }
        // Retry up to 3 times
        return failureCount < 3
      },
      // Retry delay (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Auto refresh when window regains focus - users see latest data when switching back
      refetchOnWindowFocus: true,
      // Don't auto refresh on network reconnect - avoid excessive requests from network fluctuations
      refetchOnReconnect: false,
    },
    mutations: {
      // Mutation retry configuration
      retry: (failureCount, error: unknown) => {
        // Don't retry 4xx errors
        const err = error as { response?: { status?: number } }
        if (err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
          return false
        }
        // Retry up to 2 times
        return failureCount < 2
      },
    },
  },
})

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * React Query Provider component
 * 
 * Features:
 * 1. Provides global QueryClient instance
 * 2. Configures default query and mutation options
 * 3. Enables DevTools in development environment
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show DevTools in development environment */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}
