'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { useExpertSessions } from '@/hooks/useExpertSessions'
import { useUpdateExpertSessionProgress } from '@/hooks/useJobReadinessMutations'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, CheckCircle2, Clock, Play, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Toaster } from 'sonner'

// Phase 5: Enhanced Components Integration
import { 
  EnhancedExpertSessionPlayer,
  ExpertSessionProgressProvider,
  MilestoneProgressIndicator 
} from '@/components/job-readiness/expert-sessions'

// Legacy import for fallback
import { ExpertSessionPlayer } from '@/components/job-readiness/ExpertSessionPlayer'
import { SessionProgress } from '@/components/job-readiness/SessionProgress'

// Feature flag for enhanced video player (Phase 6: Deployment)
const USE_ENHANCED_VIDEO_PLAYER = process.env.NEXT_PUBLIC_ENHANCED_EXPERT_SESSIONS === 'true' || true // Default to true for development

export default function ExpertSessionViewerPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params?.sessionId as string

  const { data: progressData } = useJobReadinessProgress()
  
  // Memoize productId to prevent unnecessary re-fetches
  const productId = useMemo(() => {
    return progressData?.products?.[0]?.id || ''
  }, [progressData?.products?.[0]?.id])
  
  const { data: sessionsData, isLoading, error } = useExpertSessions(productId)
  const updateProgressMutation = useUpdateExpertSessionProgress()

  // Find the current session
  const session = sessionsData?.sessions?.find(s => s.id === sessionId)

  // Enhanced session data preparation for Phase 2 integration
  const enhancedSession = useMemo(() => {
    if (!session) return null
    
    // Since we're in development, simulate Phase 2 enhanced API response structure
    // In production, this data will come from the enhanced API
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
        can_resume: watchTime > 0 && !session.student_progress.is_completed,
        resume_from_milestone: lastMilestone,
        resume_position_seconds: watchTime,
        milestones_unlocked: milestonesUnlocked,
        last_milestone_reached: lastMilestone
      }
    }
  }, [session])

  if (isLoading) {
    return (
      <JobReadinessLayout title="Loading Session...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading expert session...</p>
          </div>
        </div>
      </JobReadinessLayout>
    )
  }

  if (error || !session || !enhancedSession) {
    return (
      <JobReadinessLayout title="Session Not Found">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error ? 'Failed to load expert session.' : 'Expert session not found.'} 
              Please check the URL or try again.
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Link href="/app/job-readiness/expert-sessions">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Expert Sessions
              </Button>
            </Link>
          </div>
        </div>
      </JobReadinessLayout>
    )
  }

  // Enhanced progress update handler for Phase 2 integration
  const handleProgressUpdate = async (event: {
    sessionId: string
    currentTime: number
    duration: number
    triggerType: string
    milestone?: number
    forceCompletion?: boolean
    // Phase 2: Additional fields
    session_started?: boolean
    session_ended?: boolean
    pause_duration?: number
    resume_from_milestone?: number
  }) => {
    try {
      const result = await updateProgressMutation.mutateAsync(event)
      return result
    } catch (error) {
      throw error
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const isCompleted = session.student_progress.is_completed
  const completionPercentage = session.student_progress.completion_percentage

  // If session is completed, show completion message
  if (isCompleted) {
    return (
      <JobReadinessLayout showProgress={false}>
        <Toaster richColors position="top-right" />
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/app/job-readiness/expert-sessions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Expert Sessions
            </Button>
          </Link>
        </div>

        {/* Enhanced Completion Message */}
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-gray-900">Session Completed!</h2>
                  <p className="text-gray-600">
                    You have successfully completed "<strong>{session.title}</strong>"
                  </p>
                </div>

                {/* Milestone Achievement Display */}
                {enhancedSession.student_progress.milestones_unlocked.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="space-y-2">
                      <p className="text-blue-800 font-medium">Milestones Achieved</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {enhancedSession.student_progress.milestones_unlocked.map(milestone => (
                          <Badge key={milestone} variant="default" className="bg-blue-600 text-white">
                            {milestone}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      Completed on {new Date(session.student_progress.completed_at!).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  For security and progress tracking purposes, completed expert sessions cannot be re-watched. 
                  Continue with your next learning objectives.
                </p>

                <div className="pt-4">
                  <Link href="/app/job-readiness/expert-sessions">
                    <Button size="lg" className="w-full sm:w-auto">
                      Continue to Next Sessions
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </JobReadinessLayout>
    )
  }

  return (
    <JobReadinessLayout showProgress={false}>
      <Toaster richColors position="top-right" />
      
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/app/job-readiness/expert-sessions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Expert Sessions
          </Button>
        </Link>
      </div>

      {/* Session Header */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{session.title}</CardTitle>
                <CardDescription className="text-base">
                  {session.description}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <Badge variant="default" className="bg-green-500 text-white">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Completed
                  </Badge>
                ) : completionPercentage > 0 ? (
                  <Badge variant="secondary">
                    <Clock className="h-4 w-4 mr-1" />
                    {completionPercentage}% watched
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Play className="h-4 w-4 mr-1" />
                    Not started
                  </Badge>
                )}
                
                {/* Enhanced Progress Badge */}
                {USE_ENHANCED_VIDEO_PLAYER && enhancedSession.student_progress.can_resume && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                    Resume from {enhancedSession.student_progress.resume_from_milestone}%
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Enhanced Milestone Progress Display */}
        {USE_ENHANCED_VIDEO_PLAYER && enhancedSession.student_progress.milestones_unlocked.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress Milestones</CardTitle>
              <CardDescription>
                Your milestone achievements for this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MilestoneProgressIndicator
                currentPercentage={completionPercentage}
                milestonesUnlocked={enhancedSession.student_progress.milestones_unlocked}
                isDisabled={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Legacy Progress Component (Fallback) */}
        {!USE_ENHANCED_VIDEO_PLAYER && (
          <SessionProgress session={session} />
        )}

        {/* Video Player with Context Provider */}
        {USE_ENHANCED_VIDEO_PLAYER ? (
                     <ExpertSessionProgressProvider
             sessionId={sessionId}
             initialProgressData={{
               currentMilestone: enhancedSession.student_progress.last_milestone_reached || 0,
               milestonesUnlocked: enhancedSession.student_progress.milestones_unlocked,
               watchTimeSeconds: enhancedSession.student_progress.watch_time_seconds,
               completionPercentage: enhancedSession.student_progress.completion_percentage,
               canResume: enhancedSession.student_progress.can_resume,
               resumeFromMilestone: enhancedSession.student_progress.resume_from_milestone,
               resumePositionSeconds: enhancedSession.student_progress.resume_position_seconds
             }}
             onProgressUpdate={async (data) => {
               // Transform ProgressUpdate to our enhanced handler format
               return await handleProgressUpdate({
                 sessionId,
                 currentTime: data.currentTime,
                 duration: data.duration,
                 triggerType: data.triggerType,
                 milestone: data.milestone,
                 forceCompletion: data.forceCompletion,
                 session_started: data.sessionStarted,
                 session_ended: data.sessionEnded,
                 pause_duration: data.pauseDuration,
                 resume_from_milestone: data.resumeFromMilestone
               })
             }}
           >
             <EnhancedExpertSessionPlayer
               session={enhancedSession}
               onProgressUpdate={async (event) => {
                 return await handleProgressUpdate({
                   ...event,
                   sessionId: sessionId
                 })
               }}
               isUpdatingProgress={updateProgressMutation.isPending}
             />
          </ExpertSessionProgressProvider>
        ) : (
          // Legacy Video Player (Fallback)
          <ExpertSessionPlayer
            session={session}
            onProgressUpdate={(event) => {
              updateProgressMutation.mutate(event, {
                onSuccess: (data) => {},
                onError: (error) => {
                  console.error('Failed to update expert session progress:', error)
                }
              })
            }}
            isUpdatingProgress={updateProgressMutation.isPending}
          />
        )}

        {/* Enhanced Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Duration</p>
                <p className="text-muted-foreground">{formatDuration(session.video_duration)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Added</p>
                <p className="text-muted-foreground">
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </p>
              </div>
              {session.student_progress.watch_time_seconds > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Watch Time</p>
                  <p className="text-muted-foreground">
                    {formatDuration(session.student_progress.watch_time_seconds)} of {formatDuration(session.video_duration)}
                  </p>
                </div>
              )}
              {isCompleted && session.student_progress.completed_at && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-muted-foreground">
                    {formatDistanceToNow(new Date(session.student_progress.completed_at), { addSuffix: true })}
                  </p>
                </div>
              )}
              
              {/* Enhanced Details for Enhanced Player */}
              {USE_ENHANCED_VIDEO_PLAYER && (
                <>
                  {enhancedSession.student_progress.milestones_unlocked.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Milestones Achieved</p>
                      <p className="text-muted-foreground">
                        {enhancedSession.student_progress.milestones_unlocked.length} of 7 milestones reached
                      </p>
                    </div>
                  )}
                  {enhancedSession.student_progress.can_resume && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Resume Position</p>
                      <p className="text-muted-foreground">
                        {enhancedSession.student_progress.resume_from_milestone}% milestone ({formatDuration(enhancedSession.student_progress.resume_position_seconds)})
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Development Info (Remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">Development Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Enhanced Player:</strong> {USE_ENHANCED_VIDEO_PLAYER ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Session ID:</strong> {sessionId}</p>
                <p><strong>Can Resume:</strong> {enhancedSession.student_progress.can_resume ? 'Yes' : 'No'}</p>
                <p><strong>Resume Milestone:</strong> {enhancedSession.student_progress.resume_from_milestone}%</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </JobReadinessLayout>
  )
} 