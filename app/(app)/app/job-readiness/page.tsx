"use client"

import { useState, useEffect } from "react"
import { JobReadinessLayout } from "@/components/job-readiness/JobReadinessLayout"
import { ModuleNavigation } from "@/components/job-readiness/ModuleNavigation"
import { TierDisplay } from "@/components/job-readiness/TierDisplay"
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card"
import { useJobReadinessProgress } from "@/hooks/useJobReadinessProgress"
import { Target } from "lucide-react"

export default function JobReadinessPage() {
  const { data: progress } = useJobReadinessProgress()
  
  return (
    <JobReadinessLayout
      title="Job Readiness"
      description="Complete modules, earn progress, and advance tiers"
    >
      <div className="space-y-8">
        {/* Module Navigation */}
        <ModuleNavigation />
        
        {/* Star System Explanation */}
        <PerformantAnimatedCard variant="subtle" className="p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">How the Star System Works</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex justify-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="relative w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8">
                      <div 
                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 transition-all duration-300"
                        style={{
                          background: progress?.currentTier === 'BRONZE' 
                            ? '#f97316' 
                            : progress?.currentTier === 'SILVER'
                              ? '#6b7280'
                              : '#eab308',
                          WebkitMask: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTUuMDkgOC4yNkwyMiA5TDE3IDEzLjc0TDE4LjE4IDIyTDEyIDE4LjVMNS44MiAyMkw3IDEzLjc0TDIgOUw4LjkxIDguMjZMMTIgMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4=") center/contain no-repeat',
                          maskComposite: 'intersect',
                          filter: 'drop-shadow(0 0 4px currentColor) brightness(1.2)'
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  All learners progress through the same 5-star system by completing modules sequentially
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 text-center text-sm">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 mx-auto">
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      style={{
                        background: progress?.currentTier === 'BRONZE' 
                          ? '#f97316' 
                          : progress?.currentTier === 'SILVER'
                            ? '#6b7280'
                            : '#eab308',
                        WebkitMask: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTUuMDkgOC4yNkwyMiA5TDE3IDEzLjc0TDE4LjE4IDIyTDEyIDE4LjVMNS44MiAyMkw3IDEzLjc0TDIgOUw4LjkxIDguMjZMMTIgMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4=") center/contain no-repeat',
                        filter: 'brightness(1.2)'
                      }}
                    />
                  </div>
                  <div className="font-medium text-xs sm:text-sm">Star 1</div>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-tight">Complete Assessments</p>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 mx-auto">
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      style={{
                        background: progress?.currentTier === 'BRONZE' 
                          ? '#f97316' 
                          : progress?.currentTier === 'SILVER'
                            ? '#6b7280'
                            : '#eab308',
                        WebkitMask: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTUuMDkgOC4yNkwyMiA5TDE3IDEzLjc0TDE4LjE4IDIyTDEyIDE4LjVMNS44MiAyMkw3IDEzLjc0TDIgOUw4LjkxIDguMjZMMTIgMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4=") center/contain no-repeat',
                        filter: 'brightness(1.2)'
                      }}
                    />
                  </div>
                  <div className="font-medium text-xs sm:text-sm">Star 2</div>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-tight">Complete Courses</p>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 mx-auto">
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      style={{
                        background: progress?.currentTier === 'BRONZE' 
                          ? '#f97316' 
                          : progress?.currentTier === 'SILVER'
                            ? '#6b7280'
                            : '#eab308',
                        WebkitMask: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTUuMDkgOC4yNkwyMiA5TDE3IDEzLjc0TDE4LjE4IDIyTDEyIDE4LjVMNS44MiAyMkw3IDEzLjc0TDIgOUw4LjkxIDguMjZMMTIgMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4=") center/contain no-repeat',
                        filter: 'brightness(1.2)'
                      }}
                    />
                  </div>
                  <div className="font-medium text-xs sm:text-sm">Star 3</div>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-tight">Expert Sessions</p>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 mx-auto">
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      style={{
                        background: progress?.currentTier === 'BRONZE' 
                          ? '#f97316' 
                          : progress?.currentTier === 'SILVER'
                            ? '#6b7280'
                            : '#eab308',
                        WebkitMask: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTUuMDkgOC4yNkwyMiA5TDE3IDEzLjc0TDE4LjE4IDIyTDEyIDE4LjVMNS44MiAyMkw3IDEzLjc0TDIgOUw4LjkxIDguMjZMMTIgMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4=") center/contain no-repeat',
                        filter: 'brightness(1.2)'
                      }}
                    />
                  </div>
                  <div className="font-medium text-xs sm:text-sm">Star 4</div>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-tight">Real-world Projects</p>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2 col-span-2 sm:col-span-1">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 mx-auto">
                    <div 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      style={{
                        background: progress?.currentTier === 'BRONZE' 
                          ? '#f97316' 
                          : progress?.currentTier === 'SILVER'
                            ? '#6b7280'
                            : '#eab308',
                        WebkitMask: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTUuMDkgOC4yNkwyMiA5TDE3IDEzLjc0TDE4LjE4IDIyTDEyIDE4LjVMNS44MiAyMkw3IDEzLjc0TDIgOUw4LjkxIDguMjZMMTIgMloiIGZpbGw9ImN1cnJlbnRDb2xvciIvPgo8L3N2Zz4=") center/contain no-repeat',
                        filter: 'brightness(1.2)'
                      }}
                    />
                  </div>
                  <div className="font-medium text-xs sm:text-sm">Star 5</div>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-tight">Interview Simulation</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mt-4 sm:mt-6">
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 text-center font-medium">
                  <strong>Tier System (Bronze/Silver/Gold)</strong>
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 text-center leading-relaxed px-1">
                  Your tier is determined by your assessment performance and only affects content difficulty. 
                  All learners can earn the same 5 stars regardless of their tier - Bronze, Silver, and Gold 
                  learners all follow the same progression path but with content tailored to their skill level.
                </p>
              </div>
            </div>
          </div>
        </PerformantAnimatedCard>
        
        {/* Tier Display Section */}
        <PerformantAnimatedCard variant="glass">
          <div className="p-2">
            <TierDisplay />
          </div>
        </PerformantAnimatedCard>
        
        {/* Information Section */}
        <PerformantAnimatedCard variant="subtle" className="text-center p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Your Learning Path</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every completed module brings you closer to your career goals. 
              Track your progress and showcase your growing expertise.
            </p>
          </div>
        </PerformantAnimatedCard>
      </div>
    </JobReadinessLayout>
  )
} 