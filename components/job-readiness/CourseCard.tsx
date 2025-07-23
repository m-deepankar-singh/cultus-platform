'use client'

import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, CheckCircle, Play, Lock } from 'lucide-react'
import Link from 'next/link'

interface CourseProgress {
  status: string
  progress_percentage: number
  last_updated: string
  completed_at?: string
}

interface Course {
  id: string
  name: string
  type: string
  configuration: {
    description?: string
    estimated_duration_hours?: number
    difficulty_level?: string
    required_tier?: string
  }
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  progress: CourseProgress
  lessons_count: number
  description: string
  completion_percentage: number
}

interface CourseCardProps {
  course: Course
  currentTier: 'BRONZE' | 'SILVER' | 'GOLD'
  staggerIndex?: number
}

const tierGlassColors = {
  BRONZE: 'border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/5',
  SILVER: 'border-slate-500/20 bg-slate-500/5 dark:bg-slate-500/5',
  GOLD: 'border-yellow-500/20 bg-yellow-500/5 dark:bg-yellow-500/5'
}

const statusColors = {
  'NotStarted': 'bg-neutral-500/20 text-neutral-700 dark:bg-neutral-500/10 dark:text-neutral-300',
  'InProgress': 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  'Completed': 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
}

const getProgressColor = (isCompleted: boolean, isInProgress: boolean): "primary" | "success" | "warning" | "danger" => {
  if (isCompleted) return "success"
  if (isInProgress) return "warning"
  return "primary"
}

export function CourseCard({ course, currentTier, staggerIndex = 0 }: CourseCardProps) {
  const isLocked = !course.is_unlocked
  const isCompleted = course.is_completed
  const isInProgress = course.progress?.status === 'InProgress'
  const progressPercentage = course.completion_percentage || course.progress?.progress_percentage || 0
  
  const estimatedHours = course.configuration?.estimated_duration_hours || 0
  
  const statusText = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'
  const statusColor = statusColors[isCompleted ? 'Completed' : isInProgress ? 'InProgress' : 'NotStarted']

  return (
    <PerformantAnimatedCard 
      variant="glass" 
      hoverEffect="lift"
      className={`dashboard-card h-full flex flex-col ${
        isLocked 
          ? 'opacity-60 border-neutral-500/20 bg-neutral-500/5' 
          : isCompleted
          ? tierGlassColors[currentTier]
          : 'border-blue-500/20 bg-blue-500/5'
      }`}
      staggerIndex={staggerIndex}
    >
      <div className="space-y-6 flex-1 flex flex-col">
        {/* Header with Progress Ring */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <div className={`p-2 sm:p-3 rounded-full backdrop-blur-sm border flex-shrink-0 ${
              isLocked 
                ? 'bg-neutral-500/20 border-neutral-500/20' 
                : isCompleted 
                ? 'bg-emerald-500/20 border-emerald-500/20'
                : 'bg-blue-500/20 border-blue-500/20'
            }`}>
              {isLocked ? (
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-500" />
              ) : isCompleted ? (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 sm:line-clamp-1">{course.name}</h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
                <Badge variant="outline" className="text-xs backdrop-blur-sm flex-shrink-0">
                  Course {course.sequence}
                </Badge>
                <Badge className={`${statusColor} text-xs`}>
                  {statusText}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 pr-2">
                {course.description || course.configuration?.description || 'Learn essential skills through hands-on practice and examples.'}
              </p>
            </div>
          </div>
          
          {/* Progress Ring - responsive size */}
          {progressPercentage > 0 && (
            <div className="flex-shrink-0">
              <div className="sm:hidden">
                <OptimizedProgressRing
                  value={progressPercentage}
                  size={50}
                  color={getProgressColor(isCompleted, isInProgress)}
                  showValue={true}
                  delay={300 + staggerIndex * 100}
                />
              </div>
              <div className="hidden sm:block">
                <OptimizedProgressRing
                  value={progressPercentage}
                  size={60}
                  color={getProgressColor(isCompleted, isInProgress)}
                  showValue={true}
                  delay={300 + staggerIndex * 100}
                />
              </div>
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="whitespace-nowrap">{course.lessons_count} lessons</span>
          </div>
          {estimatedHours > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="whitespace-nowrap">{estimatedHours}h estimated</span>
            </div>
          )}
        </div>

        {/* Progress Bar (alternative visual when no ring) */}
        {progressPercentage > 0 && progressPercentage < 100 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 backdrop-blur-sm">
              <div 
                className="h-2 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${progressPercentage}%`,
                  transitionDelay: `${400 + staggerIndex * 100}ms`
                }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-auto pt-4">
          {isLocked ? (
            <AnimatedButton variant="outline" disabled className="w-full">
              <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Locked - Complete Previous Requirements</span>
              <span className="sm:hidden">Locked</span>
            </AnimatedButton>
          ) : (
            <Link href={`/app/job-readiness/courses/${course.id}`} className="block">
              <AnimatedButton 
                className={`w-full ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                    : 'bg-gradient-to-r from-primary to-accent'
                }`}
                variant={isCompleted ? "outline" : "default"}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">Review Course</span>
                    <span className="sm:hidden">Review</span>
                  </>
                ) : isInProgress ? (
                  <>
                    <Play className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">Continue Learning</span>
                    <span className="sm:hidden">Continue</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="hidden sm:inline">Start Course</span>
                    <span className="sm:hidden">Start</span>
                  </>
                )}
              </AnimatedButton>
            </Link>
          )}
        </div>
      </div>
    </PerformantAnimatedCard>
  )
} 