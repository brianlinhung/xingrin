"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Target detail default page
 * Automatically redirects to websites page
 */
export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    // Redirect to websites page
    router.replace(`/target/${id}/websites/`)
  }, [id, router])

  return null
}

