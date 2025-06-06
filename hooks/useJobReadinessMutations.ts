import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"

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
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to update UI immediately
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'course-content'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'course-content', variables.moduleId] })
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
        progress_percentage?: number
        progress_details?: Record<string, any>
        status?: 'InProgress' | 'Completed'
        lesson_id?: string
        video_playback_position?: number
        lesson_completed?: boolean
        video_completed?: boolean
        video_fully_watched?: boolean
        last_viewed_lesson_sequence?: number
        // Legacy support
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
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'course-content'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'course-content', variables.moduleId] })
    }
  })
}

// Submit project
export function useSubmitProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (submissionData: {
      product_id: string
      project_title: string
      project_description: string
      tasks: string[]
      deliverables: string[]
      submission_type: string
      submission_content?: string | null
      submission_url?: string | null
    }) => {
      const response = await fetch('/api/app/job-readiness/projects/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit project')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'projects'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'project'] })
    }
  })
}

// Update expert session watch progress with milestone support
export function useUpdateExpertSessionProgress() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (event: {
      sessionId: string
      currentTime: number
      duration: number
      triggerType: string
      milestone?: number
      forceCompletion?: boolean
    } | {
      sessionId: string
      progressData: {
        current_time_seconds: number
        total_duration_seconds: number
        force_completion?: boolean
      }
    }) => {
      // Handle both new milestone event format and legacy format
      let requestBody: any
      let sessionId: string
      
      if ('triggerType' in event) {
                 // New milestone-based format
         sessionId = event.sessionId
         requestBody = {
           current_time_seconds: Math.floor(event.currentTime),
           total_duration_seconds: Math.floor(event.duration),
           trigger_type: event.triggerType,
           milestone: event.milestone ? Math.floor(event.milestone) : undefined,
           force_completion: event.forceCompletion
         }
      } else {
        // Legacy format for backward compatibility
        sessionId = event.sessionId
        requestBody = event.progressData
      }
      
      const response = await fetch(`/api/app/job-readiness/expert-sessions/${sessionId}/watch-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to update watch progress')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Get sessionId from either format
      const sessionId = 'triggerType' in variables ? variables.sessionId : variables.sessionId
      
      // Handle success notifications for major milestones
      if (data?.success && data?.progress?.session_just_completed) {
        // Using dynamic import to avoid SSR issues
        import('sonner').then(({ toast }) => {
          toast.success('Expert session completed!', {
            description: 'Great job! Your progress has been saved.',
            icon: '🎉',
          })
        })
      }

      if (data?.success && data?.overall_progress?.third_star_unlocked) {
        // Using dynamic import to avoid SSR issues
        import('sonner').then(({ toast }) => {
          toast.success('Congratulations! Third star unlocked! ⭐', {
            description: 'You\'ve completed 5+ expert sessions with second star progression!',
            duration: 5000,
            icon: '🌟',
          })
        })
      }

      // Silent milestone tracking - no notifications for seamless experience

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
              session.id === sessionId 
                ? { 
                    ...session, 
                    student_progress: {
                      ...session.student_progress,
                      watch_time_seconds: data.progress?.watch_time_seconds || session.student_progress.watch_time_seconds,
                      completion_percentage: data.progress?.completion_percentage || session.student_progress.completion_percentage,
                      is_completed: data.progress?.is_completed || session.student_progress.is_completed,
                      completed_at: data.progress?.completed_at || session.student_progress.completed_at,
                      last_milestone_reached: data.progress?.last_milestone_reached || session.student_progress.last_milestone_reached
                    }
                  }
                : session
            )
          }
        })
      }
    },
    onError: (error: Error) => {
      // Handle error notifications
      import('sonner').then(({ toast }) => {
        toast.error('Failed to save progress', {
          description: error.message || 'Please check your connection and try again.',
        })
      })
    }
  })
} 