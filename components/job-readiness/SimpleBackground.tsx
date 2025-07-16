'use client'

import { useEffect, useRef } from 'react'

interface SimpleBackgroundProps {
  tier?: string | null
  completionPercentage?: number
}

export function SimpleBackground({
  tier,
  completionPercentage = 0
}: SimpleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const updateCSSVars = () => {
      if (!containerRef.current) return
      
      const hue = tier === 'GOLD' ? 45 : tier === 'SILVER' ? 220 : tier === 'BRONZE' ? 25 : 260
      const intensity = Math.max(0.3, completionPercentage / 100)
      
      containerRef.current.style.setProperty('--primary-hue', hue.toString())
      containerRef.current.style.setProperty('--intensity', intensity.toString())
    }
    
    updateCSSVars()
  }, [tier, completionPercentage])
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
    >
      {/* Pure black background */}
      <div
        className="absolute inset-0 bg-black"
      />
    </div>
  )
}