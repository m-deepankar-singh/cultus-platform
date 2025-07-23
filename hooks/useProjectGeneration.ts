import { useQuery } from "@tanstack/react-query"

interface Project {
  title: string
  description: string
  tasks: string[]
  deliverables: string[]
  submission_type: string
  status: string
}

interface ProjectGenerationResponse {
  success: boolean
  project: Project
  message: string
  generation_source?: 'ai' | 'fallback' | 'cached'
  generation_time_ms?: number
}

export function useProjectGeneration(productId: string) {
  return useQuery<ProjectGenerationResponse>({
    queryKey: ['job-readiness', 'project', productId],
    queryFn: async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout
      
      try {
        const response = await fetch(`/api/app/job-readiness/projects/generate?productId=${productId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error('Failed to generate project')
        }
        return response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Project generation timed out - please try again')
        }
        throw error
      }
    },
    enabled: !!productId,
    staleTime: 1 * 60 * 1000, // 1 minute - projects can change on refresh
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid changing project
    retry: (failureCount, error) => {
      // Don't retry on timeout errors
      if (error.message.includes('timed out')) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  })
} 