import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import type { Client, PaginatedResponse } from '@/hooks/queries/admin/useClients';

export interface CreateClientData {
  name: string;
  contact_email?: string | null;
  address?: string | null;
  logo_url?: string | null;
}

export interface UpdateClientData {
  name?: string;
  contact_email?: string | null;
  address?: string | null;
  is_active?: boolean;
  logo_url?: string | null;
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientData: CreateClientData) => {
      return apiClient<Client>('/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(clientData),
      });
    },
    onMutate: async (newClient) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      // Snapshot the previous value
      const previousClients = queryClient.getQueryData(['admin', 'clients']);
      
      // Optimistically add the new client to the beginning of the first page
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' },
        (old: any) => {
          if (!old?.pages) return old;
          
          const tempClient: Client = {
            id: 'temp-' + Date.now(),
            name: newClient.name,
            contact_email: newClient.contact_email || null,
            address: newClient.address || null,
            logo_url: newClient.logo_url || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<Client>, index: number) => 
              index === 0 
                ? { 
                    ...page, 
                    data: [tempClient, ...page.data],
                    metadata: page.metadata ? {
                      ...page.metadata,
                      totalCount: page.metadata.totalCount + 1
                    } : undefined,
                    pagination: page.pagination ? {
                      ...page.pagination,
                      totalCount: page.pagination.totalCount + 1
                    } : undefined
                  }
                : page
            )
          };
        }
      );
      
      return { previousClients };
    },
    onError: (error, newClient, context) => {
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueriesData(
          { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' },
          context.previousClients
        );
      }
      toast({
        title: "Error",
        description: `Failed to create client: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Client "${data.name}" created successfully`,
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientData }) => {
      return apiClient<Client>(`/api/admin/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      const previousClients = queryClient.getQueriesData({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      // Optimistically update the specific client
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<Client>) => ({
              ...page,
              data: page.data.map((client: Client) => 
                client.id === id 
                  ? { 
                      ...client, 
                      ...data,
                      updated_at: new Date().toISOString()
                    } 
                  : client
              )
            }))
          };
        }
      );
      
      return { previousClients };
    },
    onError: (error, variables, context) => {
      // Rollback all client queries
      context?.previousClients?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data);
      });
      
      toast({
        title: "Error",
        description: `Failed to update client: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Client "${data.name}" updated successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
    },
  });
}

export function useToggleClientStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiClient<Client>(`/api/admin/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      const previousClients = queryClient.getQueriesData({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      // Optimistically update client status
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<Client>) => ({
              ...page,
              data: page.data.map((client: Client) => 
                client.id === id 
                  ? { 
                      ...client, 
                      is_active: isActive,
                      updated_at: new Date().toISOString()
                    }
                  : client
              )
            }))
          };
        }
      );
      
      return { previousClients };
    },
    onError: (error, variables, context) => {
      context?.previousClients?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data);
      });
      
      toast({
        title: "Error",
        description: `Failed to update client status: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data, { isActive }) => {
      const status = isActive ? 'activated' : 'deactivated';
      toast({
        title: "Success",
        description: `Client "${data.name}" ${status} successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return apiClient(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (clientId) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      const previousClients = queryClient.getQueriesData({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
      
      // Optimistically remove the client
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' },
        (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: PaginatedResponse<Client>) => ({
              ...page,
              data: page.data.filter((client: Client) => client.id !== clientId),
              metadata: page.metadata ? {
                ...page.metadata,
                totalCount: page.metadata.totalCount - 1
              } : undefined,
              pagination: page.pagination ? {
                ...page.pagination,
                totalCount: page.pagination.totalCount - 1
              } : undefined
            }))
          };
        }
      );
      
      return { previousClients };
    },
    onError: (error, clientId, context) => {
      context?.previousClients?.forEach(([queryKey, data]: [any, any]) => {
        queryClient.setQueryData(queryKey, data);
      });
      
      toast({
        title: "Error",
        description: `Failed to delete client: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
      });
    },
  });
} 