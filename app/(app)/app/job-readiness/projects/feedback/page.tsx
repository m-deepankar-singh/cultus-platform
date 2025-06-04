import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { ProjectFeedback } from '@/components/job-readiness/ProjectFeedback'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface SearchParams {
  submissionId?: string
}

interface ProjectFeedbackPageProps {
  searchParams: SearchParams
}

export default function ProjectFeedbackPage({ searchParams }: ProjectFeedbackPageProps) {
  const { submissionId } = searchParams

  // This page would typically fetch submission results by ID
  // For now, we'll redirect users to the main projects page
  // since the ProjectInterface handles feedback display inline

  return (
    <JobReadinessLayout
      title="Project Feedback"
      description="View detailed feedback and results for your submitted project."
    >
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Feedback Available in Projects</h3>
              <p className="text-muted-foreground max-w-md">
                Project feedback is displayed directly in the Projects module after submission. 
                Please visit the Projects page to view your results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </JobReadinessLayout>
  )
} 