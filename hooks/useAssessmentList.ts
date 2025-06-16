import { useQuery } from "@tanstack/react-query"

interface AssessmentProgress {
  status: string
  module_id: string
  student_id: string
  completed_at: string | null
  last_updated: string
  progress_details: {
    score?: number
    passed?: boolean
    submitted?: boolean
    correct_answers?: number
    total_questions?: number
  } | null
  progress_percentage: number
}

interface Assessment {
  id: string
  name: string
  type: string
  configuration: {
    pass_threshold: number
    duration_minutes: number
  }
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  is_tier_determining: boolean
  assessment_type: string
  progress: AssessmentProgress | null
  questions_count: number
  last_score: number | null
  tier_achieved: string | null
}

interface AssessmentListResponse {
  assessments: Assessment[]
  tier_criteria: {
    bronze: { min_score: number; max_score: number }
    silver: { min_score: number; max_score: number }
    gold: { min_score: number; max_score: number }
  }
  current_tier: string | null
  current_star_level: string
  all_assessments_complete: boolean
  completed_assessments_count: number
  total_assessments_count: number
  product: {
    id: string
    name: string
    type: string
  }
}

// API response structure (what we actually get from the backend)
interface ApiResponse {
  success: boolean
  assessments: Assessment[]
  completion_summary: {
    completed_assessments: number
    total_assessments: number
    completion_percentage: number
  }
  current_student_state: {
    tier: string | null
    star_level: string | null
  }
  tier_configuration: {
    bronze_assessment_min_score: number
    bronze_assessment_max_score: number
    silver_assessment_min_score: number
    silver_assessment_max_score: number
    gold_assessment_min_score: number
    gold_assessment_max_score: number
  }
}

export function useAssessmentList(productId: string) {
  return useQuery<AssessmentListResponse>({
    queryKey: ['job-readiness', 'assessments', productId],
    queryFn: async () => {
      const response = await fetch(`/api/app/job-readiness/assessments?productId=${productId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness assessments')
      }
      const apiData: ApiResponse = await response.json()
      
      // Transform the API response to match our expected interface
      const tierConfiguration = apiData.tier_configuration || {}
      
      // Calculate completion status
      const completedCount = apiData.completion_summary?.completed_assessments || 0
      const totalCount = apiData.completion_summary?.total_assessments || 0
      const allComplete = totalCount > 0 && completedCount === totalCount
      
      const transformedData: AssessmentListResponse = {
        assessments: apiData.assessments || [],
        tier_criteria: {
          bronze: {
            min_score: tierConfiguration.bronze_assessment_min_score || 0,
            max_score: tierConfiguration.bronze_assessment_max_score || 60
          },
          silver: {
            min_score: tierConfiguration.silver_assessment_min_score || 61,
            max_score: tierConfiguration.silver_assessment_max_score || 80
          },
          gold: {
            min_score: tierConfiguration.gold_assessment_min_score || 81,
            max_score: tierConfiguration.gold_assessment_max_score || 100
          }
        },
        current_tier: apiData.current_student_state?.tier || null,
        current_star_level: apiData.current_student_state?.star_level || '',
        all_assessments_complete: allComplete,
        completed_assessments_count: completedCount,
        total_assessments_count: totalCount,
        product: {
          id: productId,
          name: 'Job Readiness',
          type: 'JOB_READINESS'
        }
      }
      
      return transformedData
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
} 