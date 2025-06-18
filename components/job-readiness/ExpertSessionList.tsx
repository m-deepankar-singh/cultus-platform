"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, CheckCircle2, Clock, Calendar, Target, RotateCcw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

// Phase 5: Enhanced Components Integration
import { MilestoneProgressIndicator } from './expert-sessions'

interface ExpertSessionProgress {
  watch_time_seconds: number
  completion_percentage: number
  is_completed: boolean
  completed_at: string | null
  // Phase 2: Enhanced progress fields (simulated for now)
  last_milestone_reached?: number
  can_resume?: boolean
  resume_from_milestone?: number
  resume_position_seconds?: number
  milestones_unlocked?: number[]
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

// Feature flag for enhanced display (Phase 6: Deployment)
const USE_ENHANCED_PROGRESS_DISPLAY = process.env.NEXT_PUBLIC_ENHANCED_EXPERT_SESSIONS === 'true' || true // Default to true for development

export function ExpertSessionList({ sessions }: ExpertSessionListProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Play className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Expert Sessions Available</h3>
              <p className="text-muted-foreground">
                Expert sessions will be available soon. Check back later!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Enhance sessions data with milestone information
  const enhancedSessions = sessions.map(session => {
    const completionPercentage = session.student_progress.completion_percentage || 0
    const watchTime = session.student_progress.watch_time_seconds || 0
    
    // Calculate simulated milestone data based on completion percentage
    const lastMilestone = Math.floor(completionPercentage / 10) * 10
    const milestonesUnlocked = lastMilestone > 0 
      ? Array.from({ length: Math.floor(lastMilestone / 10) }, (_, i) => (i + 1) * 10)
      : []
    
    return {
      ...session,
      student_progress: {
        ...session.student_progress,
        // Phase 2: Enhanced resume functionality (simulate for now)
        last_milestone_reached: lastMilestone,
        can_resume: watchTime > 0 && !session.student_progress.is_completed,
        resume_from_milestone: lastMilestone,
        resume_position_seconds: watchTime,
        milestones_unlocked: milestonesUnlocked
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Available Sessions</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
          </Badge>
          {USE_ENHANCED_PROGRESS_DISPLAY && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
              <Target className="h-3 w-3 mr-1" />
              Enhanced Progress
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {enhancedSessions.map((session) => (
          <ExpertSessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

interface ExpertSessionCardProps {
  session: ExpertSession
}

function ExpertSessionCard({ session }: ExpertSessionCardProps) {
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
    if (USE_ENHANCED_PROGRESS_DISPLAY && student_progress.can_resume) {
      return `Resume from ${student_progress.resume_from_milestone}%`
    }
    return completionPercentage > 0 ? "Continue Watching" : "Start Watching"
  }

  const getButtonIcon = () => {
    if (isCompleted) return CheckCircle2
    if (USE_ENHANCED_PROGRESS_DISPLAY && student_progress.can_resume) return RotateCcw
    return Play
  }

  const ButtonIcon = getButtonIcon()

  return (
    <Card className={`transition-all ${isCompleted ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className={`text-xl ${isCompleted ? 'text-gray-600' : ''}`}>
              {session.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {session.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isCompleted ? (
              <Badge variant="default" className="bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : completionPercentage > 0 ? (
              <>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {completionPercentage}% watched
                </Badge>
                {/* Enhanced Progress Badges */}
                {USE_ENHANCED_PROGRESS_DISPLAY && student_progress.can_resume && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Resume {student_progress.resume_from_milestone}%
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="outline">
                <Play className="h-3 w-3 mr-1" />
                Not started
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enhanced Milestone Progress Display */}
        {USE_ENHANCED_PROGRESS_DISPLAY && student_progress.milestones_unlocked && student_progress.milestones_unlocked.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Progress Milestones</span>
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

        {/* Standard Progress Bar (Legacy/Fallback) */}
        {(!USE_ENHANCED_PROGRESS_DISPLAY || !student_progress.milestones_unlocked?.length) && completionPercentage > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
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
            
            {/* Enhanced Resume Information */}
            {USE_ENHANCED_PROGRESS_DISPLAY && student_progress.can_resume && !isCompleted && (
              <div className="text-blue-600 bg-blue-50 p-2 rounded text-xs">
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
              <div className="text-green-600">
                Completed {formatDistanceToNow(new Date(student_progress.completed_at), { addSuffix: true })}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Action Button */}
        <div className="pt-2">
          {isCompleted ? (
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline" 
                disabled
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Session Completed
              </Button>
              <p className="text-xs text-center text-gray-500">
                Completed sessions cannot be re-watched
              </p>
            </div>
          ) : (
            <Link href={`/app/job-readiness/expert-sessions/${session.id}`}>
              <Button 
                className={`w-full ${USE_ENHANCED_PROGRESS_DISPLAY && student_progress.can_resume ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
                variant="default"
              >
                <ButtonIcon className="h-4 w-4 mr-2" />
                {getButtonText()}
              </Button>
            </Link>
          )}
        </div>

        {/* Development Info (Remove in production) */}
        {process.env.NODE_ENV === 'development' && USE_ENHANCED_PROGRESS_DISPLAY && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            <div><strong>Dev Info:</strong></div>
            <div>Milestones: [{student_progress.milestones_unlocked?.join(', ')}]</div>
            <div>Can Resume: {student_progress.can_resume ? 'Yes' : 'No'}</div>
            <div>Resume From: {student_progress.resume_from_milestone}%</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 