import { useMutation, useQueryClient } from "@tanstack/react-query"

// Submit lesson quiz
export function useSubmitQuiz() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ moduleId, lessonId, answers }: {
      moduleId: string
      lessonId: string
      answers: Array<{ question_id: string; selected_option_id: string | string[] }>
    }) => {
      const response = await fetch(`/api/app/job-readiness/courses/${moduleId}/lessons/${lessonId}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit quiz')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
    }
  })
}

// Update course progress
export function useUpdateProgress() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ moduleId, progressData }: {
      moduleId: string
      progressData: {
        last_viewed_lesson_sequence?: number
        video_playback_positions?: Record<string, number>
        fully_watched_video_ids?: string[]
      }
    }) => {
      const response = await fetch(`/api/app/job-readiness/courses/${moduleId}/save-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update progress')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
    }
  })
}

// Submit project
export function useSubmitProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (submissionData: {
      submission_content?: string
      submission_url?: string
    }) => {
      const response = await fetch('/api/app/job-readiness/projects/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit project')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'projects'] })
    }
  })
}

// Submit interview
export function useSubmitInterview() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (videoBlob: Blob) => {
      const formData = new FormData()
      formData.append('video', videoBlob, 'interview.webm')
      
      const response = await fetch('/api/app/job-readiness/interviews/submit', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit interview')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'interviews'] })
    }
  })
}

// Update expert session watch progress
export function useUpdateExpertSessionProgress() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ sessionId, progressData }: {
      sessionId: string
      progressData: {
        current_time_seconds: number
        total_duration_seconds: number
        force_completion?: boolean
      }
    }) => {
      const response = await fetch(`/api/app/job-readiness/expert-sessions/${sessionId}/watch-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update watch progress')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Only invalidate if session was just completed or major milestone reached
      if (data?.progress?.session_just_completed || data?.overall_progress?.third_star_unlocked) {
        queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
        queryClient.invalidateQueries({ queryKey: ['job-readiness', 'expert-sessions'] })
      } else {
        // For regular progress updates, just update the cache without invalidating
        // This prevents constant refetching while still keeping data fresh
        queryClient.setQueryData(['job-readiness', 'expert-sessions'], (oldData: any) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            sessions: oldData.sessions?.map((session: any) => 
              session.id === variables.sessionId 
                ? { 
                    ...session, 
                    student_progress: {
                      ...session.student_progress,
                      watch_time_seconds: data.progress.watch_time_seconds,
                      completion_percentage: data.progress.completion_percentage,
                      is_completed: data.progress.is_completed,
                      completed_at: data.progress.completed_at
                    }
                  }
                : session
            )
          }
        })
      }
    }
  })
} 