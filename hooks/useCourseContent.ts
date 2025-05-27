import { useQuery } from "@tanstack/react-query"

interface QuizOption {
  id: string
  text: string
}

interface QuizQuestion {
  id: string
  question_text: string
  options: QuizOption[]
  question_type: string
}

interface Lesson {
  id: string
  title: string
  description: string
  video_url: string
  sequence: number
  enable_ai_quiz: boolean
  quiz_questions: QuizQuestion[]
  quiz_already_passed: boolean
}

interface CourseModule {
  id: string
  name: string
  description: string
  lessons: Lesson[]
}

interface CourseProgress {
  last_viewed_lesson_sequence: number
  video_playback_positions: { [lessonId: string]: number }
  fully_watched_video_ids: string[]
  lesson_quiz_results: {
    [lessonId: string]: {
      score: number
      passed: boolean
      attempts: number
    }
  }
}

interface CourseContentResponse {
  module: CourseModule
  progress: CourseProgress
}

export function useCourseContent(moduleId: string) {
  return useQuery<CourseContentResponse>({
    queryKey: ['job-readiness', 'course-content', moduleId],
    queryFn: async () => {
      const response = await fetch(`/api/app/job-readiness/courses/${moduleId}/content`)
      if (!response.ok) {
        throw new Error('Failed to fetch course content')
      }
      return response.json()
    },
    enabled: !!moduleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
} 