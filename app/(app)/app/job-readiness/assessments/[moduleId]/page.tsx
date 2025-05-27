import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentInterface } from '@/components/job-readiness/AssessmentInterface'

interface AssessmentPageProps {
  params: {
    moduleId: string
  }
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  return (
    <JobReadinessLayout>
      <div className="max-w-4xl mx-auto">
        <AssessmentInterface moduleId={params.moduleId} />
      </div>
    </JobReadinessLayout>
  )
} 