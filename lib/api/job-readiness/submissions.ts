// Job Readiness Submissions API Client Functions

export interface JrSubmission {
  id: string
  student_id: string
  product_id?: string
  submission_type: "project" | "interview"
  project_title?: string
  submission_content?: string
  submission_url?: string
  score?: number
  passed?: boolean
  created_at: string
  updated_at: string
  submission_date?: string
  ai_grade_status?: AiGradeStatus
  manual_review_status?: ManualReviewStatus
  reviewer_id?: string
  admin_feedback?: string
  review_date?: string
  
  // Related data that gets populated via joins
  student?: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    email: string
  }
  
  product?: {
    id: string
    name: string
    description?: string
  }
  
  project_submission?: {
    project_title: string
    project_description: string
    tasks: string[]
    deliverables: string[]
    background_type?: string
    project_type?: string
    feedback?: string
  }
  
  interview_submission?: {
    video_storage_path: string
    video_url?: string
    passed?: boolean
    feedback?: string
    questions_used?: any[]
    analysis_result?: any
  }
}

export interface SubmissionFilters {
  submissionType?: "project" | "all"
  passed?: boolean
  studentId?: string
  limit?: number
  offset?: number
}

export interface JrSubmissionsFilters {
  productId?: string
  clientId?: string
  submissionType?: "project" | "interview" | "all"
  reviewStatus?: "pending" | "approved" | "rejected" | "all"
  search?: string
  page?: number
  pageSize?: number
  // Interview-specific filters
  status?: string
  aiVerdict?: string
  confidenceScore?: string
  backgroundType?: string
  tierWhenSubmitted?: string
  dateFrom?: string
  dateTo?: string
  // Project-specific filters
  projectType?: string
  scoreRange?: string
  contentSize?: string
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

// Define constants for validation
export const SUBMISSION_TYPES = ["project", "assessment", "interview"] as const
export const AI_GRADE_STATUSES = ["pending", "completed", "failed"] as const
export const MANUAL_REVIEW_STATUSES = ["pending", "approved", "rejected", "not_required"] as const

export type SubmissionType = typeof SUBMISSION_TYPES[number]
export type AiGradeStatus = typeof AI_GRADE_STATUSES[number]
export type ManualReviewStatus = typeof MANUAL_REVIEW_STATUSES[number]

export interface ManualReviewRequest {
  status: ManualReviewStatus
  admin_feedback: string
}

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

// NEW: Get interview submissions specifically
export async function getInterviewSubmissions(filters: JrSubmissionsFilters = {}): Promise<JrSubmissionsResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (filters.clientId) searchParams.append("client_id", filters.clientId)
    if (filters.search) searchParams.append("search", filters.search)
    if (filters.page) searchParams.append("page", filters.page.toString())
    if (filters.pageSize) searchParams.append("limit", filters.pageSize.toString())
    
    // Interview-specific filters
    if (filters.status && filters.status !== "all") searchParams.append("status", filters.status)
    if (filters.aiVerdict && filters.aiVerdict !== "all") searchParams.append("ai_verdict", filters.aiVerdict)
    if (filters.confidenceScore) searchParams.append("confidenceScore", filters.confidenceScore)
    if (filters.backgroundType) searchParams.append("background_type", filters.backgroundType)
    if (filters.tierWhenSubmitted) searchParams.append("tierWhenSubmitted", filters.tierWhenSubmitted)
    if (filters.dateFrom) searchParams.append("date_from", filters.dateFrom)
    if (filters.dateTo) searchParams.append("date_to", filters.dateTo)

    // Add cache-busting parameter to ensure fresh data
    searchParams.append("_t", Date.now().toString())

    const url = `/api/admin/job-readiness/interviews${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    })
    
    return await handleApiResponse<JrSubmissionsResponse>(response)
  } catch (error) {
    console.error("Failed to fetch interview submissions:", error)
    throw error
  }
}

// NEW: Get project submissions specifically
export async function getProjectSubmissions(filters: JrSubmissionsFilters = {}): Promise<JrSubmissionsResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (filters.productId) searchParams.append("productId", filters.productId)
    if (filters.clientId) searchParams.append("clientId", filters.clientId)
    if (filters.search) searchParams.append("search", filters.search)
    if (filters.page) searchParams.append("page", filters.page.toString())
    if (filters.pageSize) searchParams.append("pageSize", filters.pageSize.toString())
    
    // Project-specific filters
    if (filters.projectType) searchParams.append("projectType", filters.projectType)
    if (filters.scoreRange) searchParams.append("scoreRange", filters.scoreRange)
    if (filters.contentSize) searchParams.append("contentSize", filters.contentSize)
    if (filters.backgroundType) searchParams.append("backgroundType", filters.backgroundType)

    // Add cache-busting parameter to ensure fresh data
    searchParams.append("_t", Date.now().toString())

    const url = `/api/admin/job-readiness/projects${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    })
    
    return await handleApiResponse<JrSubmissionsResponse>(response)
  } catch (error) {
    console.error("Failed to fetch project submissions:", error)
    throw error
  }
}

// DEPRECATED: Get submissions with filtering and pagination (use getInterviewSubmissions or getProjectSubmissions instead)
export async function getJrSubmissions(filters: JrSubmissionsFilters = {}): Promise<JrSubmissionsResponse> {
  console.warn("DEPRECATED: getJrSubmissions is deprecated. Use getInterviewSubmissions or getProjectSubmissions instead.")
  
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
export async function submitManualReview(submissionId: string, reviewData: ManualReviewRequest) {
  const response = await fetch(`/api/admin/job-readiness/submissions/${encodeURIComponent(submissionId)}/manual-review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: reviewData.status,
      admin_feedback: reviewData.admin_feedback
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

// Date formatting helper
export function formatSubmissionDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid Date'
  }
}

// Submission type helpers
export function getSubmissionTypeLabel(type: string): string {
  return SUBMISSION_TYPE_LABELS[type] || type
}

export function getSubmissionTypeColor(type: string): string {
  return SUBMISSION_TYPE_COLORS[type] || "bg-gray-100 text-gray-800 border-gray-300"
}

// AI grade status helpers
export function getAiGradeStatusLabel(status: string): string {
  return AI_GRADE_STATUS_LABELS[status] || status
}

export function getAiGradeStatusColor(status: string): string {
  return AI_GRADE_STATUS_COLORS[status] || "bg-gray-100 text-gray-800 border-gray-300"
}

// Manual review status helpers
export function getManualReviewStatusLabel(status: string): string {
  return MANUAL_REVIEW_STATUS_LABELS[status] || status
}

export function getManualReviewStatusColor(status: string): string {
  return MANUAL_REVIEW_STATUS_COLORS[status] || "bg-gray-100 text-gray-800 border-gray-300"
}

// Interview submission helpers
export function isInterviewSubmission(submission: any): boolean {
  return submission?.submission_type === "interview" || !!submission?.video_storage_path
}

export { JrSubmissionsApiError } 