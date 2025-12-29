"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * Route loading progress bar component
 * 
 * Monitors Next.js App Router route changes and displays top progress bar animation
 */
export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const isFirstRender = useRef(true)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startProgress = useCallback(() => {
    setIsVisible(true)
    setProgress(0)
    
    // Use interval for smooth increment
    let currentProgress = 0
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 10 + 5 // Increase by 5-15% each time
      if (currentProgress >= 90) {
        currentProgress = 90 // Max 90%, wait for completion
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
      setProgress(currentProgress)
    }, 100)
  }, [])

  const completeProgress = useCallback(() => {
    // Clear ongoing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setProgress(100)
    // Show 100% briefly after completion, then hide
    setTimeout(() => {
      setIsVisible(false)
      setProgress(0)
    }, 300)
  }, [])

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Trigger progress bar on route change
    startProgress()
    
    // End progress bar after page load completes
    const timer = setTimeout(() => completeProgress(), 300)
    
    return () => {
      clearTimeout(timer)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [pathname, searchParams, startProgress, completeProgress])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[99999] h-[3px]",
        "pointer-events-none"
      )}
    >
      {/* Progress bar background */}
      <div className="absolute inset-0 bg-primary/10" />
      
      {/* Progress bar */}
      <div
        className={cn(
          "h-full bg-primary transition-all duration-200 ease-out",
          "shadow-[0_0_10px_rgba(99,102,241,0.5)]"
        )}
        style={{ width: `${progress}%` }}
      />
      
      {/* Glow effect */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-24",
          "bg-gradient-to-r from-transparent to-primary/50",
          "opacity-50 blur-sm",
          "transition-all duration-200"
        )}
        style={{ 
          transform: `translateX(${progress < 100 ? '0' : '100%'})`,
          left: `${Math.max(0, progress - 10)}%`
        }}
      />
    </div>
  )
}
