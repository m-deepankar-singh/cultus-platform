import { useQuery } from '@tanstack/react-query';
import { courseContentOptions, enhancedCourseContentOptions } from '@/lib/query-options';

/**
 * Hook for fetching course content
 */
export function useCourseContent(courseId: string) {
  return useQuery(courseContentOptions(courseId));
}

/**
 * Hook for fetching enhanced course content (matches existing useEnhancedCourseContent)
 */
export function useEnhancedCourseContent(moduleId: string) {
  return useQuery(enhancedCourseContentOptions(moduleId));
}

/**
 * Hook for fetching course progress
 */
export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ['courses', 'progress', courseId],
    queryFn: () => fetch(`/api/app/courses/${courseId}/progress`).then(res => res.json()),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!courseId,
  });
} 