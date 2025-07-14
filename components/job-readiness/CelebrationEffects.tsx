"use client"

import { useEffect, useState } from "react"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface CelebrationEffectsProps {
  trigger?: boolean
  type?: "star" | "tier" | "module" | "achievement"
  duration?: number
  className?: string
}

// Simplified celebration with just a subtle success indicator
export function CelebrationEffects({ 
  trigger = false, 
  type = "achievement",
  duration = 2000,
  className 
}: CelebrationEffectsProps) {
  // This component is now just a passthrough for the FloatingSuccessIndicator
  // All flashy animations and particles have been removed
  return null
}

// Simplified celebration components - no flashy effects
export function StarCelebration({ trigger }: { trigger: boolean }) {
  return null
}

export function TierCelebration({ trigger }: { trigger: boolean }) {
  return null
}

export function ModuleCelebration({ trigger }: { trigger: boolean }) {
  return null
}

// Simple success indicator without flashy animations
export function FloatingSuccessIndicator({ 
  show, 
  message, 
  icon 
}: { 
  show: boolean
  message: string
  icon?: React.ReactNode 
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    if (show) {
      setMounted(true)
      const timer = setTimeout(() => setMounted(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [show])
  
  if (!mounted) return null
  
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-2 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-2">
        {icon || <CheckCircle className="w-4 h-4" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}