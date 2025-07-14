import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentInterface } from '@/components/job-readiness/AssessmentInterface'
import { AdaptiveParticles } from '@/components/ui/floating-particles'

interface AssessmentPageProps {
  params: Promise<{
    moduleId: string
  }>
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const resolvedParams = await params
  
  return (
    <div className="relative min-h-screen">
      <AdaptiveParticles />
      
      <div className="relative space-y-8">
        <JobReadinessLayout 
          title="Assessment"
          description="Complete this assessment to unlock your first star and advance your learning journey"
          showProgress={false}
        >
          <div className="max-w-4xl mx-auto">
            <AssessmentInterface moduleId={resolvedParams.moduleId} />
          </div>
        </JobReadinessLayout>
      </div>
    </div>
  )
} 