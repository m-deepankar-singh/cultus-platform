// Job Readiness Submissions API Client Functions

export interface JrSubmission {
  id: string
  student_id: string
  submission_type: "project"
  project_title?: string
  submission_content?: string
  submission_url?: string
  score?: number
  passed?: boolean
  created_at: string
  updated_at: string
  
  project_submission?: {
    project_title: string
    project_description: string
    tasks: string[]
    deliverables: string[]
  }
}

export interface SubmissionFilters {
  submissionType?: "project" | "all"
  passed?: boolean
  studentId?: string
  limit?: number
  offset?: number
}

export const SUBMISSION_TYPES = ["project"] as const

export interface JrSubmissionsFilters {
  productId?: string
  clientId?: string
  submissionType?: "project" | "interview" | "all"
  reviewStatus?: "pending" | "approved" | "rejected" | "all"
  search?: string
  page?: number
  pageSize?: number
}

export interface JrSubmissionsResponse {
  submissions: JrSubmission[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ManualReviewRequest {
  status: "approved" | "rejected"
  admin_feedback: string
}

// Submission type and status enums
export const AI_GRADE_STATUSES = ["pending", "completed", "failed"] as const
export const MANUAL_REVIEW_STATUSES = ["pending", "approved", "rejected", "not_required"] as const

export type AiGradeStatus = typeof AI_GRADE_STATUSES[number]
export type ManualReviewStatus = typeof MANUAL_REVIEW_STATUSES[number]

class JrSubmissionsApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = "JrSubmissionsApiError"
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
    
    throw new JrSubmissionsApiError(errorMessage, response.status)
  }
  
  return response.json()
}

// Get submissions with filtering and pagination
export async function getJrSubmissions(filters: JrSubmissionsFilters = {}): Promise<JrSubmissionsResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (filters.productId) searchParams.append("productId", filters.productId)
    if (filters.clientId) searchParams.append("clientId", filters.clientId)
    if (filters.submissionType && filters.submissionType !== "all") {
      searchParams.append("submissionType", filters.submissionType)
    }
    if (filters.reviewStatus && filters.reviewStatus !== "all") {
      searchParams.append("reviewStatus", filters.reviewStatus)
    }
    if (filters.search) searchParams.append("search", filters.search)
    if (filters.page) searchParams.append("page", filters.page.toString())
    if (filters.pageSize) searchParams.append("pageSize", filters.pageSize.toString())

    const url = `/api/admin/job-readiness/submissions${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    return await handleApiResponse<JrSubmissionsResponse>(response)
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    throw error
  }
}

// Submit manual review for interview submission
export async function submitManualReview(submissionId: string, approved: boolean, feedback?: string) {
  const response = await fetch(`/api/admin/job-readiness/submissions/${encodeURIComponent(submissionId)}/manual-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      approved,
      feedback
    })
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || 'Failed to submit manual review')
  }
  
  return response.json()
}

// Get submission details by ID
export async function getSubmissionDetails(submissionId: string): Promise<JrSubmission> {
  try {
    const response = await fetch(`/api/admin/job-readiness/submissions/${encodeURIComponent(submissionId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    return await handleApiResponse<JrSubmission>(response)
  } catch (error) {
    console.error("Failed to fetch submission details:", error)
    throw error
  }
}

// Helper functions for UI display
export const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  project: "📁 Project"
}

export const SUBMISSION_TYPE_COLORS: Record<string, string> = {
  project: "bg-blue-100 text-blue-800 border-blue-300"
}

export const AI_GRADE_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Pending",
  completed: "✅ Completed", 
  failed: "❌ Failed"
}

export const AI_GRADE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300"
}

export const MANUAL_REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Pending Review",
  approved: "✅ Approved",
  rejected: "❌ Rejected",
  not_required: "➖ Not Required"
}

export const MANUAL_REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-green-100 text-green-800 border-green-300", 
  rejected: "bg-red-100 text-red-800 border-red-300",
  not_required: "bg-gray-100 text-gray-800 border-gray-300"
}

export function isProjectSubmission(submission: JrSubmission): boolean {
  return submission.submission_type === "project"
}

export function requiresManualReview(submission: JrSubmission): boolean {
  return submission.submission_type === "project" &&
    submission.score !== undefined &&
    submission.score < 80
}

export function isJrSubmission(submission: any): submission is JrSubmission {
  return (
    submission &&
    typeof submission.id === "string" &&
    typeof submission.student_id === "string" &&
    typeof submission.product_id === "string" &&
    SUBMISSION_TYPES.includes(submission.submission_type) &&
    AI_GRADE_STATUSES.includes(submission.ai_grade_status) &&
    MANUAL_REVIEW_STATUSES.includes(submission.manual_review_status)
  )
}

export { JrSubmissionsApiError } 