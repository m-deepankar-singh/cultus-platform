// Job Readiness Hooks - Complete Foundation Setup

// Authentication & User Hooks
export { useCurrentUser } from './use-current-user'
export { useLogout } from './use-logout'

// Core Job Readiness Hooks
export { useJobReadinessProducts } from './useJobReadinessProducts'
export { useJobReadinessProgress } from './useJobReadinessProgress'
export { useJobReadinessModuleGroups } from './useJobReadinessModuleGroups'

// Assessment Hooks
export { useAssessmentList } from './useAssessmentList'
export { useAssessmentDetails } from './useAssessmentDetails'
export { useSubmitAssessment } from './useSubmitAssessment'

// Course Hooks
export { useCourseList } from './useCourseList'
export { useCourseContent } from './useCourseContent'
export { useEnhancedCourseContent } from './useEnhancedCourseContent'

// Expert Session Hooks
export { useExpertSessions } from './useExpertSessions'
export * from './expert-sessions'

// Project Hooks
export { useProjectGeneration } from './useProjectGeneration'

// Interview Hooks
export { useInterviewQuestions } from './useInterviewQuestions'

// Promotion Exam Hooks
export { usePromotionExamEligibility } from './usePromotionExamEligibility'
export { useStartPromotionExam } from './useStartPromotionExam'
export { useSubmitPromotionExam } from './useSubmitPromotionExam'

// Mutation Hooks (Job Readiness specific)
export { useUpdateProgress, useSubmitProject, useUpdateExpertSessionProgress } from './useJobReadinessMutations'

// Upload Hooks
export { useDirectUpload } from './useDirectUpload'

// UI Utility Hooks
export { useIsMobile } from './use-mobile'
export { toast } from './use-toast'

// Cache Management Hooks
export { useInvalidateInterviewCache } from './useInvalidateInterviewCache' 