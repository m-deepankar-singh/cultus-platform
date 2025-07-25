"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, BookOpen, GraduationCap, Briefcase, Video, Lock, CheckCircle, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PerformantAnimatedCard, CardGrid } from "@/components/ui/performant-animated-card"
import { OptimizedProgressRing } from "@/components/ui/optimized-progress-ring"
import { AnimatedButton } from "@/components/ui/animated-button"
import { cn } from "@/lib/utils"
import { useJobReadinessModuleGroups } from "@/hooks/useJobReadinessModuleGroups"

// Icon mapping for dynamic icon selection
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  FileText,
  BookOpen, 
  GraduationCap,
  Briefcase,
  Video
}

export function ModuleNavigation() {
  const { data: moduleGroups, isLoading } = useJobReadinessModuleGroups()
  const [mounted, setMounted] = useState(false)
  
  console.log('ModuleNavigation - moduleGroups:', moduleGroups)
  console.log('ModuleNavigation - isLoading:', isLoading)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Program Modules
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <PerformantAnimatedCard variant="glass" className="relative animate-pulse h-72 md:h-80">
                <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="h-12 w-12 md:h-16 md:w-16 bg-muted rounded-xl flex-shrink-0"></div>
                    <div className="flex-1 min-w-0 space-y-2 md:space-y-3">
                      <div className="h-4 md:h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-3 md:h-4 bg-muted rounded w-full"></div>
                  <div className="h-10 md:h-12 bg-muted rounded-lg"></div>
                </div>
              </PerformantAnimatedCard>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!moduleGroups) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-6">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold mb-3">No Modules Available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Job Readiness modules will appear here once they're assigned to you.
        </p>
      </div>
    )
  }

  const currentStars = moduleGroups.student.currentStars

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-semibold">Program Modules</h2>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-1.5 w-12 sm:w-16 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out"
              style={{ 
                width: `${(moduleGroups.moduleGroups.filter(m => m.isCompleted).length / moduleGroups.moduleGroups.length) * 100}%` 
              }}
            />
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {moduleGroups.moduleGroups.filter(m => m.isCompleted).length}/{moduleGroups.moduleGroups.length}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {moduleGroups.moduleGroups.map((moduleGroup, index) => {
          const isUnlocked = moduleGroup.isUnlocked
          const isCompleted = moduleGroup.isCompleted
          // Fix isCurrent logic: current module is the one that should be worked on next
          // For star 0 modules (assessments), current when user has 0 stars
          // For other modules, current when user has exactly the required stars
          const isCurrent = currentStars === moduleGroup.requiredStars && !isCompleted
          const IconComponent = iconMap[moduleGroup.icon] || FileText
          
          return (
            <div 
              key={moduleGroup.type}
              className={cn(
                "group relative transition-all duration-300",
                isCurrent && "scale-[1.01]"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn(
                "relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-300 group-hover:shadow-md",
                isCompleted 
                  ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/30" 
                  : isUnlocked 
                    ? "bg-card border-border group-hover:border-primary/30" 
                    : "bg-muted/30 border-muted",
                isCurrent && "ring-2 ring-primary/20 shadow-sm"
              )}>
                
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 p-2.5 sm:p-3 rounded-lg transition-all duration-300",
                  isCompleted 
                    ? "bg-emerald-100 dark:bg-emerald-900/40" 
                    : isUnlocked 
                      ? "bg-primary/10" 
                      : "bg-muted"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : isUnlocked ? (
                    <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  ) : (
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-1">
                    <h3 className={cn(
                      "font-semibold text-sm sm:text-base truncate",
                      !isUnlocked && "text-muted-foreground"
                    )}>
                      {moduleGroup.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Badge 
                        variant={isCompleted ? "default" : isUnlocked ? "secondary" : "outline"}
                        className={cn(
                          "text-xs px-1.5 sm:px-2 py-0.5 shrink-0",
                          isCompleted && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                          isCurrent && !isCompleted && "bg-primary/10 text-primary border-primary/30"
                        )}
                      >
                        {isCompleted ? "Completed" : isCurrent ? "Current" : isUnlocked ? "Available" : "Locked"}
                      </Badge>
                      
                      <Badge variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 shrink-0">
                        Star {moduleGroup.requiredStars}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className={cn(
                    "text-xs sm:text-sm mb-2 line-clamp-2",
                    isUnlocked ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}>
                    {moduleGroup.description}
                  </p>
                  
                  {/* Progress */}
                  {moduleGroup.totalCount > 0 && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {moduleGroup.completedCount}/{moduleGroup.totalCount} {moduleGroup.type.replace('_', ' ')}
                      </span>
                      <div className="h-1 flex-1 bg-muted/50 rounded-full overflow-hidden min-w-0">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000 ease-out",
                            isCompleted 
                              ? "bg-emerald-500" 
                              : "bg-primary"
                          )}
                          style={{ 
                            width: `${moduleGroup.isCompleted ? 100 : Math.min(100, (moduleGroup.completedCount / moduleGroup.totalCount) * 100)}%`
                          }}
                        />
                      </div>
                      {isCompleted && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">Complete</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  {isUnlocked ? (
                    <Link href={moduleGroup.href} className="block sm:inline-block">
                      <AnimatedButton 
                        size="sm"
                        className={cn(
                          "w-full sm:w-auto h-11 sm:h-9 text-sm transition-all duration-300",
                          isCompleted 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        )}
                      >
                        {isCompleted ? "Review" : isCurrent ? "Start" : "Continue"}
                        <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </AnimatedButton>
                    </Link>
                  ) : (
                    <AnimatedButton 
                      size="sm"
                      disabled 
                      className="w-full sm:w-auto h-11 sm:h-9 text-sm bg-muted text-muted-foreground cursor-not-allowed"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </AnimatedButton>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 