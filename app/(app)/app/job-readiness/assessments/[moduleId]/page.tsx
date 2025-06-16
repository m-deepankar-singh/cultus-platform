import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentInterface } from '@/components/job-readiness/AssessmentInterface'

interface AssessmentPageProps {
  params: Promise<{
    moduleId: string
  }>
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const resolvedParams = await params
  
  return (
    <JobReadinessLayout>
      <div className="max-w-4xl mx-auto">
        <AssessmentInterface moduleId={resolvedParams.moduleId} />
      </div>
    </JobReadinessLayout>
  )
} 