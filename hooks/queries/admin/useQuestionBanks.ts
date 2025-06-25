import { 
  useInfiniteQuery, 
  UseInfiniteQueryResult,
  InfiniteData,
  useQuery
} from '@tanstack/react-query';
import { apiClient, buildQueryParams } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

// TypeScript interfaces for Question Banks
export interface QuestionBank {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ';
  options: { id: string; text: string }[];
  correct_answer: string | { answers: string[] };
  topic?: string | null;
  difficulty?: string | null;
  bankType: 'assessment' | 'course';
  created_at: string;
  updated_at?: string;
}

export interface QuestionBanksResponse {
  data: QuestionBank[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

export interface QuestionBanksFilters {
  search?: string;
  type?: 'assessment' | 'course';
  tag?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  page?: number;
  pageSize?: number;
}

// Helper function to flatten paginated data
export function flattenQuestionBanksPages(
  data?: InfiniteData<QuestionBanksResponse>
): QuestionBank[] {
  if (!data) return [];
  return data.pages.flatMap(page => page.data);
}

// Helper function to get total count
export function getTotalQuestionBanksCount(
  data?: InfiniteData<QuestionBanksResponse>
): number {
  if (!data || !data.pages.length) return 0;
  return data.pages[0].metadata.totalCount;
}

// Infinite query hook for question banks
export function useQuestionBanksInfinite(
  filters: QuestionBanksFilters = {}
): UseInfiniteQueryResult<InfiniteData<QuestionBanksResponse>, Error> {
  return useInfiniteQuery({
    queryKey: queryKeys.adminQuestionBanks(filters),
    queryFn: async ({ pageParam }) => {
      const params = buildQueryParams({
        ...filters,
        page: pageParam,
      });
      
      const response = await apiClient<QuestionBanksResponse>(
        `/api/admin/question-banks?${params}`
      );
      
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { currentPage, totalPages } = lastPage.metadata;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Single question query hook
export function useQuestionBank(questionId: string) {
  return useQuery({
    queryKey: ['admin', 'question-bank', questionId],
    queryFn: () => apiClient<QuestionBank>(`/api/admin/question-banks/${questionId}`),
    enabled: !!questionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
} 