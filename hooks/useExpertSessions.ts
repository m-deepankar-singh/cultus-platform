import { useQuery } from "@tanstack/react-query"
import { type ProgressMilestone } from "@/lib/constants/progress-milestones"

interface ExpertSessionProgress {
  watch_time_seconds: number
  completion_percentage: number
  is_completed: boolean
  completed_at: string | null
  last_milestone_reached?: ProgressMilestone
  can_resume: boolean
  resume_from_milestone: number
  resume_position_seconds: number
  milestones_unlocked: number[]
}

interface ExpertSession {
  id: string
  title: string
  description: string
  video_url: string
  video_duration: number
  created_at: string
  student_progress: ExpertSessionProgress
}

interface OverallProgress {
  completed_sessions_count: number
  required_sessions: number
  progress_percentage: number
  third_star_unlocked: boolean
}

interface ExpertSessionsResponse {
  sessions: ExpertSession[]
  overall_progress: OverallProgress
}

export function useExpertSessions(productId: string) {
  return useQuery<ExpertSessionsResponse>({
    queryKey: ['job-readiness', 'expert-sessions', productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error('Product ID is required')
      }
      const response = await fetch(`/api/app/job-readiness/expert-sessions?productId=${productId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch expert sessions')
      }
      return response.json()
    },
    enabled: !!productId && productId.trim() !== '',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2, // Reduce retry attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })
} 