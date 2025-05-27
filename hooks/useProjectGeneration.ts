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
}

export function useProjectGeneration(productId: string) {
  return useQuery<ProjectGenerationResponse>({
    queryKey: ['job-readiness', 'project', productId],
    queryFn: async () => {
      const response = await fetch(`/api/app/job-readiness/projects/generate?productId=${productId}`)
      if (!response.ok) {
        throw new Error('Failed to generate project')
      }
      return response.json()
    },
    enabled: !!productId,
    staleTime: 1 * 60 * 1000, // 1 minute - projects can change on refresh
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid changing project
  })
} 