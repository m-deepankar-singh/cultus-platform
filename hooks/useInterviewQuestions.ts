import { useQuery } from "@tanstack/react-query"

interface InterviewQuestion {
  id: string
  question_text: string
}

interface InterviewQuestionsResponse {
  questions: InterviewQuestion[]
  cached: boolean
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
    staleTime: 30 * 60 * 1000, // 30 minutes - questions are cached on backend
    gcTime: 60 * 60 * 1000, // 60 minutes
    refetchOnWindowFocus: false, // Prevent refetch to maintain consistency during interview session
  })
} 