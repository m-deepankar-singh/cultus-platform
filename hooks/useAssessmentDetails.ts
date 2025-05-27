import { useQuery } from "@tanstack/react-query"

interface AssessmentOption {
  id: string
  text: string
}

interface AssessmentQuestion {
  id: string
  question_text: string
  question_type: string
  options: AssessmentOption[]
}

interface TierAssessmentConfig {
  bronze_min_score: number
  bronze_max_score: number
  silver_min_score: number
  silver_max_score: number
  gold_min_score: number
  gold_max_score: number
}

interface AssessmentDetails {
  id: string
  name: string
  instructions: string
  time_limit_minutes: number
  passing_threshold: number
  questions: AssessmentQuestion[]
  is_submitted: boolean
  retakes_allowed: boolean
  tier_assessment_config: TierAssessmentConfig
  current_student_tier: string
  current_star_level: string | null
}

interface AssessmentDetailsResponse {
  assessment: AssessmentDetails
  in_progress_attempt: any | null
}

export function useAssessmentDetails(moduleId: string) {
  return useQuery<AssessmentDetailsResponse>({
    queryKey: ['job-readiness', 'assessment-details', moduleId],
    queryFn: async () => {
      const response = await fetch(`/api/app/job-readiness/assessments/${moduleId}/details`)
      if (!response.ok) {
        throw new Error('Failed to fetch assessment details')
      }
      return response.json()
    },
    enabled: !!moduleId,
    staleTime: 10 * 60 * 1000, // 10 minutes - questions don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
} 