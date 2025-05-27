import { useQuery } from "@tanstack/react-query"

interface JobReadinessProduct {
  id: string
  name: string
  description: string
  type: string
  modules: Array<{
    id: string
    name: string
    type: string
    sequence: number
    configuration: any
  }>
}

export function useJobReadinessProducts(productId?: string) {
  return useQuery<JobReadinessProduct[]>({
    queryKey: ['job-readiness', 'products', productId],
    queryFn: async () => {
      const url = productId 
        ? `/api/app/job-readiness/products?productId=${productId}`
        : '/api/app/job-readiness/products'
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness products')
      }
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}