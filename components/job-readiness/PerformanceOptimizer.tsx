"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

interface PerformanceOptimizerProps {
  children: React.ReactNode
}

export function PerformanceOptimizer({ children }: PerformanceOptimizerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isLowEnd, setIsLowEnd] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    // Detect reduced motion preference
    const checkReducedMotion = () => {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    }

    // Detect low-end devices (basic heuristics)
    const checkLowEnd = () => {
      const isLowEnd = navigator.hardwareConcurrency <= 2 || 
                      ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2) ||
                      /android.*(mobile|sm-|md-)/i.test(navigator.userAgent)
      setIsLowEnd(isLowEnd)
    }

    checkMobile()
    checkReducedMotion()
    checkLowEnd()

    window.addEventListener('resize', checkMobile)
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaQuery.addEventListener('change', checkReducedMotion)

    return () => {
      window.removeEventListener('resize', checkMobile)
      mediaQuery.removeEventListener('change', checkReducedMotion)
    }
  }, [])

  useEffect(() => {
    // Apply performance optimizations based on device capabilities
    const root = document.documentElement

    if (isMobile || isLowEnd) {
      // Reduce particle count for mobile/low-end devices
      root.style.setProperty('--particle-count', '6')
      root.style.setProperty('--animation-duration', '0.4s')
    } else {
      root.style.setProperty('--particle-count', '12')
      root.style.setProperty('--animation-duration', '0.6s')
    }

    if (reducedMotion) {
      // Disable animations if user prefers reduced motion
      root.style.setProperty('--animation-duration', '0s')
      root.style.setProperty('--particle-count', '0')
    }

    // Optimize for dark mode performance
    if (resolvedTheme === 'dark') {
      root.style.setProperty('--backdrop-filter', 'blur(8px)')
    } else {
      root.style.setProperty('--backdrop-filter', 'blur(12px)')
    }

  }, [isMobile, isLowEnd, reducedMotion, resolvedTheme])

  return (
    <div 
      className="performance-optimized"
      data-mobile={isMobile}
      data-low-end={isLowEnd}
      data-reduced-motion={reducedMotion}
    >
      {children}
    </div>
  )
}

// Hook for components to adapt based on performance context
export function usePerformanceContext() {
  const [context, setContext] = useState({
    isMobile: false,
    isLowEnd: false,
    reducedMotion: false
  })

  useEffect(() => {
    const isMobile = window.innerWidth <= 768
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isLowEnd = navigator.hardwareConcurrency <= 2 || ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2)

    setContext({ isMobile, isLowEnd, reducedMotion })
  }, [])

  return context
}