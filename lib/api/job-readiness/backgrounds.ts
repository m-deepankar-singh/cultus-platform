// Job Readiness Backgrounds API Client Functions

export interface GradingCriterion {
  weight: number
  criterion: string
}

export interface JrBackground {
  id: string
  background_type: string
  project_type: string
  project_description_template: string
  grading_criteria: GradingCriterion[]
  bronze_system_prompt: string
  bronze_input_prompt: string
  silver_system_prompt: string
  silver_input_prompt: string
  gold_system_prompt: string
  gold_input_prompt: string
  created_at?: string
  updated_at?: string
}

export interface CreateJrBackgroundRequest {
  background_type: string
  project_type: string
  project_description_template: string
  grading_criteria: GradingCriterion[]
  bronze_system_prompt: string
  bronze_input_prompt: string
  silver_system_prompt: string
  silver_input_prompt: string
  gold_system_prompt: string
  gold_input_prompt: string
}

export interface UpdateJrBackgroundRequest {
  id: string
  background_type?: string
  project_type?: string
  project_description_template?: string
  grading_criteria?: GradingCriterion[]
  bronze_system_prompt?: string
  bronze_input_prompt?: string
  silver_system_prompt?: string
  silver_input_prompt?: string
  gold_system_prompt?: string
  gold_input_prompt?: string
}

export interface JrBackgroundsResponse {
  backgrounds: JrBackground[]
}

// Background and Project type enums (based on common patterns)
export const BACKGROUND_TYPES = [
  'COMPUTER_SCIENCE',
  'DATA_SCIENCE',
  'BUSINESS',
  'DESIGN',
  'MARKETING',
  'ENGINEERING',
  'OTHER'
] as const

export const PROJECT_TYPES = [
  'CODING_PROJECT',
  'DATA_ANALYSIS',
  'BUSINESS_CASE',
  'DESIGN_PORTFOLIO',
  'MARKETING_CAMPAIGN',
  'TECHNICAL_DOCUMENTATION',
  'RESEARCH_PROJECT'
] as const

export type BackgroundType = typeof BACKGROUND_TYPES[number]
export type ProjectType = typeof PROJECT_TYPES[number]

class JrBackgroundsApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "JrBackgroundsApiError"
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
    
    throw new JrBackgroundsApiError(errorMessage, response.status)
  }
  
  return response.json()
}

// Get all Job Readiness backgrounds
export async function getJrBackgrounds(): Promise<JrBackground[]> {
  try {
    const response = await fetch("/api/admin/job-readiness/backgrounds", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    const data = await handleApiResponse<JrBackgroundsResponse>(response)
    return data.backgrounds || []
  } catch (error) {
    console.error("Failed to fetch JR backgrounds:", error)
    throw error
  }
}

// Create a new Job Readiness background configuration
export async function createJrBackground(background: CreateJrBackgroundRequest): Promise<JrBackground> {
  try {
    const response = await fetch("/api/admin/job-readiness/backgrounds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(background),
    })
    
    return await handleApiResponse<JrBackground>(response)
  } catch (error) {
    console.error("Failed to create JR background:", error)
    throw error
  }
}

// Update an existing Job Readiness background configuration
export async function updateJrBackground(background: UpdateJrBackgroundRequest): Promise<JrBackground> {
  try {
    const response = await fetch("/api/admin/job-readiness/backgrounds", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(background),
    })
    
    return await handleApiResponse<JrBackground>(response)
  } catch (error) {
    console.error("Failed to update JR background:", error)
    throw error
  }
}

// Delete a Job Readiness background configuration
export async function deleteJrBackground(backgroundId: string): Promise<void> {
  try {
    const response = await fetch(`/api/admin/job-readiness/backgrounds?id=${encodeURIComponent(backgroundId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    await handleApiResponse<void>(response)
  } catch (error) {
    console.error("Failed to delete JR background:", error)
    throw error
  }
}

// Type guards and utilities
export function isJrBackground(background: any): background is JrBackground {
  return (
    background &&
    typeof background.id === "string" &&
    typeof background.background_type === "string" &&
    typeof background.project_type === "string" &&
    Array.isArray(background.grading_criteria)
  )
}

export function validateGradingCriteria(criteria: GradingCriterion[]): string | null {
  if (!criteria || criteria.length === 0) {
    return "At least one grading criterion is required"
  }

  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  if (Math.abs(totalWeight - 100) > 0.1) { // Allow small floating point differences
    return `Total weight must equal 100% (current: ${totalWeight}%)`
  }

  for (const criterion of criteria) {
    if (!criterion.criterion.trim()) {
      return "All criterion names must be provided"
    }
    if (criterion.weight <= 0 || criterion.weight > 100) {
      return "All weights must be between 1 and 100"
    }
  }

  return null
}

export function getBackgroundTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    COMPUTER_SCIENCE: "Computer Science",
    DATA_SCIENCE: "Data Science", 
    BUSINESS: "Business",
    DESIGN: "Design",
    MARKETING: "Marketing",
    ENGINEERING: "Engineering",
    OTHER: "Other"
  }
  return labels[type] || type
}

export function getProjectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CODING_PROJECT: "Coding Project",
    DATA_ANALYSIS: "Data Analysis",
    BUSINESS_CASE: "Business Case",
    DESIGN_PORTFOLIO: "Design Portfolio", 
    MARKETING_CAMPAIGN: "Marketing Campaign",
    TECHNICAL_DOCUMENTATION: "Technical Documentation",
    RESEARCH_PROJECT: "Research Project"
  }
  return labels[type] || type
}

export { JrBackgroundsApiError } 