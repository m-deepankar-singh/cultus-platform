"use client"

import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card"
import { OptimizedProgressRing } from "@/components/ui/optimized-progress-ring"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, PlayCircle, Star } from "lucide-react"

interface OverallProgress {
  completed_sessions_count: number
  required_sessions: number
  progress_percentage: number
  third_star_unlocked: boolean
}

interface OverallSessionProgressProps {
  overallProgress: OverallProgress
}

export function OverallSessionProgress({ overallProgress }: OverallSessionProgressProps) {
  const {
    completed_sessions_count,
    required_sessions,
    progress_percentage,
    third_star_unlocked
  } = overallProgress

  return (
    <PerformantAnimatedCard variant="glass" hoverEffect="lift" className="dashboard-card">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlayCircle className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Expert Sessions Progress</h2>
          </div>
          {third_star_unlocked && (
            <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-50">
              <Star className="h-3 w-3 mr-1" />
              Star 3 Unlocked!
            </Badge>
          )}
        </div>


        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PerformantAnimatedCard 
            variant="subtle" 
            hoverEffect="scale" 
            className="text-center space-y-3"
            staggerIndex={1}
          >
            <div className="flex justify-center">
              <div className="p-3 bg-emerald-500/20 rounded-full">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">{completed_sessions_count}</p>
            </div>
          </PerformantAnimatedCard>

          <PerformantAnimatedCard 
            variant="subtle" 
            hoverEffect="scale" 
            className="text-center space-y-3"
            staggerIndex={2}
          >
            <div className="flex justify-center">
              <div className="p-3 bg-sky-500/20 rounded-full">
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold text-sky-600">
                {Math.max(0, required_sessions - completed_sessions_count)}
              </p>
            </div>
          </PerformantAnimatedCard>

          <PerformantAnimatedCard 
            variant="subtle" 
            hoverEffect="scale" 
            className="text-center space-y-3"
            staggerIndex={3}
          >
            <div className="flex justify-center">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold text-amber-600">{progress_percentage}%</p>
            </div>
          </PerformantAnimatedCard>
        </div>

        {/* Status Message */}
        <div className="text-center p-4 bg-gradient-to-r from-background/50 to-background/80 rounded-lg border border-border/50">
          {third_star_unlocked ? (
            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
              🎉 Congratulations! You've completed all required expert sessions and unlocked Star 3!
            </p>
          ) : completed_sessions_count === 0 ? (
            <p className="text-muted-foreground">
              Start watching expert sessions to earn your third star. Complete {required_sessions} sessions to unlock the Projects module.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Great progress! Complete {required_sessions - completed_sessions_count} more sessions to unlock Star 3 and access Projects.
            </p>
          )}
        </div>
      </div>
    </PerformantAnimatedCard>
  )
} 