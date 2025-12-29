"use client"

import React from "react"
import { useParams } from "next/navigation"
import { EndpointsDetailView } from "@/components/endpoints"

/**
 * Target endpoints page
 * Displays endpoint details under the target
 */
export default function TargetEndpointsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="px-4 lg:px-6">
      <EndpointsDetailView targetId={parseInt(id)} />
    </div>
  )
}

