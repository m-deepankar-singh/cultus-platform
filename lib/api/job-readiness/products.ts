// Job Readiness Products API Client Functions

export interface JrProduct {
  id: string
  name: string
  description?: string
  type: "JOB_READINESS"
  created_at: string
  updated_at: string
  job_readiness_products: {
    id: string
    bronze_assessment_min_score: number
    bronze_assessment_max_score: number
    silver_assessment_min_score: number
    silver_assessment_max_score: number
    gold_assessment_min_score: number
    gold_assessment_max_score: number
  }[]
}

export interface CreateJrProductRequest {
  name: string
  description?: string
  configuration: {
    bronze_assessment_min_score: number
    bronze_assessment_max_score: number
    silver_assessment_min_score: number
    silver_assessment_max_score: number
    gold_assessment_min_score: number
    gold_assessment_max_score: number
  }
}

export interface UpdateJrProductRequest {
  id: string
  name?: string
  description?: string
  configuration?: {
    bronze_assessment_min_score?: number
    bronze_assessment_max_score?: number
    silver_assessment_min_score?: number
    silver_assessment_max_score?: number
    gold_assessment_min_score?: number
    gold_assessment_max_score?: number
  }
}

export interface JrProductsResponse {
  products: JrProduct[]
}

class JrProductsApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "JrProductsApiError"
  }
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `API Error: ${response.status} ${response.statusText}`
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // If it's not JSON, use the text as is
      errorMessage = errorText || errorMessage
    }
    
    throw new JrProductsApiError(errorMessage, response.status)
  }
  
  return response.json()
}

// Get all Job Readiness products
export async function getJrProducts(): Promise<JrProduct[]> {
  try {
    const response = await fetch("/api/admin/job-readiness/products", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    const data = await handleApiResponse<JrProductsResponse>(response)
    return data.products || []
  } catch (error) {
    console.error("Failed to fetch JR products:", error)
    throw error
  }
}

// Create a new Job Readiness product
export async function createJrProduct(product: CreateJrProductRequest): Promise<JrProduct> {
  try {
    const response = await fetch("/api/admin/job-readiness/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    })
    
    return await handleApiResponse<JrProduct>(response)
  } catch (error) {
    console.error("Failed to create JR product:", error)
    throw error
  }
}

// Update an existing Job Readiness product
export async function updateJrProduct(product: UpdateJrProductRequest): Promise<JrProduct> {
  try {
    const response = await fetch("/api/admin/job-readiness/products", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    })
    
    return await handleApiResponse<JrProduct>(response)
  } catch (error) {
    console.error("Failed to update JR product:", error)
    throw error
  }
}

// Delete a Job Readiness product
export async function deleteJrProduct(productId: string): Promise<void> {
  try {
    const response = await fetch(`/api/admin/job-readiness/products?id=${encodeURIComponent(productId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    await handleApiResponse<void>(response)
  } catch (error) {
    console.error("Failed to delete JR product:", error)
    throw error
  }
}

// Type guards and utilities
export function isJrProduct(product: any): product is JrProduct {
  return (
    product &&
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    product.type === "JOB_READINESS" &&
    Array.isArray(product.job_readiness_products)
  )
}

export function getProductTierConfiguration(product: JrProduct) {
  const config = product.job_readiness_products[0]
  if (!config) return null
  
  return {
    bronze: {
      min: config.bronze_assessment_min_score,
      max: config.bronze_assessment_max_score,
    },
    silver: {
      min: config.silver_assessment_min_score,
      max: config.silver_assessment_max_score,
    },
    gold: {
      min: config.gold_assessment_min_score,
      max: config.gold_assessment_max_score,
    },
  }
}

export { JrProductsApiError } 