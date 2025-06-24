import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/lib/api/client'
import { toast } from 'sonner'

// Types for user management
export interface CreateUserData {
  full_name: string
  email: string
  password: string
  role: 'Admin' | 'Staff' | 'Viewer' | 'Client Staff'
  client_id?: string
}

export interface UpdateUserData {
  full_name?: string
  role?: 'Admin' | 'Staff' | 'Viewer' | 'Client Staff'
  client_id?: string | null
}

export interface UserProfile {
  id: string
  email?: string
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
  role?: string
  full_name?: string
  client_id?: string | null
  client?: {
    id: string
    name: string
  }
  banned_until?: string | null
  status?: string
  is_active?: boolean
  is_enrolled?: boolean
}

export interface UsersParams {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  clientId?: string
}

export interface PaginatedUsersResponse {
  data: UserProfile[]
  metadata: {
    currentPage: number
    totalPages: number
    totalCount: number
    pageSize: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

const USERS_KEY = ['users'] as const

// Query for fetching paginated users
export function useUsers(params?: UsersParams) {
  const searchParams = new URLSearchParams()
  
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.role) searchParams.set('role', params.role)
  if (params?.clientId) searchParams.set('clientId', params.clientId)

  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: () => apiCall<PaginatedUsersResponse>(`/api/admin/users?${searchParams.toString()}`),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Query for fetching a single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: [...USERS_KEY, userId],
    queryFn: () => apiCall<UserProfile>(`/api/admin/users/${userId}`),
    enabled: !!userId,
  })
}

// Mutation for creating a new user
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateUserData) =>
      apiCall<UserProfile>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newUser) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      
      toast.success('User created successfully!')
    },
    onError: (error: any) => {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Failed to create user')
    },
  })
}

// Mutation for updating a user
export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserData }) =>
      apiCall<UserProfile>(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    // Optimistic update
    onMutate: async ({ userId, data }) => {
      await queryClient.cancelQueries({ queryKey: [...USERS_KEY, userId] })
      
      const previousUser = queryClient.getQueryData<UserProfile>([...USERS_KEY, userId])
      
      // Optimistically update the single user query
      queryClient.setQueryData<UserProfile>([...USERS_KEY, userId], (old) =>
        old ? { ...old, ...data } : old
      )
      
      // Optimistically update in the users list
      queryClient.setQueriesData<PaginatedUsersResponse>(
        { queryKey: USERS_KEY },
        (old) => {
          if (!old) return old
          
          return {
            ...old,
            data: old.data.map((user) =>
              user.id === userId ? { ...user, ...data } : user
            ),
          }
        }
      )
      
      return { previousUser }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousUser) {
        queryClient.setQueryData([...USERS_KEY, variables.userId], context.previousUser)
      }
      
      console.error('Error updating user:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    },
    onSuccess: () => {
      toast.success('User updated successfully!')
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [...USERS_KEY, variables.userId] })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
  })
}

// Mutation for toggling user status (active/inactive)
export function useToggleUserStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      // The toggle status functionality needs to be implemented in the API
      // For now, we'll update the user's status field
      return apiCall(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: isActive ? 'active' : 'inactive' 
        }),
      })
    },
    // Optimistic update
    onMutate: async ({ userId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: [...USERS_KEY, userId] })
      
      const previousUser = queryClient.getQueryData<UserProfile>([...USERS_KEY, userId])
      
      // Optimistically update the single user query
      queryClient.setQueryData<UserProfile>([...USERS_KEY, userId], (old) =>
        old ? { 
          ...old, 
          status: isActive ? 'active' : 'inactive',
          is_active: isActive,
          banned_until: isActive ? null : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        } : old
      )
      
      // Optimistically update in the users list
      queryClient.setQueriesData<PaginatedUsersResponse>(
        { queryKey: USERS_KEY },
        (old) => {
          if (!old) return old
          
          return {
            ...old,
            data: old.data.map((user) =>
              user.id === userId 
                ? { 
                    ...user, 
                    status: isActive ? 'active' : 'inactive',
                    is_active: isActive,
                    banned_until: isActive ? null : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
                  }
                : user
            ),
          }
        }
      )
      
      return { previousUser }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousUser) {
        queryClient.setQueryData([...USERS_KEY, variables.userId], context.previousUser)
      }
      
      console.error('Error toggling user status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update user status')
    },
    onSuccess: (_, { isActive }) => {
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully!`)
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [...USERS_KEY, variables.userId] })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
    },
  })
}

// Mutation for deleting a user
export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (userId: string) =>
      apiCall(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, userId) => {
      // Remove the user from all relevant queries
      queryClient.removeQueries({ queryKey: [...USERS_KEY, userId] })
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      
      toast.success('User deleted successfully!')
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Failed to delete user')
    },
  })
} 