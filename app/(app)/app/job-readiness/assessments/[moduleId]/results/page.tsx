import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentResults } from '@/components/job-readiness/AssessmentResults'

interface AssessmentResultsPageProps {
  params: Promise<{
    moduleId: string
  }>
}

export default async function AssessmentResultsPage({ params }: AssessmentResultsPageProps) {
  const { moduleId } = await params
  
  return (
    <JobReadinessLayout>
      <div className="max-w-4xl mx-auto">
        <AssessmentResults moduleId={moduleId} />
      </div>
    </JobReadinessLayout>
  )
} 