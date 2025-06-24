import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import type { Learner } from '@/hooks/queries/admin/useLearners';

interface CreateLearnerData {
  full_name: string;
  email: string;
  phone_number?: string | null;
  client_id: string;
  is_active?: boolean;
  job_readiness_background_type: string;
}

interface UpdateLearnerData {
  full_name?: string;
  email?: string;
  phone_number?: string | null;
  client_id?: string;
  is_active?: boolean;
  job_readiness_background_type?: string;
}

/**
 * Mutation hook for creating a new learner
 * Includes optimistic updates for better UX
 */
export function useCreateLearner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (learnerData: CreateLearnerData) => {
      return apiClient<Learner>('/api/admin/learners', {
        method: 'POST',
        body: JSON.stringify(learnerData),
      });
    },
    onMutate: async (newLearner) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
      
      // Optimistically update all learner queries
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners' },
        (old: any) => {
          if (!old) return old;
          // Add the new learner to the first page
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map((page: any, index: number) => 
                index === 0 
                  ? { 
                      ...page, 
                      data: [
                        { 
                          ...newLearner, 
                          id: 'temp-' + Date.now(),
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          star_rating: null,
                          last_login_at: null,
                          temporary_password: null,
                          client: null
                        }, 
                        ...page.data
                      ],
                      metadata: {
                        ...page.metadata,
                        totalCount: page.metadata.totalCount + 1
                      }
                    }
                  : page
              )
            };
          }
          return old;
        }
      );
      
      return { previousData };
    },
    onError: (error, newLearner, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      toast({
        title: "Error",
        description: `Failed to create learner: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Learner created successfully",
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
    },
  });
}

/**
 * Mutation hook for updating a learner
 * Includes optimistic updates for instant feedback
 */
export function useUpdateLearner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLearnerData }) => {
      return apiClient<Learner>(`/api/admin/learners/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
      
      const previousData = queryClient.getQueriesData({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
      
      // Optimistically update the specific learner across all queries
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners' },
        (old: any) => {
          if (!old) return old;
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.map((learner: Learner) => 
                  learner.id === id 
                    ? { ...learner, ...data, updated_at: new Date().toISOString() } 
                    : learner
                )
              }))
            };
          }
          return old;
        }
      );
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      toast({
        title: "Error",
        description: `Failed to update learner: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learner updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
    },
  });
}

/**
 * Mutation hook for deleting a learner
 * Includes optimistic removal from the UI
 */
export function useDeleteLearner() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/learners/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete learner');
      }
      
      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
      
      const previousData = queryClient.getQueriesData({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
      
      // Optimistically remove the learner from all queries
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners' },
        (old: any) => {
          if (!old) return old;
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.filter((learner: Learner) => learner.id !== id),
                metadata: {
                  ...page.metadata,
                  totalCount: page.metadata.totalCount - 1
                }
              }))
            };
          }
          return old;
        }
      );
      
      return { previousData };
    },
    onError: (error, id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      toast({
        title: "Error",
        description: `Failed to delete learner: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learner deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'learners'
      });
    },
  });
} 