'use client'

import { useMemo } from 'react'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { useExpertSessions } from '@/hooks/useExpertSessions'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { ExpertSessionList } from '@/components/job-readiness/ExpertSessionList'
import { OverallSessionProgress } from '@/components/job-readiness/OverallSessionProgress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toaster } from 'sonner'

export default function ExpertSessionsPage() {
  const { data: progressData, isLoading: progressLoading } = useJobReadinessProgress()
  
  // Memoize productId to prevent unnecessary re-fetches
  const productId = useMemo(() => {
    return progressData?.products?.[0]?.id || ''
  }, [progressData?.products?.[0]?.id])

  const { data: sessionsData, isLoading: sessionsLoading, error } = useExpertSessions(productId)

  if (progressLoading || sessionsLoading) {
    return (
      <JobReadinessLayout 
        title="Expert Sessions" 
        description="Learn from industry experts through exclusive video sessions"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading expert sessions...</p>
          </div>
        </div>
      </JobReadinessLayout>
    )
  }

  if (error) {
    return (
      <JobReadinessLayout 
        title="Expert Sessions" 
        description="Learn from industry experts through exclusive video sessions"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load expert sessions. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </JobReadinessLayout>
    )
  }

  // Check if module is unlocked (requires star level 2 or higher)
  const currentStars = progressData?.currentStars || 0
  const isUnlocked = currentStars >= 2
  
  // Also check if the module is explicitly unlocked via the modules data
  const isModuleUnlocked = progressData?.modules?.expert_sessions?.unlocked || false
  


  if (!isUnlocked && !isModuleUnlocked) {
    return (
      <JobReadinessLayout 
        title="Expert Sessions" 
        description="Learn from industry experts through exclusive video sessions"
      >
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Expert Sessions Locked</CardTitle>
            <CardDescription>
              Complete the Courses module to unlock Expert Sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You need to achieve <strong>Star 2</strong> by completing the required courses 
              before you can access expert sessions. Current level: <strong>{currentStars} stars</strong>
            </p>
          </CardContent>
        </Card>
      </JobReadinessLayout>
    )
  }

  return (
    <JobReadinessLayout 
      title="Expert Sessions" 
      description="Learn from industry experts through exclusive video sessions"
    >
      <Toaster richColors position="top-right" />
      {/* Overall Progress */}
      {sessionsData && (
        <OverallSessionProgress overallProgress={sessionsData.overall_progress} />
      )}

      {/* Sessions List */}
      {sessionsData && (
        <ExpertSessionList sessions={sessionsData.sessions} />
      )}
    </JobReadinessLayout>
  )
} 