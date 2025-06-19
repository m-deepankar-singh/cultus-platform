// Job Readiness Hooks - Complete Foundation Setup

// Query Hooks
export { useJobReadinessProducts } from './useJobReadinessProducts'
export { useJobReadinessProgress } from './useJobReadinessProgress'
export { useAssessmentList } from './useAssessmentList'
export { useAssessmentDetails } from './useAssessmentDetails'
export { useCourseList } from './useCourseList'
export { useCourseContent } from './useCourseContent'
export { useExpertSessions } from './useExpertSessions'
export { useProjectGeneration } from './useProjectGeneration'
export { useInterviewQuestions } from './useInterviewQuestions'
export { usePromotionExamEligibility } from './usePromotionExamEligibility'

// Mutation Hooks
export { useSubmitQuiz, useUpdateProgress, useSubmitProject, useUpdateExpertSessionProgress } from './useJobReadinessMutations'
export { useSubmitAssessment } from './useSubmitAssessment'
export { useStartPromotionExam } from './useStartPromotionExam'
export { useSubmitPromotionExam } from './useSubmitPromotionExam'

// Other existing hooks
export { useCurrentUser } from './useCurrentUser'
export { useIsMobile } from './use-mobile'
export { toast } from './use-toast' 