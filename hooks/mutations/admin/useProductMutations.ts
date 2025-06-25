import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import { Product } from '@/hooks/queries/admin/useProducts';

// Create product data interface
interface CreateProductData {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  type?: string;
}

// Update product data interface
interface UpdateProductData {
  name?: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  type?: string;
}

// Create product mutation
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productData: CreateProductData) => {
      return apiClient<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    },
    onMutate: async (newProduct) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
      
      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData(['admin', 'products']);
      
      // Optimistically update cache
      queryClient.setQueryData(['admin', 'products'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => 
            index === 0 
              ? { 
                  ...page, 
                  data: [{ 
                    ...newProduct, 
                    id: 'temp-' + Date.now(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }, ...page.data],
                  metadata: {
                    ...page.metadata,
                    totalCount: page.metadata.totalCount + 1
                  }
                }
              : page
          )
        };
      });
      
      return { previousProducts };
    },
    onError: (error, newProduct, context) => {
      // Rollback on error
      queryClient.setQueryData(['admin', 'products'], context?.previousProducts);
      toast({
        title: "Error",
        description: `Failed to create product: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

// Update product mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductData }) => {
      return apiClient<Product>(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
      
      const previousProducts = queryClient.getQueryData(['admin', 'products']);
      
      // Optimistically update the specific product
      queryClient.setQueryData(['admin', 'products'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((product: Product) => 
              product.id === id 
                ? { 
                    ...product, 
                    ...data, 
                    updated_at: new Date().toISOString() 
                  } 
                : product
            )
          }))
        };
      });
      
      return { previousProducts };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['admin', 'products'], context?.previousProducts);
      toast({
        title: "Error",
        description: `Failed to update product: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

// Delete product mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: string) => {
      return apiClient(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });
      
      const previousProducts = queryClient.getQueryData(['admin', 'products']);
      
      // Optimistically remove the product
      queryClient.setQueryData(['admin', 'products'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((product: Product) => product.id !== deletedId),
            metadata: {
              ...page.metadata,
              totalCount: Math.max(0, page.metadata.totalCount - 1)
            }
          }))
        };
      });
      
      return { previousProducts };
    },
    onError: (error, deletedId, context) => {
      queryClient.setQueryData(['admin', 'products'], context?.previousProducts);
      toast({
        title: "Error",
        description: `Failed to delete product: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
} 