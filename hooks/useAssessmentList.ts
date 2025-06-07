import { useQuery } from "@tanstack/react-query"

interface AssessmentProgress {
  status: string
  module_id: string
  student_id: string
  completed_at: string | null
  last_updated: string
  progress_details: {
    score?: number
    passed?: boolean
    submitted?: boolean
    correct_answers?: number
    total_questions?: number
  } | null
  progress_percentage: number
}

interface Assessment {
  id: string
  name: string
  type: string
  configuration: {
    pass_threshold: number
    duration_minutes: number
  }
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  is_tier_determining: boolean
  assessment_type: string
  progress: AssessmentProgress | null
  questions_count: number
  last_score: number | null
  tier_achieved: string | null
}

interface AssessmentListResponse {
  assessments: Assessment[]
  tier_criteria: {
    bronze: { min_score: number; max_score: number }
    silver: { min_score: number; max_score: number }
    gold: { min_score: number; max_score: number }
  }
  current_tier: string | null
  current_star_level: string
  all_assessments_complete: boolean
  completed_assessments_count: number
  total_assessments_count: number
  product: {
    id: string
    name: string
    type: string
  }
}

export function useAssessmentList(productId: string) {
  return useQuery<AssessmentListResponse>({
    queryKey: ['job-readiness', 'assessments', productId],
    queryFn: async () => {
      const response = await fetch(`/api/app/job-readiness/assessments?productId=${productId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness assessments')
      }
      return response.json()
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 