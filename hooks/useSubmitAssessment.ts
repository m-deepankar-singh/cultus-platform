import { useMutation, useQueryClient } from "@tanstack/react-query"

interface SubmitAssessmentRequest {
  answers: { [questionId: string]: string | string[] }
  time_spent_seconds: number
  started_at: string
}

interface SubmitAssessmentResponse {
  success: boolean
  score: number
  percentage: number
  passed: boolean
  tier_achieved: string
  tier_changed: boolean
  star_level_unlocked: boolean
  feedback: string
  correct_answers: number
  total_questions: number
  submission_id: string
}

export function useSubmitAssessment() {
  const queryClient = useQueryClient()

  return useMutation<SubmitAssessmentResponse, Error, { moduleId: string; data: SubmitAssessmentRequest }>({
    mutationFn: async ({ moduleId, data }) => {
      const response = await fetch(`/api/app/job-readiness/assessments/${moduleId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to submit assessment')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries to update UI
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'assessments'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'assessment-details', variables.moduleId] })

      // If tier changed, invalidate promotion exam eligibility
      if (data.tier_changed) {
        queryClient.invalidateQueries({ queryKey: ['job-readiness', 'promotion-exam-eligibility'] })
      }
    },
  })
} 