'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
// Removed unused Card components and Separator
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
import { AnimatedCard } from '@/components/ui/animated-card';
import { cn } from '@/lib/utils';

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
  <div className="w-full px-1 sm:px-4 py-2 sm:py-4 max-w-4xl sm:mx-auto animate-pulse">
    <div className="px-2 sm:px-0">
      <div className="h-6 sm:h-8 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3 mb-3 sm:mb-4"></div>
      <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2 mb-4 sm:mb-6"></div>
    </div>
    <div className="bg-white/60 dark:bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 dark:border-neutral-800/30 p-4 sm:p-6 mb-4 mx-2 sm:mx-0">
      <div className="h-5 sm:h-6 bg-neutral-300 dark:bg-neutral-700 rounded w-3/4 mb-3"></div>
      <div className="h-3 sm:h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-full mb-2"></div>
      <div className="h-3 sm:h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-5/6 mb-4"></div>
      <div className="grid grid-cols-1 gap-3 mt-4 sm:mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 sm:h-12 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
        ))}
      </div>
    </div>
    <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 px-2 sm:px-0">
      <div className="h-10 sm:h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-24"></div>
      <div className="h-10 sm:h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-24"></div>
    </div>
  </div>
);

// Custom styled Progress component with neutral colors
const NeutralProgress = ({ value, className, ...props }: React.ComponentProps<typeof Progress>) => (
  <Progress 
    value={value} 
    className={cn(
      "[&>div]:bg-gradient-to-r [&>div]:from-neutral-700 [&>div]:to-neutral-800 dark:[&>div]:from-neutral-300 dark:[&>div]:to-white", 
      className
    )} 
    {...props} 
  />
);

// Custom styled Radio component with neutral colors
const NeutralRadioGroupItem = ({ className, ...props }: React.ComponentProps<typeof RadioGroupItem>) => (
  <RadioGroupItem 
    className={cn(
      "border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-white",
      "data-[state=checked]:border-neutral-800 data-[state=checked]:bg-neutral-800 data-[state=checked]:text-white",
      "dark:data-[state=checked]:border-neutral-300 dark:data-[state=checked]:bg-neutral-300 dark:data-[state=checked]:text-neutral-900",
      className
    )} 
    {...props} 
  />
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
  const [submissionReason, setSubmissionReason] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(true);

  const {
    data: assessmentData,
    isLoading,
    isError,
    error,
  } = useQuery<AssessmentData | null, Error>({
    queryKey: queryKeys.assessmentDetails(moduleId),
    queryFn: async () => {
      if (!moduleId) throw new Error("Module ID is missing.");
      return await apiClient<AssessmentData>(`/api/app/assessments/${moduleId}/details`);
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
    if (!timeRemaining || !assessmentData || isLoading || isError || isSubmitting || assessmentResult) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          // Only submit if not already submitting or submitted
          if (!isSubmitting && !assessmentResult) {
            handleTimeUp();
          }
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
  }, [timeRemaining, assessmentData, isLoading, isError, isSubmitting, assessmentResult]);

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

  // Add Page Visibility API to immediately submit assessment when user leaves the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only submit if assessment is not already completed and user is taking the assessment
      if (document.visibilityState === 'hidden' && !assessmentResult && assessmentData && !isSubmitting && !showWarningModal) {
        console.log('User left the page, immediately submitting assessment');
        handleSubmitAssessment('page_leave');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [assessmentResult, assessmentData, isSubmitting, showWarningModal]);

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
    } catch (err) {
      console.error('Error auto-saving progress:', err);
    }
  };

  const handleTimeUp = () => {
    handleSubmitAssessment('timer_expired');
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

  const handleSubmitAssessment = async (reason?: string) => {
    if (!moduleId || !assessmentData || isSubmitting || assessmentResult) return;
    
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionReason(reason || null);
    
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
      <div className="w-full px-1 sm:px-4 py-2 sm:py-4 max-w-4xl sm:mx-auto text-center">
        <AnimatedCard className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300 p-4 sm:p-6 mx-2 sm:mx-0">
          <h2 className="text-lg sm:text-xl font-bold">Error Loading Assessment</h2>
          <p className="mt-2 text-sm sm:text-base leading-relaxed">{error?.message || 'An unknown error occurred'}</p>
          <Button 
            onClick={() => router.push('/app/dashboard')} 
            className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 min-h-[44px] w-full sm:w-auto"
          >
            Back to Dashboard
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  if (submissionError) {
    return (
      <div className="w-full px-1 sm:px-4 py-2 sm:py-4 max-w-4xl sm:mx-auto text-center">
        <AnimatedCard className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300 p-4 sm:p-6 mx-2 sm:mx-0">
          <h2 className="text-lg sm:text-xl font-bold">Submission Error</h2>
          <p className="mt-2 text-sm sm:text-base leading-relaxed">{submissionError}</p>
          <Button 
            onClick={() => { setSubmissionError(null); }} 
            className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 min-h-[44px] w-full sm:w-auto"
          >
            Try Again
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="w-full px-1 sm:px-4 py-2 sm:py-4 max-w-4xl sm:mx-auto text-center">
        <AnimatedCard className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm text-amber-700 dark:text-amber-300 p-4 sm:p-6 mx-2 sm:mx-0">
          <p className="mb-4 text-sm sm:text-base leading-relaxed">Assessment data could not be loaded or is not available.</p>
          <Button 
            onClick={() => router.push('/app/dashboard')} 
            className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 min-h-[44px] w-full sm:w-auto"
          >
            Back to Dashboard
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  const { assessment } = assessmentData;
  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  const questionAnswer = answers[currentQuestion?.id] || (currentQuestion?.question_type === 'MSQ' ? [] : '');

  return (
    <div className="w-full px-1 sm:px-4 py-2 sm:py-4 max-w-4xl sm:mx-auto">
      {/* Assessment content - blurred when warning modal is open */}
      <div className={`${showWarningModal ? 'blur-sm pointer-events-none' : ''} transition-all duration-300`}>
      <header className="mb-4 sm:mb-6 px-2 sm:px-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-400 leading-tight">
          {assessment.name}
        </h1>
        {assessment.instructions && (
          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 mb-3 sm:mb-4 leading-relaxed">
            {assessment.instructions}
          </p>
        )}
        
        
        <AnimatedCard className="mt-3 sm:mt-4 p-3 sm:p-4 mx-2 sm:mx-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                Question {currentQuestionIndex + 1} of {assessment.questions.length}
              </span>
              <NeutralProgress value={progress} className="w-full sm:w-32 h-2" />
            </div>
            
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm border border-white/20 dark:border-neutral-800/30 self-start sm:self-auto">
                <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-300 flex-shrink-0" />
                <span className={cn(
                  "font-medium text-sm sm:text-base",
                  timeRemaining < 60 
                    ? "text-red-500 dark:text-red-400" 
                    : "text-neutral-700 dark:text-neutral-300"
                )}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </AnimatedCard>
      </header>

      <main className="px-2 sm:px-0">
        {currentQuestion && (
          <AnimatedCard className="mb-4 sm:mb-6 overflow-hidden mx-2 sm:mx-0">
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800/30">
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-white leading-relaxed">
                {currentQuestionIndex + 1}. {currentQuestion.question_text}
              </h2>
            </div>
            
            <div className="p-4 sm:p-5">
              {currentQuestion.question_type === 'MCQ' && (
                <RadioGroup
                  value={questionAnswer as string}
                  onValueChange={(value) => handleSingleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3 sm:space-y-4"
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 p-3 sm:p-4 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors min-h-[44px]">
                      <NeutralRadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
                      <Label htmlFor={option.id} className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed cursor-pointer flex-1">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {currentQuestion.question_type === 'MSQ' && (
                <div className="space-y-3 sm:space-y-4">
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 p-3 sm:p-4 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors min-h-[44px]">
                      <Checkbox
                        id={option.id}
                        checked={(questionAnswer as string[]).includes(option.id)}
                        onCheckedChange={(checked) => 
                          handleMultiAnswerChange(currentQuestion.id, option.id, checked === true)
                        }
                        className="border-neutral-300 dark:border-neutral-600 data-[state=checked]:bg-neutral-800 data-[state=checked]:border-neutral-800 dark:data-[state=checked]:bg-neutral-300 dark:data-[state=checked]:border-neutral-300 mt-0.5"
                      />
                      <Label htmlFor={option.id} className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed cursor-pointer flex-1">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              
              {currentQuestion.question_type === 'TF' && (
                <RadioGroup
                  value={questionAnswer as string}
                  onValueChange={(value) => handleSingleAnswerChange(currentQuestion.id, value)}
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors min-h-[44px]">
                    <NeutralRadioGroupItem value="true" id={`${currentQuestion.id}-true`} />
                    <Label htmlFor={`${currentQuestion.id}-true`} className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors min-h-[44px]">
                    <NeutralRadioGroupItem value="false" id={`${currentQuestion.id}-false`} />
                    <Label htmlFor={`${currentQuestion.id}-false`} className="text-neutral-700 dark:text-neutral-300 text-sm sm:text-base cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}
            </div>
            
            <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-neutral-800/30 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 min-h-[44px]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              
              {currentQuestionIndex < assessment.questions.length - 1 ? (
                <Button 
                  onClick={goToNextQuestion}
                  className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 min-h-[44px]"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={confirmSubmit} 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 min-h-[44px]"
                >
                  Submit Assessment
                </Button>
              )}
            </div>
          </AnimatedCard>
        )}
        
        <AnimatedCard className="mb-4 sm:mb-6 p-3 sm:p-4 mx-2 sm:mx-0">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {assessment.questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : 
                        (answers[assessment.questions[index].id] ? "outline" : "ghost")}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className={cn(
                  "w-10 h-10 p-0 min-h-[40px] text-sm sm:text-base",
                  index === currentQuestionIndex ? 
                    "bg-gradient-to-r from-neutral-800 to-neutral-900 dark:from-neutral-200 dark:to-white text-white dark:text-neutral-900" :
                    answers[assessment.questions[index].id] ? 
                      "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300" :
                      "text-neutral-500 dark:text-neutral-400"
                )}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </AnimatedCard>
        
        <div className="mt-4 sm:mt-6 text-center px-4 sm:px-2">
          <Button 
            onClick={confirmSubmit} 
            disabled={isSubmitting}
            className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 px-6 sm:px-8 min-h-[44px] w-full sm:w-auto"
          >
            Submit Assessment
          </Button>
        </div>
      </main>

      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-white/20 dark:border-neutral-800/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-800 dark:text-white">Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-600 dark:text-neutral-400">
              Are you sure you want to submit your assessment? You won&apos;t be able to change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleSubmitAssessment()}
              className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <AlertDialogContent className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-white/20 dark:border-neutral-800/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-neutral-800 dark:text-white">
              {assessmentResult?.passed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-emerald-300">
                  Assessment Passed!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400 dark:from-red-400 dark:to-red-300">
                  Assessment Not Passed
                  </span>
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="py-4 text-neutral-600 dark:text-neutral-400">
                <p className="text-lg font-medium mb-2 text-neutral-800 dark:text-white">
                  Your score: {assessmentResult?.score}%
                </p>
                <p>
                  You answered {assessmentResult?.correctAnswers} out of {assessmentResult?.totalQuestions} questions correctly.
                </p>
                
                {/* Show submission reason if available */}
                {submissionReason && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {submissionReason === 'page_leave' && (
                        <span><strong>Reason:</strong> Assessment was submitted because you left the page</span>
                      )}
                      {submissionReason === 'timer_expired' && (
                        <span><strong>Reason:</strong> Assessment was submitted because time expired</span>
                      )}
                    </p>
                  </div>
                )}
                
                {!assessmentResult?.passed && assessment.retakes_allowed && (
                  <p className="mt-2 text-amber-600 dark:text-amber-400">
                    You can retake this assessment later.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={handleFinish}
              className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
            >
              Return to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Warning Modal - Must accept to start assessment */}
      <AlertDialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <AlertDialogContent className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-amber-200 dark:border-amber-800/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              Assessment Guidelines
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="py-4 text-neutral-600 dark:text-neutral-400 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ Important: Stay Focused During Assessment
                  </h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
                    <li>• <strong>Do not leave this page</strong> during the assessment</li>
                    <li>• <strong>Do not switch tabs</strong> or minimize the browser</li>
                    <li>• <strong>Do not navigate away</strong> from this page</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    ⚡ Automatic Submission Policy
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your assessment will be <strong>immediately submitted</strong> if you leave this page for any reason. 
                    This helps maintain assessment integrity and prevents cheating.
                  </p>
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  By clicking "I Understand, Start Assessment" you acknowledge that you have read and agree to these guidelines.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={() => router.push('/app/dashboard')}
              className="border-neutral-300 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => setShowWarningModal(false)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              I Understand, Start Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 