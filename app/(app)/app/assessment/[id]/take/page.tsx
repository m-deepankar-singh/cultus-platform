'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { saveAssessmentProgressAction, submitAssessmentAction, type SubmitAssessmentActionResult } from '@/app/actions/assessment';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';

// Types for the assessment data
interface AssessmentQuestion {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TF';
  options: { id: string; text: string }[];
}

interface AssessmentData {
  assessment: {
    id: string;
    name: string;
    instructions?: string | null;
    time_limit_minutes?: number | null;
    passing_threshold?: number | null;
    questions: AssessmentQuestion[];
    is_submitted: boolean;
    retakes_allowed: boolean;
  };
  in_progress_attempt?: {
    saved_answers?: Record<string, string | string[]>;
    start_time?: string | null;
    remaining_time_seconds?: number | null;
  } | null;
}

interface AssessmentResult {
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
}

const AssessmentLoadingSkeleton = () => (
  <div className="container mx-auto p-4 animate-pulse">
    <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
      <div className="grid grid-cols-1 gap-3 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-300 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
    <div className="flex justify-between">
      <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
      <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
    </div>
  </div>
);

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.id as string;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    data: assessmentData,
    isLoading,
    isError,
    error,
  } = useQuery<AssessmentData | null, Error>({
    queryKey: queryKeys.assessmentDetails(moduleId),
    queryFn: async () => {
      if (!moduleId) throw new Error("Module ID is missing.");
      const result = await apiClient<AssessmentData>(`/api/app/assessments/${moduleId}/details`);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: !!moduleId,
  });

  useEffect(() => {
    if (assessmentData) {
      if (assessmentData.in_progress_attempt?.saved_answers) {
        setAnswers(assessmentData.in_progress_attempt.saved_answers);
        }

      if (assessmentData.in_progress_attempt?.remaining_time_seconds) {
        setTimeRemaining(assessmentData.in_progress_attempt.remaining_time_seconds);
      } else if (assessmentData.assessment.time_limit_minutes) {
        setTimeRemaining(assessmentData.assessment.time_limit_minutes * 60);
      }
    } else if (!isLoading && !isError) {
      // Handle case where assessmentData is null after successful fetch (e.g. not found, or empty response)
      // This might already be handled by the main error/loading/no-data checks below
      // but specific logic for null data after fetch can go here if needed.
      // For now, let's assume the main checks are sufficient.
    }
  }, [assessmentData, isLoading, isError]);

  useEffect(() => {
    if (!timeRemaining || !assessmentData || isLoading || isError) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);

    const saveInterval = setInterval(() => {
      handleAutoSave();
    }, 60000);
    
    setAutoSaveInterval(saveInterval);

    return () => {
      clearInterval(timer);
      clearInterval(saveInterval);
    };
  }, [timeRemaining, assessmentData, isLoading, isError]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      handleAutoSave();
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [answers, moduleId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAutoSave = async () => {
    if (!moduleId || !assessmentData || Object.keys(answers).length === 0) return;

    try {
      await saveAssessmentProgressAction({
        moduleId,
        saved_answers: answers,
        remaining_time_seconds: timeRemaining || undefined
      });
      console.log('Assessment progress auto-saved');
    } catch (err) {
      console.error('Error auto-saving progress:', err);
    }
  };

  const handleTimeUp = () => {
    handleSubmitAssessment();
  };

  const handleSingleAnswerChange = (questionId: string, answerId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleMultiAnswerChange = (questionId: string, answerId: string, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = Array.isArray(prev[questionId]) ? prev[questionId] as string[] : [];
      
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentAnswers, answerId]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentAnswers.filter(id => id !== answerId)
        };
      }
    });
  };

  const goToNextQuestion = () => {
    if (!assessmentData) return;
    
    if (currentQuestionIndex < assessmentData.assessment.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const confirmSubmit = () => {
    setIsSubmitDialogOpen(true);
  };

  const handleSubmitAssessment = async () => {
    if (!moduleId || !assessmentData) return;
    
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      setIsSubmitDialogOpen(false);
      
      const result: SubmitAssessmentActionResult = await submitAssessmentAction({
        moduleId,
        answers
      });
      
      if (result.success) {
        setAssessmentResult({
          score: result.score,
          passed: result.passed,
          correctAnswers: result.correct_answers,
          totalQuestions: result.total_questions
        });
        setIsResultDialogOpen(true);
      } else {
        console.error('Error submitting assessment:', result.error, result.errorDetails);
        setSubmissionError(result.error || 'An unknown error occurred while submitting the assessment.');
      }
      
    } catch (err) {
      console.error('Critical error submitting assessment:', err);
      setSubmissionError(err instanceof Error ? err.message : 'A critical unknown error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.push('/app/dashboard');
  };

  if (isLoading) {
    return <AssessmentLoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h2 className="text-xl text-red-600">Error Loading Assessment</h2>
        <p>{error?.message || 'An unknown error occurred'}</p>
        <Button onClick={() => router.push('/app/dashboard')} className="mt-4">Back to Dashboard</Button>
      </div>
    );
  }

  if (submissionError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h2 className="text-xl text-red-600">Submission Error</h2>
        <p>{submissionError}</p>
        <Button onClick={() => { setSubmissionError(null); /* Optionally, re-enable submit button or navigate */ }} className="mt-4">
          Try Again or Go Back
        </Button>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Assessment data could not be loaded or is not available.</p>
        <Button onClick={() => router.push('/app/dashboard')} className="mt-4">Back to Dashboard</Button>
      </div>
    );
  }

  const { assessment } = assessmentData;
  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const questionAnswer = answers[currentQuestion?.id] || (currentQuestion?.question_type === 'MSQ' ? [] : '');

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{assessment.name}</h1>
        {assessment.instructions && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{assessment.instructions}</p>
        )}
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {assessment.questions.length}
            </span>
            <Progress value={progress} className="w-24" />
          </div>
          
          {timeRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-medium ${timeRemaining < 60 ? 'text-red-500' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
        
        <Separator className="mt-4" />
      </header>

      <main>
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">
                {currentQuestionIndex + 1}. {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {currentQuestion.question_type === 'MCQ' && (
                <RadioGroup
                  value={questionAnswer as string}
                  onValueChange={(value) => handleSingleAnswerChange(currentQuestion.id, value)}
                  className="space-y-4"
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id}>{option.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {currentQuestion.question_type === 'MSQ' && (
                <div className="space-y-4">
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={(questionAnswer as string[]).includes(option.id)}
                        onCheckedChange={(checked) => 
                          handleMultiAnswerChange(currentQuestion.id, option.id, checked === true)
                        }
                      />
                      <Label htmlFor={option.id}>{option.text}</Label>
                    </div>
                  ))}
                </div>
              )}
              
              {currentQuestion.question_type === 'TF' && (
                <RadioGroup
                  value={questionAnswer as string}
                  onValueChange={(value) => handleSingleAnswerChange(currentQuestion.id, value)}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${currentQuestion.id}-true`} />
                    <Label htmlFor={`${currentQuestion.id}-true`}>True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${currentQuestion.id}-false`} />
                    <Label htmlFor={`${currentQuestion.id}-false`}>False</Label>
                  </div>
                </RadioGroup>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              
              {currentQuestionIndex < assessment.questions.length - 1 ? (
                <Button onClick={goToNextQuestion}>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={confirmSubmit} disabled={isSubmitting}>
                  Submit Assessment
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
        
        <div className="flex flex-wrap gap-2 mb-6">
          {assessment.questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : 
                      (answers[assessment.questions[index].id] ? "outline" : "ghost")}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className="w-10 h-10 p-0"
            >
              {index + 1}
            </Button>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <Button onClick={confirmSubmit} disabled={isSubmitting}>
            Submit Assessment
          </Button>
        </div>
      </main>

      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your assessment? You won't be able to change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitAssessment}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {assessmentResult?.passed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Assessment Passed!
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Assessment Not Passed
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="py-4">
                <p className="text-lg font-medium mb-2">
                  Your score: {assessmentResult?.score}%
                </p>
                <p>
                  You answered {assessmentResult?.correctAnswers} out of {assessmentResult?.totalQuestions} questions correctly.
                </p>
                {!assessmentResult?.passed && assessment.retakes_allowed && (
                  <p className="mt-2 text-amber-600 dark:text-amber-400">
                    You can retake this assessment later.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFinish}>Return to Dashboard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 