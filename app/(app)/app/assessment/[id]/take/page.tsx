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
  <div className="container mx-auto p-4 animate-pulse">
    <div className="h-8 bg-neutral-300 dark:bg-neutral-700 rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-1/2 mb-6"></div>
    <div className="bg-white/60 dark:bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 dark:border-neutral-800/30 p-6 mb-4">
      <div className="h-6 bg-neutral-300 dark:bg-neutral-700 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-5/6 mb-4"></div>
      <div className="grid grid-cols-1 gap-3 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-neutral-300 dark:bg-neutral-700 rounded"></div>
        ))}
      </div>
    </div>
    <div className="flex justify-between">
      <div className="h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-24"></div>
      <div className="h-10 bg-neutral-300 dark:bg-neutral-700 rounded w-24"></div>
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
        <AnimatedCard className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300">
          <h2 className="text-xl font-bold">Error Loading Assessment</h2>
          <p className="mt-2">{error?.message || 'An unknown error occurred'}</p>
          <Button 
            onClick={() => router.push('/app/dashboard')} 
            className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
          >
            Back to Dashboard
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  if (submissionError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <AnimatedCard className="bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 backdrop-blur-sm text-red-700 dark:text-red-300">
          <h2 className="text-xl font-bold">Submission Error</h2>
          <p className="mt-2">{submissionError}</p>
          <Button 
            onClick={() => { setSubmissionError(null); }} 
            className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
          >
            Try Again
        </Button>
        </AnimatedCard>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="container mx-auto p-4 text-center">
        <AnimatedCard className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 backdrop-blur-sm text-amber-700 dark:text-amber-300">
          <p className="mb-4">Assessment data could not be loaded or is not available.</p>
          <Button 
            onClick={() => router.push('/app/dashboard')} 
            className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
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
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-400">
          {assessment.name}
        </h1>
        {assessment.instructions && (
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
            {assessment.instructions}
          </p>
        )}
        
        <AnimatedCard className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Question {currentQuestionIndex + 1} of {assessment.questions.length}
            </span>
              <NeutralProgress value={progress} className="w-32 h-2" />
          </div>
          
          {timeRemaining !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm border border-white/20 dark:border-neutral-800/30">
                <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                <span className={cn(
                  "font-medium",
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

      <main>
        {currentQuestion && (
          <AnimatedCard className="mb-6 overflow-hidden">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800/30">
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-white">
                {currentQuestionIndex + 1}. {currentQuestion.question_text}
              </h2>
            </div>
            
            <div className="p-5">
              {currentQuestion.question_type === 'MCQ' && (
                <RadioGroup
                  value={questionAnswer as string}
                  onValueChange={(value) => handleSingleAnswerChange(currentQuestion.id, value)}
                  className="space-y-4"
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <NeutralRadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="text-neutral-700 dark:text-neutral-300">{option.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {currentQuestion.question_type === 'MSQ' && (
                <div className="space-y-4">
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <Checkbox
                        id={option.id}
                        checked={(questionAnswer as string[]).includes(option.id)}
                        onCheckedChange={(checked) => 
                          handleMultiAnswerChange(currentQuestion.id, option.id, checked === true)
                        }
                        className="border-neutral-300 dark:border-neutral-600 data-[state=checked]:bg-neutral-800 data-[state=checked]:border-neutral-800 dark:data-[state=checked]:bg-neutral-300 dark:data-[state=checked]:border-neutral-300"
                      />
                      <Label htmlFor={option.id} className="text-neutral-700 dark:text-neutral-300">{option.text}</Label>
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
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <NeutralRadioGroupItem value="true" id={`${currentQuestion.id}-true`} />
                    <Label htmlFor={`${currentQuestion.id}-true`} className="text-neutral-700 dark:text-neutral-300">True</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors">
                    <NeutralRadioGroupItem value="false" id={`${currentQuestion.id}-false`} />
                    <Label htmlFor={`${currentQuestion.id}-false`} className="text-neutral-700 dark:text-neutral-300">False</Label>
                  </div>
                </RadioGroup>
              )}
            </div>
            
            <div className="p-5 border-t border-neutral-200 dark:border-neutral-800/30 flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              
              {currentQuestionIndex < assessment.questions.length - 1 ? (
                <Button 
                  onClick={goToNextQuestion}
                  className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={confirmSubmit} 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
                >
                  Submit Assessment
                </Button>
              )}
            </div>
          </AnimatedCard>
        )}
        
        <AnimatedCard className="mb-6 p-4">
          <div className="flex flex-wrap gap-2">
          {assessment.questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : 
                      (answers[assessment.questions[index].id] ? "outline" : "ghost")}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
                className={cn(
                  "w-10 h-10 p-0",
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
        
        <div className="mt-6 text-center">
          <Button 
            onClick={confirmSubmit} 
            disabled={isSubmitting}
            className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900 px-8"
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
              onClick={handleSubmitAssessment}
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
  );
} 