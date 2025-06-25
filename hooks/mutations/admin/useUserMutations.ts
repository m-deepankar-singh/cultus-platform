import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import type { UserProfile, PaginatedResponse } from '@/hooks/queries/admin/useUsers';
import type { CreateUserData, UpdateUserData } from '@/hooks/api/use-users';

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      return apiClient<UserProfile>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onMutate: async (newUser) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['admin', 'users']);
      
      // Optimistically add the new user to the beginning of the first page
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' },
        (old: any) => {
          if (!old?.pages) return old;
          
          const tempUser: UserProfile = {
            id: 'temp-' + Date.now(),
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            client_id: newUser.client_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<UserProfile>, index: number) => 
              index === 0 
                ? { 
                    ...page, 
                    data: [tempUser, ...page.data],
                    metadata: {
                      ...page.metadata,
                      totalCount: page.metadata.totalCount + 1
                    }
                  }
                : page
            )
          };
        }
      );
      
      return { previousUsers };
    },
    onError: (error, newUser, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' },
          context.previousUsers
        );
      }
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      return apiClient<UserProfile>(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      const previousUsers = queryClient.getQueriesData({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      // Optimistically update the specific user
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<UserProfile>) => ({
              ...page,
              data: page.data.map((user: UserProfile) => 
                user.id === id 
                  ? { 
                      ...user, 
                      ...data,
                      updated_at: new Date().toISOString()
                    } 
                  : user
              )
            }))
          };
        }
      );
      
      return { previousUsers };
    },
    onError: (error, variables, context) => {
      // Rollback all user queries
      context?.previousUsers?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data);
      });
      
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiClient<UserProfile>(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: isActive ? 'active' : 'inactive' 
        }),
      });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      const previousUsers = queryClient.getQueriesData({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      // Optimistically update user status
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<UserProfile>) => ({
              ...page,
              data: page.data.map((user: UserProfile) => 
                user.id === id 
                  ? { 
                      ...user, 
                      status: isActive ? 'active' : 'inactive',
                      is_active: isActive,
                      banned_until: isActive ? null : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                      updated_at: new Date().toISOString()
                    }
                  : user
              )
            }))
          };
        }
      );
      
      return { previousUsers };
    },
    onError: (error, variables, context) => {
      context?.previousUsers?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data);
      });
      
      toast({
        title: "Error",
        description: `Failed to update user status: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (_, { isActive }) => {
      toast({
        title: "Success",
        description: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      return apiClient(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      const previousUsers = queryClient.getQueriesData({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
      
      // Optimistically remove the user
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<UserProfile>) => ({
              ...page,
              data: page.data.filter((user: UserProfile) => user.id !== userId),
              metadata: {
                ...page.metadata,
                totalCount: page.metadata.totalCount - 1
              }
            }))
          };
        }
      );
      
      return { previousUsers };
    },
    onError: (error, userId, context) => {
      context?.previousUsers?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data);
      });
      
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
      });
    },
  });
} 