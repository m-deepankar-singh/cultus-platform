import { JobReadinessLayout } from "@/components/job-readiness/JobReadinessLayout"
import { ModuleNavigation } from "@/components/job-readiness/ModuleNavigation"

export default function JobReadinessPage() {
  return (
    <JobReadinessLayout
      title="Job Readiness Program"
      description="Progress through our comprehensive program designed to prepare you for your career journey. Complete each module to earn stars and advance through Bronze, Silver, and Gold tiers."
    >
      <ModuleNavigation />
    </JobReadinessLayout>
  )
} 