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

// Enhanced Components Integration
import { 
  EnhancedExpertSessionPlayer,
  ExpertSessionProgressProvider,
  MilestoneProgressIndicator 
} from '@/components/job-readiness/expert-sessions'

// Legacy import for fallback
import { ExpertSessionPlayer } from '@/components/job-readiness/ExpertSessionPlayer'
import { SessionProgress } from '@/components/job-readiness/SessionProgress'

// Using real data from API - no feature flags needed
const USE_ENHANCED_VIDEO_PLAYER = true

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

  // Use session data directly from API - no enhancement needed
  const enhancedSession = session

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

  // Enhanced progress update handler
  const handleProgressUpdate = async (event: {
    sessionId: string
    currentTime: number
    duration: number
    triggerType: string
    milestone?: number
    forceCompletion?: boolean
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
        <div className="mb-4 sm:mb-6">
          <Link href="/app/job-readiness/expert-sessions">
            <Button variant="outline" size="sm" className="text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Back to Expert Sessions</span>
              <span className="xs:hidden">Back</span>
            </Button>
          </Link>
        </div>

        {/* Completion Message */}
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="space-y-4 sm:space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Session Completed!</h2>
                  <p className="text-sm sm:text-base text-muted-foreground px-2">
                    You have successfully completed "<strong className="break-words">{session.title}</strong>"
                  </p>
                </div>

                {/* Milestone Achievement Display */}
                {enhancedSession.student_progress.milestones_unlocked.length > 0 && (
                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-3 sm:p-4">
                    <div className="space-y-2 sm:space-y-3">
                      <p className="text-sky-800 dark:text-sky-300 font-medium text-sm sm:text-base">Milestones Achieved</p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                        {enhancedSession.student_progress.milestones_unlocked.map(milestone => (
                          <Badge key={milestone} variant="default" className="bg-sky-600 dark:bg-sky-500 text-white text-xs">
                            {milestone}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-2">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 mx-auto sm:mx-0" />
                    <span className="text-emerald-800 dark:text-emerald-300 font-medium text-sm sm:text-base">
                      <span className="hidden sm:inline">Completed on </span>
                      <span className="sm:hidden">Completed </span>
                      {(() => {
                        try {
                          const completedDate = new Date(session.student_progress.completed_at!);
                          if (isNaN(completedDate.getTime())) {
                            return 'recently';
                          }
                          const formatted = completedDate.toLocaleDateString();
                          return window.innerWidth < 640 ? formatted.split('/').join('/') : formatted;
                        } catch (error) {
                          console.warn('Invalid completion date:', session.student_progress.completed_at);
                          return 'recently';
                        }
                      })()}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  <span className="hidden sm:inline">For security and progress tracking purposes, completed expert sessions cannot be re-watched. Continue with your next learning objectives.</span>
                  <span className="sm:hidden">Completed sessions cannot be re-watched. Continue with next learning objectives.</span>
                </p>

                <div className="pt-2 sm:pt-4">
                  <Link href="/app/job-readiness/expert-sessions">
                    <Button size="sm" className="w-full sm:w-auto sm:size-lg bg-gradient-to-r from-primary to-accent text-sm sm:text-base px-6 py-2 sm:px-8 sm:py-3">
                      <span className="hidden sm:inline">Continue to Next Sessions</span>
                      <span className="sm:hidden">Continue</span>
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
      <div className="mb-4 sm:mb-6">
        <Link href="/app/job-readiness/expert-sessions">
          <Button variant="outline" size="sm" className="text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Back to Expert Sessions</span>
            <span className="xs:hidden">Back</span>
          </Button>
        </Link>
      </div>

      {/* Session Header */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-2xl break-words">{session.title}</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {session.description}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 sm:flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isCompleted ? (
                    <Badge variant="default" className="bg-green-500 text-white">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Completed
                    </Badge>
                  ) : completionPercentage > 0 ? (
                    <Badge variant="secondary">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">{Math.floor(completionPercentage)}% watched</span>
                      <span className="sm:hidden">{Math.floor(completionPercentage)}%</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Play className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Not started</span>
                      <span className="sm:hidden">New</span>
                    </Badge>
                  )}
                  
                  {/* Resume Progress Badge */}
                  {USE_ENHANCED_VIDEO_PLAYER && enhancedSession.student_progress.can_resume && (
                    <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400">
                      <span className="hidden sm:inline">Resume from {enhancedSession.student_progress.resume_from_milestone}%</span>
                      <span className="sm:hidden">Resume {enhancedSession.student_progress.resume_from_milestone}%</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Milestone Progress Display */}
        {USE_ENHANCED_VIDEO_PLAYER && enhancedSession.student_progress.milestones_unlocked.length > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Progress Milestones</CardTitle>
              <CardDescription className="text-sm">
                Your milestone achievements for this session
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="overflow-x-auto">
                <MilestoneProgressIndicator
                  currentPercentage={completionPercentage}
                  milestonesUnlocked={enhancedSession.student_progress.milestones_unlocked}
                  isDisabled={true}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Component (Fallback) */}
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
          // Video Player (Fallback)
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

        {/* Session Details */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">{formatDuration(session.video_duration)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Added</p>
                <p className="text-sm text-muted-foreground break-words">
                  <span className="hidden sm:inline">{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                  <span className="sm:hidden">{formatDistanceToNow(new Date(session.created_at), { addSuffix: true }).replace('about ', '')}</span>
                </p>
              </div>
              {session.student_progress.watch_time_seconds > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Watch Time</p>
                  <p className="text-sm text-muted-foreground break-words">
                    {formatDuration(session.student_progress.watch_time_seconds)} of {formatDuration(session.video_duration)}
                  </p>
                </div>
              )}
              {isCompleted && session.student_progress.completed_at && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-sm text-muted-foreground break-words">
                    {(() => {
                      try {
                        const completedDate = new Date(session.student_progress.completed_at);
                        if (isNaN(completedDate.getTime())) {
                          return 'recently';
                        }
                        const formatted = formatDistanceToNow(completedDate, { addSuffix: true });
                        return window.innerWidth < 640 ? formatted.replace('about ', '') : formatted;
                      } catch (error) {
                        console.warn('Invalid completion date:', session.student_progress.completed_at);
                        return 'recently';
                      }
                    })()}
                  </p>
                </div>
              )}
              
              {/* Additional Details for Enhanced Player */}
              {USE_ENHANCED_VIDEO_PLAYER && (
                <>
                  {enhancedSession.student_progress.milestones_unlocked.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Milestones Achieved</p>
                      <p className="text-sm text-muted-foreground">
                        {enhancedSession.student_progress.milestones_unlocked.length} of 5 milestones reached
                      </p>
                    </div>
                  )}
                  {enhancedSession.student_progress.can_resume && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Resume Position</p>
                      <p className="text-sm text-muted-foreground break-words">
                        <span className="hidden sm:inline">{enhancedSession.student_progress.resume_from_milestone}% milestone ({formatDuration(enhancedSession.student_progress.resume_position_seconds)})</span>
                        <span className="sm:hidden">{enhancedSession.student_progress.resume_from_milestone}% ({formatDuration(enhancedSession.student_progress.resume_position_seconds)})</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </JobReadinessLayout>
  )
} 