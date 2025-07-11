// Job Readiness Student Progress API Client Functions

export interface JrStudentProgress {
  id: string
  student_id: string
  product_id: string
  job_readiness_star_level: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | null
  job_readiness_tier: "BRONZE" | "SILVER" | "GOLD"
  created_at?: string
  updated_at?: string
  // Related data from joins
  student?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  product?: {
    id: string
    name: string
    description?: string
  }
  // Module progress summary (if available)
  module_progress?: {
    total_modules: number
    completed_modules: number
    completion_percentage: number
  }
}

export interface JrProgressFilters {
  productId?: string
  clientId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface JrProgressResponse {
  students: JrStudentProgress[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface OverrideProgressRequest {
  job_readiness_star_level: "NONE" | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | null | undefined
  job_readiness_tier: "BRONZE" | "SILVER" | "GOLD"
  reason: string
}

export interface ExportProgressRequest {
  productId?: string
  clientId?: string
  format: "csv" | "xlsx"
}

// Star level and tier enums
export const STAR_LEVELS = ["ONE", "TWO", "THREE", "FOUR", "FIVE"] as const
export const TIER_LEVELS = ["BRONZE", "SILVER", "GOLD"] as const

export type StarLevel = typeof STAR_LEVELS[number]
export type TierLevel = typeof TIER_LEVELS[number]

class JrProgressApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "JrProgressApiError"
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
    
    throw new JrProgressApiError(errorMessage, response.status)
  }
  
  return response.json()
}

// Get student progress with filtering and pagination
export async function getJrStudentProgress(filters: JrProgressFilters = {}): Promise<JrProgressResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (filters.productId) searchParams.append("productId", filters.productId)
    if (filters.clientId) searchParams.append("clientId", filters.clientId)
    if (filters.search) searchParams.append("search", filters.search)
    if (filters.page) searchParams.append("page", filters.page.toString())
    if (filters.pageSize) searchParams.append("pageSize", filters.pageSize.toString())

    const url = `/api/admin/job-readiness/progress${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    return await handleApiResponse<JrProgressResponse>(response)
  } catch (error) {
    console.error("Failed to fetch student progress:", error)
    throw error
  }
}

// Override student progress manually
export async function overrideStudentProgress(
  studentId: string, 
  overrideData: OverrideProgressRequest
): Promise<void> {
  try {
    // Map the frontend 'reason' field to the backend 'override_reason' field
    const apiPayload = {
      job_readiness_star_level: overrideData.job_readiness_star_level,
      job_readiness_tier: overrideData.job_readiness_tier,
      override_reason: overrideData.reason, // Map reason to override_reason
    }

    const response = await fetch(`/api/admin/job-readiness/students/${encodeURIComponent(studentId)}/override-progress`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    })
    
    await handleApiResponse<void>(response)
  } catch (error) {
    console.error("Failed to override student progress:", error)
    throw error
  }
}

// Export progress data
export async function exportProgressData(exportRequest: ExportProgressRequest): Promise<Blob> {
  try {
    const searchParams = new URLSearchParams()
    
    if (exportRequest.productId) searchParams.append("productId", exportRequest.productId)
    if (exportRequest.clientId) searchParams.append("clientId", exportRequest.clientId)
    searchParams.append("format", exportRequest.format)

    const url = `/api/admin/job-readiness/progress/export?${searchParams.toString()}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": exportRequest.format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new JrProgressApiError(`Export failed: ${response.status} ${response.statusText} - ${errorText}`, response.status)
    }
    
    return await response.blob()
  } catch (error) {
    console.error("Failed to export progress data:", error)
    throw error
  }
}

// Utility functions
export function getStarLevelLabel(level: string | null): string {
  if (!level) return "☆ No Stars"
  
  const labels: Record<string, string> = {
    ONE: "⭐ Level 1",
    TWO: "⭐⭐ Level 2", 
    THREE: "⭐⭐⭐ Level 3",
    FOUR: "⭐⭐⭐⭐ Level 4",
    FIVE: "⭐⭐⭐⭐⭐ Level 5"
  }
  return labels[level] || level
}

export function getTierLevelLabel(tier: string): string {
  const labels: Record<string, string> = {
    BRONZE: "🥉 Bronze",
    SILVER: "🥈 Silver",
    GOLD: "🥇 Gold"
  }
  return labels[tier] || tier
}

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    BRONZE: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700",
    SILVER: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/20 dark:text-slate-200 dark:border-slate-700", 
    GOLD: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-700"
  }
  return colors[tier] || "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700"
}

export function getStarLevelColor(level: string | null): string {
  if (!level) return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700"
  
  const colors: Record<string, string> = {
    ONE: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700",
    TWO: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-700",
    THREE: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-700",
    FOUR: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-700",
    FIVE: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-200 dark:border-green-700"
  }
  return colors[level] || "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700"
}

export function formatModuleProgress(progress?: { total_modules: number; completed_modules: number; completion_percentage: number }): string {
  if (!progress) return "No data"
  return `${progress.completed_modules}/${progress.total_modules} (${progress.completion_percentage}%)`
}

export function isJrStudentProgress(progress: any): progress is JrStudentProgress {
  return (
    progress &&
    typeof progress.id === "string" &&
    typeof progress.student_id === "string" &&
    typeof progress.product_id === "string" &&
    (progress.job_readiness_star_level === null || STAR_LEVELS.includes(progress.job_readiness_star_level)) &&
    TIER_LEVELS.includes(progress.job_readiness_tier)
  )
}

export { JrProgressApiError } 