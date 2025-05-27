import { useMutation } from "@tanstack/react-query"

interface ExamQuestion {
  id: string
  question: string
  options: Array<{
    id: string
    text: string
  }>
}

interface StartPromotionExamRequest {
  product_id: string
}

interface StartPromotionExamResponse {
  message: string
  exam_session_id: string
  questions: ExamQuestion[]
  time_limit_minutes: number
  pass_threshold: number
  current_tier: string
  target_tier: string
  product_id: string
  star_level: string
}

export function useStartPromotionExam() {
  return useMutation<StartPromotionExamResponse, Error, StartPromotionExamRequest>({
    mutationFn: async (data) => {
      const response = await fetch('/api/app/job-readiness/promotion-exam/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to start promotion exam')
      }

      return response.json()
    },
  })
} 