import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { JrSubmissionsFilters, JrSubmissionsResponse, getInterviewSubmissions } from "@/lib/api/job-readiness/submissions"

// Query key factory for interview submissions
const interviewKeys = {
  all: ['admin', 'interviews'] as const,
  lists: () => [...interviewKeys.all, 'list'] as const,
  list: (filters: JrSubmissionsFilters) => [...interviewKeys.lists(), filters] as const,
  details: () => [...interviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...interviewKeys.details(), id] as const,
}

// Hook for fetching interview submissions with React Query
export function useInterviewSubmissions(filters: JrSubmissionsFilters = {}) {
  return useQuery({
    queryKey: interviewKeys.list(filters),
    queryFn: () => getInterviewSubmissions(filters),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}

// Hook for quick verdict changes with optimistic updates
export function useQuickVerdictMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      submissionId, 
      verdict 
    }: { 
      submissionId: string
      verdict: 'approved' | 'rejected' 
    }) => {
      const response = await fetch(`/api/admin/job-readiness/interviews/${submissionId}/quick-verdict`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({
          admin_verdict_override: verdict,
          override_reason: `Quick ${verdict} via admin toggle`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update verdict')
      }

      return response.json()
    },
    onMutate: async ({ submissionId, verdict }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: interviewKeys.all })

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: interviewKeys.lists() })

      // Optimistically update all matching queries
      queryClient.setQueriesData<JrSubmissionsResponse>(
        { queryKey: interviewKeys.lists() },
        (old) => {
          if (!old?.submissions) return old

          return {
            ...old,
            submissions: old.submissions.map((submission) =>
              submission.id === submissionId
                ? {
                    ...submission,
                    admin_verdict_override: verdict,
                    final_verdict: verdict,
                  }
                : submission
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() })
    },
  })
}

// Hook for manual review submission
export function useManualReviewMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      submissionId,
      status,
      adminFeedback,
      confidenceLevel
    }: {
      submissionId: string
      status: 'approved' | 'rejected' | 'needs_further_review'
      adminFeedback: string
      confidenceLevel: 'low' | 'medium' | 'high'
    }) => {
      const response = await fetch(`/api/admin/job-readiness/interviews/${submissionId}/manual-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status === 'approved' ? 'Approved' : 'Rejected',
          admin_feedback: adminFeedback,
          confidence_level: confidenceLevel,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit manual review')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch interview submissions
      queryClient.invalidateQueries({ queryKey: interviewKeys.lists() })
    },
  })
}

// Hook for refreshing submissions data
export function useRefreshInterviews() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: interviewKeys.lists() })
  }
} 