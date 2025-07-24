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
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <PlayCircle className="h-5 sm:h-6 w-5 sm:w-6 text-primary flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-semibold">Expert Sessions Progress</h2>
          </div>
          {third_star_unlocked && (
            <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-50 w-fit">
              <Star className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Star 3 Unlocked!</span>
              <span className="sm:hidden">Star 3!</span>
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
              <p className="text-2xl font-bold text-amber-600">{Math.floor(progress_percentage)}%</p>
            </div>
          </PerformantAnimatedCard>
        </div>

        {/* Status Message */}
        <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-background/50 to-background/80 rounded-lg border border-border/50">
          {third_star_unlocked ? (
            <p className="text-emerald-700 dark:text-emerald-400 font-medium text-sm sm:text-base">
              🎉 <span className="hidden sm:inline">Congratulations! You've completed all required expert sessions and unlocked Star 3!</span>
              <span className="sm:hidden">All sessions completed! Star 3 unlocked!</span>
            </p>
          ) : completed_sessions_count === 0 ? (
            <p className="text-muted-foreground text-sm sm:text-base">
              <span className="hidden sm:inline">Start watching expert sessions to earn your third star. Complete {required_sessions} sessions to unlock the Projects module.</span>
              <span className="sm:hidden">Watch {required_sessions} sessions to unlock Star 3 and Projects.</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm sm:text-base">
              <span className="hidden sm:inline">Great progress! Complete {required_sessions - completed_sessions_count} more sessions to unlock Star 3 and access Projects.</span>
              <span className="sm:hidden">{required_sessions - completed_sessions_count} more sessions needed for Star 3!</span>
            </p>
          )}
        </div>
      </div>
    </PerformantAnimatedCard>
  )
} 