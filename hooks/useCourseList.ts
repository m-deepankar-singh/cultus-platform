import { useQuery } from "@tanstack/react-query"

interface CourseProgress {
  status: string
  progress_percentage: number
  last_updated: string
  completed_at?: string
}

interface CourseConfiguration {
  description: string
  estimated_duration_hours: number
  difficulty_level: string
  required_tier: string
  unlocks_at_star_level?: string
}

interface Course {
  id: string
  name: string
  type: string
  configuration: CourseConfiguration
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  progress: CourseProgress
  lessons_count: number
  description: string
  completion_percentage: number
}

interface CourseListResponse {
  courses: Course[]
  current_tier: string
  current_star_level: string
  completed_courses_count: number
  total_courses_count: number
  product: {
    id: string
    name: string
    type: string
  }
}

export function useCourseList(productId: string) {
  return useQuery<CourseListResponse>({
    queryKey: ['job-readiness', 'courses', productId],
    queryFn: async () => {
      const response = await fetch(`/api/app/job-readiness/courses?productId=${productId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness courses')
      }
      return response.json()
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 