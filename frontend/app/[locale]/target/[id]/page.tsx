"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Target detail default page
 * Automatically redirects to subdomain page
 */
export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    // Redirect to subdomain page
    router.replace(`/target/${id}/subdomain/`)
  }, [id, router])

  return null
}

