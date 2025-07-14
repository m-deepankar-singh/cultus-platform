"use client"

import React, { useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useQuestionBanksInfinite, flattenQuestionBanksPages, getTotalQuestionBanksCount, type QuestionBank, type QuestionBanksFilters } from '@/hooks/queries/admin/useQuestionBanks';
import { useDeleteQuestionBank } from '@/hooks/mutations/admin/useQuestionBankMutations';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileQuestion, FileText, MoreHorizontal, Search, SlidersHorizontal, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { useDebounce } from '@/hooks/use-debounce';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuestionForm } from './question-form';

const ROW_HEIGHT = 60; // Height of each row in pixels
const TABLE_HEIGHT = 600; // Height of the virtual table

interface RowData {
  questions: QuestionBank[];
  onEditQuestion: (question: QuestionBank) => void;
  onDeleteQuestion: (id: string) => void;
}

// Type for the form question (matches QuestionForm's expected interface)
type FormQuestion = {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ';
  options: { id: string; text: string }[];
  correct_answer: string | { answers: string[] };
  topic?: string | null;
  difficulty?: string | null;
  created_by?: string | null;
};

// Individual row component for the virtual list
const QuestionBankRow = React.memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: RowData;
}) => {
  const { questions, onEditQuestion, onDeleteQuestion } = data;
  const question = questions[index];

  if (!question) {
    return (
      <div style={style} className="px-6 py-4 animate-pulse">
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-6 py-3 border-b hover:bg-muted/50 transition-colors" style={{...style, gridTemplateColumns: "3fr 120px 120px 140px 100px"}}>
      <div className="space-y-1">
        <p className="text-sm font-medium line-clamp-3">{question.question_text}</p>
        <div className="flex gap-1 flex-wrap">
          {question.topic && (
            <Badge variant="secondary" className="text-xs">
              {question.topic}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <Badge variant="outline" className="text-xs">
          {question.question_type}
        </Badge>
      </div>
      <div className="flex items-center">
        <Badge 
          variant="outline"
          className={`text-xs ${
            question.difficulty === 'easy'
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
              : question.difficulty === 'medium'
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
              : question.difficulty === 'hard'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
              : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
          }`}
        >
          {question.difficulty || 'N/A'}
        </Badge>
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
      </div>
      <div className="flex justify-end items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onEditQuestion(question)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onDeleteQuestion(question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

QuestionBankRow.displayName = 'QuestionBankRow';

export function VirtualizedQuestionBanksTable() {
  // Router and search params
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || "assessment";
  
  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [difficultyFilter, setDifficultyFilter] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = React.useState<string | null>(null);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [editQuestion, setEditQuestion] = React.useState<FormQuestion | null>(null);
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Build filters object
  const filters: QuestionBanksFilters = React.useMemo(() => {
    const f: QuestionBanksFilters = {
      pageSize: 50, // Optimized for virtualization
      type: typeParam as 'assessment' | 'course',
    };
    
    if (debouncedSearchTerm) {
      f.search = debouncedSearchTerm;
    }
    
    if (difficultyFilter && difficultyFilter !== 'all') {
      f.difficulty = difficultyFilter as 'easy' | 'medium' | 'hard';
    }
    
    return f;
  }, [debouncedSearchTerm, difficultyFilter, typeParam]);
  
  // Infinite query hook
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useQuestionBanksInfinite(filters);
  
  // Flatten all pages into single array
  const questions = React.useMemo(() => flattenQuestionBanksPages(data), [data]);
  const totalCount = React.useMemo(() => getTotalQuestionBanksCount(data), [data]);
  
  // Refs for infinite loader
  const infiniteLoaderRef = useRef<InfiniteLoader>(null);
  const hasMountedRef = useRef(false);
  
  // Reset infinite loader on filter change
  useEffect(() => {
    if (hasMountedRef.current && infiniteLoaderRef.current) {
      infiniteLoaderRef.current.resetloadMoreItemsCache();
    }
    hasMountedRef.current = true;
  }, [filters]);

  // Listen for bulk upload completion event
  useEffect(() => {
    const handleBulkUpload = () => {
      // Invalidate question bank queries to refresh the data
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
      
      // Reset infinite loader to start fresh
      if (infiniteLoaderRef.current) {
        infiniteLoaderRef.current.resetloadMoreItemsCache();
      }
      
      // Show success message
      toast({
        title: "Questions refreshed",
        description: "The question list has been updated with your bulk upload.",
      });
    };

    document.addEventListener('questionsBulkUploaded', handleBulkUpload);
    return () => document.removeEventListener('questionsBulkUploaded', handleBulkUpload);
  }, [queryClient, toast]);
  
  // Calculate item count for infinite loader
  const itemCount = hasNextPage ? questions.length + 1 : questions.length;
  
  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasNextPage || index < questions.length;
  }, [hasNextPage, questions.length]);
  
  // Load more items
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
    return Promise.resolve();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Delete question mutation
  const deleteQuestionMutation = useDeleteQuestionBank();
  
  // Handle edit question
  const handleEditQuestion = useCallback((question: QuestionBank) => {
    // Convert QuestionBank to Question format for the form
    const formQuestion: FormQuestion = {
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options,
      correct_answer: question.correct_answer,
      topic: question.topic,
      difficulty: question.difficulty,
      created_by: null,
    };
    setEditQuestion(formQuestion);
    setShowCreateForm(true);
  }, []);
  
  // Handle form close - queries will be invalidated by the form's built-in success handling
  const handleFormClose = useCallback((open: boolean) => {
    setShowCreateForm(open);
    if (!open) {
      setEditQuestion(null);
      // Invalidate queries when form closes after successful submission
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
      });
    }
  }, [queryClient]);
  
  // Handle delete question
  const handleDeleteQuestion = useCallback(async (id: string) => {
    try {
      await deleteQuestionMutation.mutateAsync(id);
      setDeleteQuestionId(null);
    } catch (error) {
      console.error('Delete question error:', error);
    }
  }, [deleteQuestionMutation]);
  
  // Row data for virtualized list
  const rowData: RowData = React.useMemo(() => ({
    questions,
    onEditQuestion: handleEditQuestion,
    onDeleteQuestion: (id) => setDeleteQuestionId(id),
  }), [questions, handleEditQuestion]);
  
  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive mb-4">Error loading questions: {error?.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="border-0 shadow-none bg-transparent">
        <div className="px-6 pt-2 pb-6 space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search questions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
            
            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-1 rounded-md border p-4">
                <div>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-md border">
            {/* Table Header */}
            <div className="grid gap-4 px-6 py-3 font-medium bg-muted/50 border-b text-sm" style={{gridTemplateColumns: "3fr 120px 120px 140px 100px"}}>
              <div>Question</div>
              <div>Type</div>
              <div>Difficulty</div>
              <div>Created</div>
              <div className="text-right">Actions</div>
            </div>
          
            {/* Virtualized Table Body */}
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-[60px] w-full" />
                  ))}
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No questions found.
              </div>
            ) : (
              <InfiniteLoader
                ref={infiniteLoaderRef}
                isItemLoaded={isItemLoaded}
                itemCount={itemCount}
                loadMoreItems={loadMoreItems}
              >
                {({ onItemsRendered, ref }) => (
                  <List
                    ref={ref}
                    height={TABLE_HEIGHT}
                    width="100%"
                    itemCount={itemCount}
                    itemSize={ROW_HEIGHT}
                    onItemsRendered={onItemsRendered}
                    itemData={rowData}
                    className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  >
                    {QuestionBankRow}
                  </List>
                )}
              </InfiniteLoader>
            )}
            
            {/* Status bar */}
            <div className="p-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <div>
                  Showing {questions.length} of {totalCount} questions
                </div>
                {isFetchingNextPage && (
                  <div className="text-xs">Loading more...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Create/Edit Question Form */}
      <QuestionForm
        open={showCreateForm}
        onOpenChange={handleFormClose}
        bankType={typeParam as 'assessment' | 'course'}
        questionToEdit={editQuestion || undefined}
        onSuccess={() => {
          // Invalidate queries after successful submission
          queryClient.invalidateQueries({ 
            predicate: (query) => 
              query.queryKey[0] === 'admin' && query.queryKey[1] === 'question-banks' 
          });
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteQuestionId} onOpenChange={(open) => !open && setDeleteQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question from the question bank.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQuestionId && handleDeleteQuestion(deleteQuestionId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 