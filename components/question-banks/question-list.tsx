'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Search, Trash2 } from 'lucide-react';
import { QuestionForm } from './question-form';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { PaginatedResponse } from '@/lib/pagination';

// Define the Question type based on your API response
interface Question {
  id: string;
  created_at: string;
  updated_at: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string | { answers: string[] };
  created_by: string | null;
  difficulty: string | null;
  topic: string | null;
  question_type: 'MCQ' | 'MSQ';
  bankType: 'assessment' | 'course';
}

interface QuestionListProps {
  questions?: Question[];
  initialData?: PaginatedResponse<Question>;
}

export default function QuestionList({ questions: initialQuestions, initialData }: QuestionListProps) {
  // States for pagination
  const [currentPage, setCurrentPage] = useState(initialData?.metadata.currentPage || 1);
  const [pageSize, setPageSize] = useState(initialData?.metadata.pageSize || 10);
  const [totalItems, setTotalItems] = useState(initialData?.metadata.totalCount || 0);
  const [totalPages, setTotalPages] = useState(initialData?.metadata.totalPages || 1);
  
  // Data state
  const [questions, setQuestions] = useState<Question[]>(initialQuestions || initialData?.data || []);
  const [loading, setLoading] = useState(false);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  // Debounce search input
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch questions whenever pagination parameters change
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        // Construct URL with query parameters
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
        });

        // Add search term if available
        if (debouncedSearchTerm) {
          queryParams.append('search', debouncedSearchTerm);
        }

        const response = await fetch(`/api/admin/question-banks?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }
        
        const data: PaginatedResponse<Question> = await response.json();
        
        setQuestions(data.data);
        setTotalItems(data.metadata.totalCount);
        setTotalPages(data.metadata.totalPages);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [currentPage, pageSize, debouncedSearchTerm]);

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get correct answer display text
  const getCorrectAnswerText = (question: Question) => {
    if (question.question_type === 'MCQ') {
      const correctOptionId = question.correct_answer as string;
      const correctOption = question.options.find(opt => opt.id === correctOptionId);
      return correctOption ? correctOption.text : 'Unknown';
    } else {
      const answers = (question.correct_answer as { answers: string[] }).answers;
      const correctOptions = question.options.filter(opt => answers.includes(opt.id));
      return correctOptions.map(opt => opt.text).join(', ');
    }
  };

  // Handle edit
  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = (id: string) => {
    setQuestionToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle actual deletion
  const handleDelete = async () => {
    if (!questionToDelete) return;
    
    try {
      // Call API to delete question
      const res = await fetch(`/api/admin/question-banks/${questionToDelete}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete question');
      }
      
      // Refresh the current page of questions
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (debouncedSearchTerm) {
        queryParams.append('search', debouncedSearchTerm);
      }
      
      const response = await fetch(`/api/admin/question-banks?${queryParams.toString()}`);
      const data: PaginatedResponse<Question> = await response.json();
      
      setQuestions(data.data);
      setTotalItems(data.metadata.totalCount);
      setTotalPages(data.metadata.totalPages);
      
      // Close delete dialog
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error('Error deleting question:', error);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Questions</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Bank Type</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Correct Answer</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  Loading questions...
                </TableCell>
              </TableRow>
            ) : questions.length > 0 ? (
              questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="font-medium max-w-xs truncate" title={question.question_text}>
                    {question.question_text}
                  </TableCell>
                  <TableCell>
                    {question.bankType 
                      ? question.bankType.charAt(0).toUpperCase() + question.bankType.slice(1)
                      : '-'} 
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{question.question_type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={getCorrectAnswerText(question)}>
                    {getCorrectAnswerText(question)}
                  </TableCell>
                  <TableCell>{question.topic || '-'}</TableCell>
                  <TableCell>{question.difficulty || '-'}</TableCell>
                  <TableCell>{formatDate(question.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <span className="sr-only">Open menu</span>
                          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(question)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => handleDeleteConfirm(question.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  {debouncedSearchTerm 
                    ? 'No questions found matching your search.' 
                    : 'No questions available. Add a new question to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {!loading && totalItems > 0 && (
          <DataPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </CardContent>

      {/* Edit Question Form */}
      {editingQuestion && (
        <QuestionForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          bankType={editingQuestion.bankType} 
          questionToEdit={editingQuestion} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question
              and remove it from any assessments or courses that use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 