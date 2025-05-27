import { useMutation, useQueryClient } from "@tanstack/react-query"

interface ExamAnswer {
  question_id: string
  selected_option: string
}

interface ExamQuestion {
  id: string
  question: string
  options: Array<{
    id: string
    text: string
  }>
}

interface SubmitPromotionExamRequest {
  exam_session_id: string
  product_id: string
  star_level: string
  current_tier: string
  target_tier: string
  questions: ExamQuestion[]
  answers: ExamAnswer[]
}

interface ExamResults {
  score: number
  correct_answers: number
  total_questions: number
  pass_threshold: number
  passed: boolean
}

interface SubmitPromotionExamResponse {
  message: string
  exam_results: ExamResults
  feedback: string[]
  tier_updated: boolean
  previous_tier: string
  current_tier: string
  current_star_level: string
}

export function useSubmitPromotionExam() {
  const queryClient = useQueryClient()

  return useMutation<SubmitPromotionExamResponse, Error, SubmitPromotionExamRequest>({
    mutationFn: async (data) => {
      const response = await fetch('/api/app/job-readiness/promotion-exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to submit promotion exam')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate related queries to update UI
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'promotion-exam-eligibility'] })

      // If tier was updated, invalidate all tier-dependent data
      if (data.tier_updated) {
        queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
        queryClient.invalidateQueries({ queryKey: ['job-readiness', 'expert-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['job-readiness', 'project'] })
      }
    },
  })
} 