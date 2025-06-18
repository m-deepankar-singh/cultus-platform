import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from '@/hooks/use-toast'

// Simplified mutation for video completion only
export function useSimplifiedCourseProgress() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ moduleId, lessonId, videoCompleted, quizPassed = false }: {
      moduleId: string
      lessonId: string
      videoCompleted: boolean
      quizPassed?: boolean
    }) => {
      const response = await fetch(`/api/app/job-readiness/courses/${moduleId}/save-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          video_completed: videoCompleted,
          quiz_passed: quizPassed
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save progress')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Show success notification
      if (data.success) {
        if (data.course_completed) {
          toast({
            title: "🎉 Course Completed!",
            description: "Congratulations! You've completed the entire course!",
            duration: 5000,
          })
        } else {
          toast({
            title: "Progress Saved",
            description: `Video completed: ${data.videos_completed}/${data.total_videos} lessons`,
          })
        }

        // Handle star level unlock notifications
        if (data.star_level_unlocked) {
          toast({
            title: `⭐ ${data.new_star_level} Star Unlocked!`,
            description: "Great job! Keep up the excellent work!",
            duration: 5000,
          })
        }
      }

      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'course-content', variables.moduleId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save progress",
        variant: "destructive",
      })
    }
  })
}

// Simplified quiz submission hook
export function useSimplifiedQuizSubmission() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit quiz')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Show quiz result notification
      if (data.success) {
        if (data.quiz_passed) {
          toast({
            title: "✅ Quiz Passed!",
            description: `Score: ${data.score}% - Well done!`,
          })
        } else {
          toast({
            title: "Quiz Complete",
            description: `Score: ${data.score}% - You can retake the quiz to improve your score.`,
            variant: "destructive",
          })
        }

        // Update lesson completion if quiz was passed
        if (data.quiz_passed) {
          // Automatically update progress with quiz completion
          return fetch(`/api/app/job-readiness/courses/${variables.moduleId}/save-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lesson_id: variables.lessonId,
              video_completed: true, // Assume video was already completed
              quiz_passed: true
            })
          })
        }
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'progress'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'courses'] })
      queryClient.invalidateQueries({ queryKey: ['job-readiness', 'course-content', variables.moduleId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit quiz",
        variant: "destructive",
      })
    }
  })
} 