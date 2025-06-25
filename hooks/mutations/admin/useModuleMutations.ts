import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import { Module } from '@/hooks/queries/admin/useModules';

// Create module data interface
interface CreateModuleData {
  name: string;
  type: "Course" | "Assessment";
  product_ids?: string[];
  sequence?: number;
  configuration?: Record<string, unknown>;
}

// Update module data interface
interface UpdateModuleData {
  name?: string;
  type?: "Course" | "Assessment";
  product_ids?: string[];
  sequence?: number;
  configuration?: Record<string, unknown>;
}

// Create module mutation
export function useCreateModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (moduleData: CreateModuleData) => {
      return apiClient<Module>('/api/admin/modules', {
        method: 'POST',
        body: JSON.stringify(moduleData),
      });
    },
    onMutate: async (newModule) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
      
      // Create optimistic module
      const optimisticModule: Partial<Module> = {
        id: 'temp-' + Date.now(),
        name: newModule.name,
        type: newModule.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sequence: newModule.sequence || 0,
        product_id: null,
        configuration: newModule.configuration || {},
        products: [],
      };
      
      // Update all cached queries
      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
        },
        (old: any) => {
          if (!old) return old;
          if ('pages' in old) {
            return {
              ...old,
              pages: old.pages.map((page: any, index: number) => 
                index === 0 
                  ? { ...page, data: [optimisticModule, ...page.data] }
                  : page
              )
            };
          }
          return old;
        }
      );
      
      return { optimisticModule };
    },
    onError: (error, newModule, context) => {
      // Rollback on error
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
      
      toast({
        title: "Error",
        description: `Failed to create module: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Module created successfully",
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
    },
  });
}

// Update module mutation
export function useUpdateModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateModuleData }) => {
      return apiClient<Module>(`/api/admin/modules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
      
      // Optimistically update the module in all cached queries
      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
        },
        (old: any) => {
          if (!old) return old;
          if ('pages' in old) {
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.map((module: Module) => 
                  module.id === id 
                    ? { ...module, ...data, updated_at: new Date().toISOString() } 
                    : module
                )
              }))
            };
          }
          return old;
        }
      );
    },
    onError: (error) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
      
      toast({
        title: "Error",
        description: `Failed to update module: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Module updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
    },
  });
}

// Delete module mutation
export function useDeleteModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/admin/modules/${id}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
      
      // Remove module from all cached queries
      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
        },
        (old: any) => {
          if (!old) return old;
          if ('pages' in old) {
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.filter((module: Module) => module.id !== id)
              }))
            };
          }
          return old;
        }
      );
    },
    onError: (error) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
      
      toast({
        title: "Error",
        description: `Failed to delete module: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Module deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
      });
    },
  });
} 