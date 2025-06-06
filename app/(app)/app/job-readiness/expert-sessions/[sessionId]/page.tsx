'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { useExpertSessions } from '@/hooks/useExpertSessions'
import { useUpdateExpertSessionProgress } from '@/hooks/useJobReadinessMutations'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { ExpertSessionPlayer } from '@/components/job-readiness/ExpertSessionPlayer'
import { SessionProgress } from '@/components/job-readiness/SessionProgress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, CheckCircle2, Clock, Play, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Toaster } from 'sonner'

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

  if (error || !session) {
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

  // Import the progress update event type
  const handleProgressUpdate = (event: {
    sessionId: string
    currentTime: number
    duration: number
    triggerType: string
    milestone?: number
    forceCompletion?: boolean
  }) => {
    updateProgressMutation.mutate(event, {
      onSuccess: (data) => {
        console.log('Progress updated successfully:', data)
        // Success handling is managed in the hook with toasts
      },
      onError: (error) => {
        console.error('Failed to update expert session progress:', error)
        // Error handling is already managed in the hook
      }
    })
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

  // If session is completed, show completion message instead of allowing re-access
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

        {/* Completion Message */}
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
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Component */}
        <SessionProgress session={session} />

        {/* Video Player */}
        <ExpertSessionPlayer
          session={session}
          onProgressUpdate={handleProgressUpdate}
          isUpdatingProgress={updateProgressMutation.isPending}
        />

        {/* Session Details */}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </JobReadinessLayout>
  )
} 