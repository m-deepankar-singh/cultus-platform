// ===== TanStack Query Migration Foundation - Phase 0 Complete =====

// ===== New Organized Query & Mutation Hooks (Primary) =====
// These are the new TanStack Query organized hooks (Phase 0)
export * from './queries';
export * from './mutations';

// ===== Core Utility Hooks =====
export * from './use-current-user';
export * from './use-logout';
export * from './use-mobile';
export * from './use-toast';
export * from './use-debounce';

// ===== Legacy API Hooks (Backward Compatibility) =====
// These will be gradually migrated in Phase 1-2

// ===== Expert Sessions (Already Organized) =====

// ===== Individual Hooks (To Be Migrated) =====
// These will be gradually migrated to the organized structure
export * from './useAssessmentList';
export * from './useSubmitAssessment';
export * from './useCourseList';
export * from './useDirectUpload';
export * from './useInterviewQuestions';
export * from './useInterviewSubmissions';
export * from './useJobReadinessMutations';
export * from './useJobReadinessModuleGroups';
export * from './useLiveInterview';
export * from './usePromotionExamEligibility';
export * from './useProjectGeneration';
export * from './useProjectSubmissions';
export * from './useSimplifiedCourseProgress';
export * from './useStartPromotionExam';
export * from './useSubmitPromotionExam';
export * from './useVideoRecording';
export * from './useInvalidateInterviewCache';

// ===== Specific Named Exports to Avoid Conflicts =====
export { useEnhancedCourseContent } from './useEnhancedCourseContent';
export { useExpertSessions } from './useExpertSessions';
export { useJobReadinessProducts } from './useJobReadinessProducts';
export { useJobReadinessProgress } from './useJobReadinessProgress';
export { useCurrentUser } from './useCurrentUser'; 