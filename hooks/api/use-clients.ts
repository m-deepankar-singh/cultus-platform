/**
 * Client Management API Hooks
 * 
 * TanStack Query hooks for client CRUD operations, replacing server actions
 * with API calls for better error handling and caching.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiCall, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/client'
import { toast } from 'sonner'

// Types from the original server actions
export interface Client {
  id: string
  created_at: string
  updated_at: string
  name: string
  contact_email: string | null
  address: string | null
  logo_url: string | null
  is_active: boolean
  // Extended fields from API response
  products?: Array<{
    id: string
    name: string
    description: string | null
  }>
  total_students?: number
  active_students?: number
  recent_activity?: any[]
}

export interface CreateClientData {
  name: string
  contact_email?: string | null
  address?: string | null
  logo_url?: string | null
}

export interface UpdateClientData {
  name?: string
  contact_email?: string | null
  address?: string | null
  is_active?: boolean
  logo_url?: string | null
}

export interface ClientsResponse {
  data: Client[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

export interface ClientsQueryParams {
  page?: number
  pageSize?: number
  search?: string
  status?: 'active' | 'inactive'
}

// Query keys for cache management
const CLIENTS_KEY = ['clients'] as const

/**
 * Hook to fetch all clients with pagination and filtering
 */
export function useClients(params?: ClientsQueryParams) {
  const searchParams = new URLSearchParams()
  
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  if (params?.search) searchParams.set('search', params.search)
  if (params?.status) searchParams.set('status', params.status)

  const queryString = searchParams.toString()
  const url = `/api/admin/clients${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: [...CLIENTS_KEY, params],
    queryFn: () => apiCall<ClientsResponse>(url),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to fetch a single client by ID
 */
export function useClient(clientId: string) {
  return useQuery({
    queryKey: [...CLIENTS_KEY, clientId],
    queryFn: () => apiCall<Client>(`/api/admin/clients/${clientId}`),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create a new client
 */
export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateClientData) =>
      apiPost<Client>('/api/admin/clients', data),
    
    onSuccess: (newClient) => {
      // Invalidate clients list to show the new client
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY })
      
      // Optionally add the new client to the cache
      queryClient.setQueryData([...CLIENTS_KEY, newClient.id], newClient)
      
      toast.success(`Client "${newClient.name}" created successfully!`)
    },
    
    onError: (error) => {
      console.error('Failed to create client:', error)
      toast.error('Failed to create client. Please try again.')
    },
  })
}

/**
 * Hook to update an existing client
 */
export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientData }) =>
      apiPut<Client>(`/api/admin/clients/${id}`, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [...CLIENTS_KEY, id] })
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEY })
      
      // Snapshot the previous value
      const previousClient = queryClient.getQueryData<Client>([...CLIENTS_KEY, id])
      const previousClients = queryClient.getQueryData<ClientsResponse>(CLIENTS_KEY)
      
      // Optimistically update individual client
      if (previousClient) {
        queryClient.setQueryData<Client>([...CLIENTS_KEY, id], {
          ...previousClient,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }
      
      // Optimistically update clients list
      if (previousClients) {
        queryClient.setQueryData<ClientsResponse>(CLIENTS_KEY, {
          ...previousClients,
          data: previousClients.data.map((client) =>
            client.id === id 
              ? { ...client, ...data, updated_at: new Date().toISOString() }
              : client
          ),
        })
      }
      
      return { previousClient, previousClients }
    },
    
    onSuccess: (updatedClient) => {
      // Update the cache with the server response
      queryClient.setQueryData([...CLIENTS_KEY, updatedClient.id], updatedClient)
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY })
      
      toast.success(`Client "${updatedClient.name}" updated successfully!`)
    },
    
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousClient) {
        queryClient.setQueryData([...CLIENTS_KEY, variables.id], context.previousClient)
      }
      if (context?.previousClients) {
        queryClient.setQueryData(CLIENTS_KEY, context.previousClients)
      }
      
      console.error('Failed to update client:', error)
      toast.error('Failed to update client. Please try again.')
    },
    
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: [...CLIENTS_KEY, variables.id] })
    },
  })
}

/**
 * Hook to toggle client status (activate/deactivate)
 */
export function useToggleClientStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiPut<Client>(`/api/admin/clients/${id}`, { is_active: isActive }),
    
    // Optimistic update
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: [...CLIENTS_KEY, id] })
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEY })
      
      const previousClient = queryClient.getQueryData<Client>([...CLIENTS_KEY, id])
      const previousClients = queryClient.getQueryData<ClientsResponse>(CLIENTS_KEY)
      
      // Optimistically update
      if (previousClient) {
        queryClient.setQueryData<Client>([...CLIENTS_KEY, id], {
          ...previousClient,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
      }
      
      if (previousClients) {
        queryClient.setQueryData<ClientsResponse>(CLIENTS_KEY, {
          ...previousClients,
          data: previousClients.data.map((client) =>
            client.id === id 
              ? { ...client, is_active: isActive, updated_at: new Date().toISOString() }
              : client
          ),
        })
      }
      
      return { previousClient, previousClients }
    },
    
    onSuccess: (updatedClient) => {
      queryClient.setQueryData([...CLIENTS_KEY, updatedClient.id], updatedClient)
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY })
      
      const status = updatedClient.is_active ? 'activated' : 'deactivated'
      toast.success(`Client "${updatedClient.name}" ${status} successfully!`)
    },
    
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousClient) {
        queryClient.setQueryData([...CLIENTS_KEY, variables.id], context.previousClient)
      }
      if (context?.previousClients) {
        queryClient.setQueryData(CLIENTS_KEY, context.previousClients)
      }
      
      console.error('Failed to toggle client status:', error)
      toast.error('Failed to update client status. Please try again.')
    },
    
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: [...CLIENTS_KEY, variables.id] })
    },
  })
}

/**
 * Hook to delete a client
 */
export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (clientId: string) =>
      apiDelete(`/api/admin/clients/${clientId}`),
    
    onSuccess: (_, clientId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: [...CLIENTS_KEY, clientId] })
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEY })
      
      toast.success('Client deleted successfully!')
    },
    
    onError: (error) => {
      console.error('Failed to delete client:', error)
      toast.error('Failed to delete client. Please try again.')
    },
  })
}

/**
 * Hook to prefetch a client (useful for hover states)
 */
export function usePrefetchClient() {
  const queryClient = useQueryClient()
  
  return (clientId: string) => {
    queryClient.prefetchQuery({
      queryKey: [...CLIENTS_KEY, clientId],
      queryFn: () => apiCall<Client>(`/api/admin/clients/${clientId}`),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })
  }
} 