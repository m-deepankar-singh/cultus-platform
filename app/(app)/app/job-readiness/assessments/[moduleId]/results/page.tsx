import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentResults } from '@/components/job-readiness/AssessmentResults'

interface AssessmentResultsPageProps {
  params: {
    moduleId: string
  }
}

export default function AssessmentResultsPage({ params }: AssessmentResultsPageProps) {
  return (
    <JobReadinessLayout>
      <div className="max-w-4xl mx-auto">
        <AssessmentResults moduleId={params.moduleId} />
      </div>
    </JobReadinessLayout>
  )
} 