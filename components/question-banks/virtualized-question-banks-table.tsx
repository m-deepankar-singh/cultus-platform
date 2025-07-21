"use client"

import React, { useCallback, useEffect, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useQuestionBanksInfinite, flattenQuestionBanksPages, getTotalQuestionBanksCount, type QuestionBank, type QuestionBanksFilters } from '@/hooks/queries/admin/useQuestionBanks';
import { useDeleteQuestionBank } from '@/hooks/mutations/admin/useQuestionBankMutations';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileQuestion, FileText, MoreHorizontal, Search, SlidersHorizontal, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
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

const BASE_ROW_HEIGHT = 80; // Base height for collapsed rows
const EXPANDED_LINE_HEIGHT = 20; // Height per line of expanded text
const MOBILE_BASE_HEIGHT = 100; // Base height for mobile layout
const TABLE_HEIGHT = 600; // Height of the virtual table
const MAX_ROW_HEIGHT = 300; // Maximum height for any row

interface RowData {
  questions: QuestionBank[];
  onEditQuestion: (question: QuestionBank) => void;
  onDeleteQuestion: (id: string) => void;
  expandedQuestions: Set<string>;
  onToggleExpanded: (id: string) => void;
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
  const { questions, onEditQuestion, onDeleteQuestion, expandedQuestions, onToggleExpanded } = data;
  const question = questions[index];

  if (!question) {
    return (
      <div style={style} className="px-6 py-4 animate-pulse">
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <div 
      className="px-6 py-4 border-b hover:bg-muted/50 transition-colors"
      style={style}
    >
      {/* Desktop Layout */}
      <div 
        className="hidden md:grid gap-4"
        style={{ gridTemplateColumns: "minmax(300px, 1fr) 100px 110px 140px 100px" }}
      >
        <div className="space-y-2 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p 
                className={`text-sm font-medium leading-relaxed break-words ${
                  expandedQuestions.has(question.id) 
                    ? 'overflow-visible' 
                    : 'overflow-hidden'
                }`}
                style={
                  expandedQuestions.has(question.id) 
                    ? { lineHeight: '1.4' }
                    : { 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4'
                      }
                }
              >
                {question.question_text}
              </p>
              {question.question_text.length > 120 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => onToggleExpanded(question.id)}
                >
                  {expandedQuestions.has(question.id) ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {question.topic && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {question.topic}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <Badge variant="outline" className="text-xs shrink-0">
            {question.question_type}
          </Badge>
        </div>
        <div className="flex items-center">
          <Badge 
            variant="outline"
            className={`text-xs shrink-0 ${
              question.difficulty === 'easy'
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                : question.difficulty === 'medium'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
                : question.difficulty === 'hard'
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}
          >
            {question.difficulty || 'N/A'}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <span className="truncate">
            {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="flex justify-end items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 transition-colors"
            onClick={() => onEditQuestion(question)}
            title="Edit question"
            aria-label="Edit question"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
            onClick={() => onDeleteQuestion(question.id)}
            title="Delete question"
            aria-label="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-3">
        <div className="space-y-2">
          <p 
            className={`text-sm font-medium leading-relaxed break-words ${
              expandedQuestions.has(question.id) 
                ? 'overflow-visible' 
                : 'overflow-hidden'
            }`}
            style={
              expandedQuestions.has(question.id) 
                ? { lineHeight: '1.4' }
                : { 
                    display: '-webkit-box', 
                    WebkitLineClamp: 3, 
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.4'
                  }
            }
          >
            {question.question_text}
          </p>
          {question.question_text.length > 120 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onToggleExpanded(question.id)}
            >
              {expandedQuestions.has(question.id) ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show more
                </>
              )}
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {question.question_type}
            </Badge>
            <Badge 
              variant="outline"
              className={`text-xs ${
                question.difficulty === 'easy'
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                  : question.difficulty === 'medium'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
                  : question.difficulty === 'hard'
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                  : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
              }`}
            >
              {question.difficulty || 'N/A'}
            </Badge>
            {question.topic && (
              <Badge variant="secondary" className="text-xs">
                {question.topic}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 transition-colors"
              onClick={() => onEditQuestion(question)}
              title="Edit question"
              aria-label="Edit question"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
              onClick={() => onDeleteQuestion(question.id)}
              title="Delete question"
              aria-label="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
        </div>
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
  const [expandedQuestions, setExpandedQuestions] = React.useState<Set<string>>(new Set());
  
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
  
  // Refs for infinite loader and list
  const infiniteLoaderRef = useRef<InfiniteLoader>(null);
  const listRef = useRef<List>(null);
  const hasMountedRef = useRef(false);
  
  // Reset infinite loader and list cache on filter change
  useEffect(() => {
    if (hasMountedRef.current) {
      if (infiniteLoaderRef.current) {
        infiniteLoaderRef.current.resetloadMoreItemsCache();
      }
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
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
      
      // Reset infinite loader and list cache to start fresh
      if (infiniteLoaderRef.current) {
        infiniteLoaderRef.current.resetloadMoreItemsCache();
      }
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
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
      // Reset list cache
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
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

  // Calculate dynamic height for each row
  const getItemHeight = useCallback((index: number) => {
    const question = questions[index];
    if (!question) return BASE_ROW_HEIGHT;
    
    const isExpanded = expandedQuestions.has(question.id);
    // Fallback for SSR or when window is not available
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    
    if (!isExpanded) {
      return isMobile ? MOBILE_BASE_HEIGHT : BASE_ROW_HEIGHT;
    }
    
    // Calculate additional height for expanded text
    const textLength = question.question_text.length;
    const estimatedLines = Math.ceil(textLength / (isMobile ? 40 : 80)); // Rough chars per line
    const additionalHeight = Math.max(0, (estimatedLines - 2) * EXPANDED_LINE_HEIGHT);
    
    const baseHeight = isMobile ? MOBILE_BASE_HEIGHT : BASE_ROW_HEIGHT;
    return Math.min(baseHeight + additionalHeight, MAX_ROW_HEIGHT);
  }, [questions, expandedQuestions]);

  // Handle toggle expanded question
  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    
    // Reset height cache after state update completes
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }, 0);
  }, []);
  
  // Row data for virtualized list
  const rowData: RowData = React.useMemo(() => ({
    questions,
    onEditQuestion: handleEditQuestion,
    onDeleteQuestion: (id) => setDeleteQuestionId(id),
    expandedQuestions,
    onToggleExpanded: handleToggleExpanded,
  }), [questions, handleEditQuestion, expandedQuestions, handleToggleExpanded]);
  
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                className="sm:w-auto w-full"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {(difficultyFilter && difficultyFilter !== 'all') && (
                  <Badge variant="secondary" className="ml-2 h-4 px-1">
                    1
                  </Badge>
                )}
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
            {/* Table Header - Hidden on mobile */}
            <div 
              className="hidden md:grid gap-4 px-6 py-3 font-medium bg-muted/50 border-b text-sm"
              style={{ gridTemplateColumns: "minmax(300px, 1fr) 100px 110px 140px 100px" }}
            >
              <div>Question</div>
              <div>Type</div>
              <div>Difficulty</div>
              <div>Created</div>
              <div className="text-right">Actions</div>
            </div>
            
            {/* Mobile Header */}
            <div className="md:hidden px-6 py-3 font-medium bg-muted/50 border-b text-sm">
              <div>Questions</div>
            </div>
          
            {/* Virtualized Table Body */}
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="w-full" style={{ height: BASE_ROW_HEIGHT }} />
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
                    ref={(list) => {
                      ref(list);
                      listRef.current = list;
                    }}
                    height={TABLE_HEIGHT}
                    width="100%"
                    itemCount={itemCount}
                    itemSize={getItemHeight}
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