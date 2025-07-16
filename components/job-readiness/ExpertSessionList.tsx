"use client"

import Link from "next/link"
import { PerformantAnimatedCard, CardGrid } from "@/components/ui/performant-animated-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { OptimizedProgressRing } from "@/components/ui/optimized-progress-ring"
import { Badge } from "@/components/ui/badge"
import { Play, CheckCircle2, Clock, Calendar, Target, RotateCcw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

// Phase 5: Enhanced Components Integration
import { MilestoneProgressIndicator } from './expert-sessions'

interface ExpertSessionProgress {
  watch_time_seconds: number
  completion_percentage: number
  is_completed: boolean
  completed_at: string | null
  last_milestone_reached: number
  can_resume: boolean
  resume_from_milestone: number
  resume_position_seconds: number
  milestones_unlocked: number[]
}

interface ExpertSession {
  id: string
  title: string
  description: string
  video_url: string
  video_duration: number
  created_at: string
  student_progress: ExpertSessionProgress
}

interface ExpertSessionListProps {
  sessions: ExpertSession[]
}

// Using real data from API - no feature flags needed

export function ExpertSessionList({ sessions }: ExpertSessionListProps) {
  // Handle empty sessions array with new organized layout
  if (!sessions || sessions.length === 0) {
    sessions = []
  }

  // Debug logging for progress display - using real data from API
  sessions.forEach(session => {
    const completionPercentage = session.student_progress.completion_percentage || 0
    const lastMilestone = session.student_progress.last_milestone_reached || 0
    
    if (completionPercentage > 0) {
      console.log(`Session ${session.id}: ${completionPercentage}% completion, last milestone: ${lastMilestone} (real data)`)
    }
  })

  // Sort sessions: available sessions first, completed sessions last
  const sortedSessions = [...sessions].sort((a, b) => {
    const aCompleted = a.student_progress.is_completed
    const bCompleted = b.student_progress.is_completed
    
    // If completion status is different, sort by completion (incomplete first)
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1
    }
    
    // If both have same completion status, sort by progress percentage (higher progress first for incomplete)
    if (!aCompleted && !bCompleted) {
      const aProgress = a.student_progress.completion_percentage || 0
      const bProgress = b.student_progress.completion_percentage || 0
      return bProgress - aProgress
    }
    
    // For completed sessions, sort by completion date (most recent first)
    if (aCompleted && bCompleted) {
      const aDate = a.student_progress.completed_at
      const bDate = b.student_progress.completed_at
      if (aDate && bDate) {
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      }
    }
    
    // Fallback to original order
    return 0
  })

  // Use sorted data
  const enhancedSessions = sortedSessions

  // Separate sessions by completion status for better organization
  const availableSessions = enhancedSessions.filter(session => !session.student_progress.is_completed)
  const completedSessions = enhancedSessions.filter(session => session.student_progress.is_completed)

  return (
    <div className="space-y-8">
      {/* Available Sessions Section */}
      {availableSessions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Available Sessions</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {availableSessions.length} session{availableSessions.length !== 1 ? 's' : ''} available
              </Badge>
            </div>
          </div>

          <CardGrid columns={1} gap="md">
            {availableSessions.map((session, index) => (
              <ExpertSessionCard key={session.id} session={session} index={index} />
            ))}
          </CardGrid>
        </div>
      )}

      {/* Completed Sessions Section */}
      {completedSessions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-muted-foreground">Completed Sessions</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {completedSessions.length} completed
              </Badge>
            </div>
          </div>

          <CardGrid columns={1} gap="md">
            {completedSessions.map((session, index) => (
              <ExpertSessionCard key={session.id} session={session} index={availableSessions.length + index} />
            ))}
          </CardGrid>
        </div>
      )}

      {/* Empty State */}
      {availableSessions.length === 0 && completedSessions.length === 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Expert Sessions</h2>
          </div>
          <PerformantAnimatedCard variant="glass" className="dashboard-card">
            <div className="py-12 text-center space-y-4">
              <Play className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No Expert Sessions Available</h3>
                <p className="text-muted-foreground">
                  Expert sessions will be available soon. Check back later!
                </p>
              </div>
            </div>
          </PerformantAnimatedCard>
        </div>
      )}
    </div>
  )
}

interface ExpertSessionCardProps {
  session: ExpertSession
  index: number
}

function ExpertSessionCard({ session, index }: ExpertSessionCardProps) {
  const { student_progress } = session
  const isCompleted = student_progress.is_completed
  const completionPercentage = student_progress.completion_percentage

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getButtonText = () => {
    if (isCompleted) return "Session Completed"
    if (student_progress.can_resume) {
      return `Resume from ${student_progress.resume_from_milestone}%`
    }
    return completionPercentage > 0 ? "Continue Watching" : "Start Watching"
  }

  const getButtonIcon = () => {
    if (isCompleted) return CheckCircle2
    if (student_progress.can_resume) return RotateCcw
    return Play
  }

  const ButtonIcon = getButtonIcon()

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "success"
    if (percentage >= 50) return "warning"
    return "primary"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      case 'in-progress':
        return 'bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
      default:
        return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
    }
  }

  return (
    <PerformantAnimatedCard 
      variant="glass" 
      hoverEffect="lift" 
      staggerIndex={index}
      className={cn(
        "dashboard-card group h-full flex flex-col",
        isCompleted && "opacity-75"
      )}
    >
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <h3 className={cn(
              "text-xl font-semibold",
              isCompleted ? "text-muted-foreground" : "text-foreground"
            )}>
              {session.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {session.description}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {completionPercentage > 0 && (
              <OptimizedProgressRing
                value={completionPercentage}
                size={40}
                strokeWidth={4}
                color={getProgressColor(completionPercentage)}
                showValue={false}
                delay={300 + index * 100}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isCompleted ? (
            <Badge className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
              getStatusColor('completed')
            )}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          ) : completionPercentage > 0 ? (
            <>
              <Badge className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
                getStatusColor('in-progress')
              )}>
                <Clock className="h-3 w-3 mr-1" />
                {completionPercentage}% watched
              </Badge>
              {student_progress.can_resume && (
                <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Resume {student_progress.resume_from_milestone}%
                </Badge>
              )}
            </>
          ) : (
            <Badge className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
              getStatusColor('not-started')
            )}>
              <Play className="h-3 w-3 mr-1" />
              Not started
            </Badge>
          )}
        </div>

        {/* Milestone Progress Display */}
        {student_progress.milestones_unlocked && student_progress.milestones_unlocked.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-medium">Progress Milestones</span>
              <Badge variant="outline" className="text-xs">
                {student_progress.milestones_unlocked.length}/7 reached
              </Badge>
            </div>
            <MilestoneProgressIndicator
              currentPercentage={completionPercentage}
              milestonesUnlocked={student_progress.milestones_unlocked}
              isDisabled={true}
            />
          </div>
        )}

        {/* Standard Progress Bar (Fallback when no milestones) */}
        {!student_progress.milestones_unlocked?.length && completionPercentage > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Session Details */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(session.video_duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Added {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Watch Progress Info */}
        {student_progress.watch_time_seconds > 0 && (
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              Watched: {formatDuration(student_progress.watch_time_seconds)} of {formatDuration(session.video_duration)}
            </div>
            
            {/* Resume Information */}
            {student_progress.can_resume && !isCompleted && (
              <div className="text-sky-600 bg-sky-50 dark:bg-sky-500/10 p-2 rounded text-xs">
                <div className="flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  <span>
                    You can resume from {student_progress.resume_from_milestone}% milestone 
                    ({formatDuration(student_progress.resume_position_seconds || 0)})
                  </span>
                </div>
              </div>
            )}
            
            {isCompleted && student_progress.completed_at && (
              <div className="text-emerald-600">
                Completed {formatDistanceToNow(new Date(student_progress.completed_at), { addSuffix: true })}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Action Button */}
        <div className="pt-2 mt-auto">
          {isCompleted ? (
            <div className="space-y-2">
              <AnimatedButton 
                className="w-full" 
                variant="outline" 
                disabled
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Session Completed
              </AnimatedButton>
              <p className="text-xs text-center text-muted-foreground">
                Completed sessions cannot be re-watched
              </p>
            </div>
          ) : (
            <Link href={`/app/job-readiness/expert-sessions/${session.id}`}>
              <AnimatedButton 
                className={cn(
                  "w-full",
                  student_progress.can_resume
                    ? "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
                    : "bg-gradient-to-r from-primary to-accent"
                )}
              >
                <ButtonIcon className="h-4 w-4 mr-2" />
                {getButtonText()}
              </AnimatedButton>
            </Link>
          )}
        </div>
      </div>
    </PerformantAnimatedCard>
  )
}