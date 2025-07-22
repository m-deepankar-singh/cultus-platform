"use client"

import { useState, useEffect } from "react"
import { OverallProgressDisplay } from "@/components/job-readiness/OverallProgressDisplay"
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card"
import { PerformanceOptimizer } from "@/components/job-readiness/PerformanceOptimizer"
import { AdaptiveParticles } from "@/components/ui/floating-particles"

interface JobReadinessLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showProgress?: boolean
}

export function JobReadinessLayout({ 
  children, 
  title, 
  description, 
  showProgress = true 
}: JobReadinessLayoutProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <PerformanceOptimizer>
      <div className="relative min-h-screen">
        {/* Background Effects */}
        <AdaptiveParticles />
        
        <div className="relative space-y-8">
          <div className="container mx-auto py-4 md:py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
              {/* Page Header */}
              {(title || description) && (
                <div className="text-center space-y-4">
                  {title && (
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight gradient-text">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {/* Progress Display */}
              {showProgress && (
                <PerformantAnimatedCard 
                  variant="glass"
                  className="dashboard-card"
                >
                  <OverallProgressDisplay />
                </PerformantAnimatedCard>
              )}

              {/* Page Content */}
              <div>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PerformanceOptimizer>
  )
}