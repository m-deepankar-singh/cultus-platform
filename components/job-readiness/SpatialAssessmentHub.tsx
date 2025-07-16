'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface SpatialAssessmentHubProps {
  children: React.ReactNode
  className?: string
  tier?: string | null
  completionPercentage?: number
}

export function SpatialAssessmentHub({ 
  children, 
  className, 
  tier,
  completionPercentage = 0
}: SpatialAssessmentHubProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const updateCSSVars = () => {
      if (!containerRef.current) return
      
      const hue = tier === 'GOLD' ? 45 : tier === 'SILVER' ? 220 : tier === 'BRONZE' ? 25 : 260
      const intensity = Math.max(0.3, completionPercentage / 100)
      
      containerRef.current.style.setProperty('--primary-hue', hue.toString())
      containerRef.current.style.setProperty('--intensity', intensity.toString())
      containerRef.current.style.setProperty('--completion', (completionPercentage / 100).toString())
    }
    
    updateCSSVars()
  }, [tier, completionPercentage])
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative min-h-screen overflow-hidden bg-black",
        className
      )}
    >
      
      {/* Main content container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12">
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  )
}