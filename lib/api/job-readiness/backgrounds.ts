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

// Background and Project type enums (based on actual database enum values)
export const BACKGROUND_TYPES = [
  'BUSINESS_ADMINISTRATION',
  'COMPUTER_SCIENCE',
  'DATA_SCIENCE',
  'DESIGN',
  'ECONOMICS',
  'ENGINEERING',
  'HEALTHCARE',
  'HUMANITIES',
  'MARKETING',
  'OTHER'
] as const

export const PROJECT_TYPES = [
  'BUSINESS_PROPOSAL',
  'CASE_STUDY',
  'CODING_PROJECT',
  'CONTENT_CREATION',
  'DATA_ANALYSIS',
  'DESIGN_CONCEPT',
  'MARKETING_PLAN',
  'OTHER',
  'RESEARCH_OUTLINE',
  'TECHNICAL_DOCUMENTATION'
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
    
    // Provide more specific error messages for common status codes
    if (response.status === 409) {
      // Conflict - usually duplicate entry
      throw new JrBackgroundsApiError(errorMessage || "This combination already exists. Please choose different values or edit the existing configuration.", response.status)
    } else if (response.status === 400) {
      // Bad Request - validation error
      throw new JrBackgroundsApiError(errorMessage || "Invalid input data. Please check your form and try again.", response.status)
    } else if (response.status === 500) {
      // Internal Server Error
      throw new JrBackgroundsApiError(errorMessage || "An internal server error occurred. Please try again later.", response.status)
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
    BUSINESS_ADMINISTRATION: "Business Administration",
    COMPUTER_SCIENCE: "Computer Science",
    DATA_SCIENCE: "Data Science", 
    DESIGN: "Design",
    ECONOMICS: "Economics",
    ENGINEERING: "Engineering",
    HEALTHCARE: "Healthcare",
    HUMANITIES: "Humanities",
    MARKETING: "Marketing",
    OTHER: "Other"
  }
  return labels[type] || type
}

export function getProjectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BUSINESS_PROPOSAL: "Business Proposal",
    CASE_STUDY: "Case Study",
    CODING_PROJECT: "Coding Project",
    CONTENT_CREATION: "Content Creation",
    DATA_ANALYSIS: "Data Analysis",
    DESIGN_CONCEPT: "Design Concept",
    MARKETING_PLAN: "Marketing Plan",
    OTHER: "Other",
    RESEARCH_OUTLINE: "Research Outline",
    TECHNICAL_DOCUMENTATION: "Technical Documentation"
  }
  return labels[type] || type
}

export { JrBackgroundsApiError } 