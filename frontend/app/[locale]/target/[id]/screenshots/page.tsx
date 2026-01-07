"use client"

import { useParams } from "next/navigation"
import { ScreenshotsGallery } from "@/components/screenshots/screenshots-gallery"

export default function ScreenshotsPage() {
  const { id } = useParams<{ id: string }>()
  const targetId = Number(id)

  return (
    <div className="px-4 lg:px-6">
      <ScreenshotsGallery targetId={targetId} />
    </div>
  )
}
