"use client"

import { useState, useEffect } from "react"
import { OverallProgressDisplay } from "@/components/job-readiness/OverallProgressDisplay"
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card"
import { PerformanceOptimizer } from "@/components/job-readiness/PerformanceOptimizer"

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
        <div className="container mx-auto py-8 px-4 md:px-0">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            {(title || description) && (
              <div className="text-center space-y-4">
                {title && (
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Progress Display */}
            {showProgress && (
              <div>
                <PerformantAnimatedCard 
                  variant="glass"
                >
                  <OverallProgressDisplay />
                </PerformantAnimatedCard>
              </div>
            )}

            {/* Page Content */}
            <div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </PerformanceOptimizer>
  )
}