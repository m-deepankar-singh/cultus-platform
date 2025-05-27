import { useQuery } from "@tanstack/react-query"

interface ExamConfig {
  id: string
  product_id: string
  is_enabled: boolean
  question_count: number
  pass_threshold: number
  created_at: string
  updated_at: string
  system_prompt: string
  time_limit_minutes: number
}

interface PromotionExamEligibilityResponse {
  is_eligible: boolean
  star_level: string
  current_tier: string
  target_tier: string
  exam_config: ExamConfig
  previous_attempts: any[]
}

export function usePromotionExamEligibility() {
  return useQuery<PromotionExamEligibilityResponse>({
    queryKey: ['job-readiness', 'promotion-exam-eligibility'],
    queryFn: async () => {
      const response = await fetch('/api/app/job-readiness/promotion-exam/eligibility')
      if (!response.ok) {
        throw new Error('Failed to check promotion exam eligibility')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - eligibility can change with progress
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
} 