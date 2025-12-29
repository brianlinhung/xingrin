"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Target detail page (compatible with old routes)
 * Automatically redirects to subdomain page
 */
export default function TargetDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    // Redirect to subdomain page
    router.replace(`/target/${id}/subdomain/`)
  }, [id, router])

  return null
}

