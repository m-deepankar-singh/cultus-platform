import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook to invalidate interview-related cache data
 * Use this after interview submission or completion to ensure UI shows latest data
 */
export function useInvalidateInterviewCache() {
  const queryClient = useQueryClient()

  const invalidateInterviewCache = async () => {
    try {
      // Invalidate all interview-related queries
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['job-readiness', 'module-groups'] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['job-readiness', 'products'] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['job-readiness', 'progress'] 
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['job-readiness', 'interview-questions'] 
        })
      ])
      
      console.log('✅ Interview cache invalidated successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to invalidate interview cache:', error)
      return false
    }
  }

  const forceRefreshInterviewStatus = async () => {
    try {
      // Remove specific queries from cache to force fresh fetch
      queryClient.removeQueries({ 
        queryKey: ['job-readiness', 'module-groups'] 
      })
      queryClient.removeQueries({ 
        queryKey: ['job-readiness', 'products'] 
      })
      
      // Immediately refetch the data
      await Promise.all([
        queryClient.prefetchQuery({ 
          queryKey: ['job-readiness', 'module-groups'] 
        }),
        queryClient.prefetchQuery({ 
          queryKey: ['job-readiness', 'products'] 
        })
      ])
      
      console.log('✅ Interview status refreshed successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to refresh interview status:', error)
      return false
    }
  }

  return {
    invalidateInterviewCache,
    forceRefreshInterviewStatus
  }
} 