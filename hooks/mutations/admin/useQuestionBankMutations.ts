import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/components/ui/use-toast';
import type { QuestionBank } from '@/hooks/queries/admin/useQuestionBanks';

// Create question bank mutation
interface CreateQuestionBankData {
  question_text: string;
  question_type: 'MCQ' | 'MSQ';
  options: { id: string; text: string }[];
  correct_answer: string | { answers: string[] };
  topic?: string | null;
  difficulty?: string | null;
  bank_type: 'assessment' | 'course';
}

export function useCreateQuestionBank(): UseMutationResult<QuestionBank, Error, CreateQuestionBankData> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateQuestionBankData) => {
      return apiClient<QuestionBank>('/api/admin/question-banks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onMutate: async (newQuestion) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
      
      return { newQuestion };
    },
    onError: (error, newQuestion, context) => {
      toast({
        title: "Error",
        description: `Failed to create question: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Question created successfully",
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
    },
  });
}

// Update question bank mutation
interface UpdateQuestionBankData {
  question_text?: string;
  question_type?: 'MCQ' | 'MSQ';
  options?: { id: string; text: string }[];
  correct_answer?: string | { answers: string[] };
  topic?: string | null;
  difficulty?: string | null;
  bank_type?: 'assessment' | 'course';
}

export function useUpdateQuestionBank(): UseMutationResult<QuestionBank, Error, { id: string; data: UpdateQuestionBankData }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return apiClient<QuestionBank>(`/api/admin/question-banks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
      
      await queryClient.cancelQueries({ 
        queryKey: ['admin', 'question-bank', id] 
      });
      
      return { id, data };
    },
    onError: (error, variables, context) => {
      toast({
        title: "Error",
        description: `Failed to update question: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success", 
        description: "Question updated successfully",
      });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['admin', 'question-bank', variables.id] 
      });
    },
  });
}

// Delete question bank mutation
export function useDeleteQuestionBank(): UseMutationResult<{ message: string }, Error, string> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<{ message: string }>(`/api/admin/question-banks/${id}`, {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
      
      return { id };
    },
    onError: (error, id, context) => {
      toast({
        title: "Error",
        description: `Failed to delete question: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
    },
  });
} 