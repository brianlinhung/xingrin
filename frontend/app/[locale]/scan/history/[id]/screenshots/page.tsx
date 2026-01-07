"use client"

import { useParams } from "next/navigation"
import { ScreenshotsGallery } from "@/components/screenshots/screenshots-gallery"

export default function ScanScreenshotsPage() {
  const { id } = useParams<{ id: string }>()
  const scanId = Number(id)

  return (
    <div className="px-4 lg:px-6">
      <ScreenshotsGallery scanId={scanId} />
    </div>
  )
}
