import { useQuery } from '@tanstack/react-query';
import { studentDashboardOptions } from '@/lib/query-options';

/**
 * Hook for fetching student dashboard data
 * Uses the query options pattern for type safety and reusability
 */
export function useStudentDashboard() {
  return useQuery(studentDashboardOptions());
} 