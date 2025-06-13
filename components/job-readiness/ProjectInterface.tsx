'use client'

import { useState } from 'react'
import { useProjectGeneration } from '@/hooks/useProjectGeneration'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { ProjectDisplay } from './ProjectDisplay'
import { ProjectSubmissionForm } from './ProjectSubmissionForm'
import { ProjectFeedback } from './ProjectFeedback'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Lock, RefreshCw } from 'lucide-react'

interface ProjectInterfaceProps {
  productId?: string
}

// Extended interface to handle both new and submitted projects
interface SubmittedProject {
  id: string
  title: string
  description: string
  tasks: string[]
  deliverables: string[]
  submission_type: string
  status: string
  // Submission-specific fields
  project_title: string
  submission_content?: string
  submission_url?: string
  score: number
  passed: boolean
  feedback: any
  content_optimized?: boolean
  storage_info?: {
    optimized: boolean
    message: string
    original_length: number
  }
}

export function ProjectInterface({ productId }: ProjectInterfaceProps) {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any>(null)
  
  const { data: progressData, isLoading: progressLoading } = useJobReadinessProgress()
  
  // Get the actual product ID from progress data if not provided
  const actualProductId = productId || progressData?.products?.[0]?.id
  
  const { 
    data: projectData, 
    isLoading: projectLoading, 
    error: projectError,
    refetch: refetchProject 
  } = useProjectGeneration(actualProductId || '')

  // Check if projects module is unlocked - use star level instead of API response
  const currentStars = progressData?.currentStars || 0
  const requiredStars = 3
  const isUnlocked = currentStars >= requiredStars

  if (progressLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your progress...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isUnlocked) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Projects Module Locked
          </CardTitle>
          <CardDescription>
            Complete the Expert Sessions module to unlock Real-World Projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need {requiredStars} stars to access this module. 
              Current progress: {currentStars}/{requiredStars} stars.
              Complete Expert Sessions to earn your 3rd star.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!actualProductId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No Job Readiness product found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (projectLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Generating your project...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (projectError) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Project</CardTitle>
          <CardDescription>
            There was an error generating your project. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => refetchProject()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // If we have submission results, show feedback
  if (submissionResult) {
    return (
      <ProjectFeedback 
        submissionResult={submissionResult}
        onStartNew={() => {
          setSubmissionResult(null)
          setShowSubmissionForm(false)
          refetchProject()
        }}
      />
    )
  }

  // If project is already submitted and passed, show the submitted project details
  if (projectData?.project?.status === 'submitted' && (projectData.project as SubmittedProject)?.passed) {
    const submittedProject = projectData.project as SubmittedProject
    return (
      <ProjectFeedback 
        submissionResult={{
          success: true,
          submission: {
            id: submittedProject.id,
            project_title: submittedProject.project_title || submittedProject.title,
            submission_type: submittedProject.submission_type,
            submission_content: submittedProject.submission_content,
            submission_url: submittedProject.submission_url,
            score: submittedProject.score,
            passed: submittedProject.passed,
            content_optimized: submittedProject.content_optimized,
            original_content_length: submittedProject.storage_info?.original_length
          },
          feedback: submittedProject.feedback,
          star_level_updated: progressData?.currentStars === 4,
          new_star_level: progressData?.currentStars === 4 ? 'FOUR' : 'THREE',
          passing_threshold: 80,
          storage_optimization: submittedProject.storage_info ? {
            optimized: submittedProject.storage_info.optimized,
            message: submittedProject.storage_info.message,
            original_size: `${Math.round(submittedProject.storage_info.original_length / 1024)}KB`
          } : undefined
        }}
        onStartNew={() => {
          // Can't start new project if already passed
        }}
        isAlreadySubmitted={true}
      />
    )
  }

  // If project was submitted but failed, show feedback with retry option
  if (projectData?.project?.status === 'submitted' && !(projectData.project as SubmittedProject)?.passed) {
    const submittedProject = projectData.project as SubmittedProject
    return (
      <ProjectFeedback 
        submissionResult={{
          success: true,
          submission: {
            id: submittedProject.id,
            project_title: submittedProject.project_title || submittedProject.title,
            submission_type: submittedProject.submission_type,
            submission_content: submittedProject.submission_content,
            submission_url: submittedProject.submission_url,
            score: submittedProject.score,
            passed: submittedProject.passed,
            content_optimized: submittedProject.content_optimized,
            original_content_length: submittedProject.storage_info?.original_length
          },
          feedback: submittedProject.feedback,
          star_level_updated: false,
          new_star_level: progressData?.currentStars === 4 ? 'FOUR' : 'THREE',
          passing_threshold: 80,
          storage_optimization: submittedProject.storage_info ? {
            optimized: submittedProject.storage_info.optimized,
            message: submittedProject.storage_info.message,
            original_size: `${Math.round(submittedProject.storage_info.original_length / 1024)}KB`
          } : undefined
        }}
        onStartNew={() => {
          // Allow retry for failed submissions
          refetchProject()
        }}
        isAlreadySubmitted={false} // Allow retry
      />
    )
  }

  // Show submission form if user clicked "Start Project"
  if (showSubmissionForm && projectData?.project) {
    return (
      <ProjectSubmissionForm
        project={projectData.project}
        productId={actualProductId}
        onSubmissionComplete={(result) => {
          setSubmissionResult(result)
          setShowSubmissionForm(false)
        }}
        onCancel={() => setShowSubmissionForm(false)}
      />
    )
  }

  // Show project display with option to start
  return (
    <ProjectDisplay
      project={projectData?.project}
      message={projectData?.message}
      onStartProject={() => setShowSubmissionForm(true)}
      onRefreshProject={() => refetchProject()}
    />
  )
} 