'use client'

import { useRoutePrefetch } from '@/hooks/use-route-prefetch'

/**
 * Route prefetch component
 * Automatically prefetches JS/CSS resources for commonly used pages after app startup
 * This is an invisible component, only used to execute prefetch logic
 */
export function RoutePrefetch() {
  useRoutePrefetch()
  return null
}
