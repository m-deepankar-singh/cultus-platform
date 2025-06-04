import { useQuery } from "@tanstack/react-query"

interface InterviewQuestion {
  id: string
  question_text: string
}

interface InterviewQuestionsResponse {
  questions: InterviewQuestion[]
  cached: boolean
  sessionId?: string
}

export function useInterviewQuestions() {
  return useQuery<InterviewQuestionsResponse>({
    queryKey: ['job-readiness', 'interview-questions'],
    queryFn: async () => {
      const response = await fetch('/api/app/job-readiness/interviews/questions')
      if (!response.ok) {
        throw new Error('Failed to fetch interview questions')
      }
      return response.json()
    },
    staleTime: 0, // Always fetch fresh questions
    gcTime: 0, // Don't cache in memory
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch when component mounts
  })
} 