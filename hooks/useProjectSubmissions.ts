import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { JrSubmissionsFilters, JrSubmissionsResponse, getProjectSubmissions } from "@/lib/api/job-readiness/submissions"

// Query key factory for project submissions
const projectKeys = {
  all: ['admin', 'projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: JrSubmissionsFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Hook for fetching project submissions with React Query
export function useProjectSubmissions(filters: JrSubmissionsFilters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => getProjectSubmissions(filters),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}

// Hook for project re-grading
export function useRegradeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ submissionId }: { submissionId: string }) => {
      const response = await fetch(`/api/admin/job-readiness/projects/${submissionId}/regrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to regrade project')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch project submissions
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

// Hook for refreshing project submissions data
export function useRefreshProjects() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
  }
} 