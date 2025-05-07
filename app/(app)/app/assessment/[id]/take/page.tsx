'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch assessment details on page load
  useEffect(() => {
    const fetchAssessmentDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/app/assessments/${moduleId}/details`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch assessment details: ${response.status} ${errorText}`);
        }

        const data: AssessmentData = await response.json();
        setAssessmentData(data);

        // Initialize answers from saved progress if available
        if (data.in_progress_attempt?.saved_answers) {
          setAnswers(data.in_progress_attempt.saved_answers);
        }

        // Initialize timer
        if (data.in_progress_attempt?.remaining_time_seconds) {
          setTimeRemaining(data.in_progress_attempt.remaining_time_seconds);
        } else if (data.assessment.time_limit_minutes) {
          setTimeRemaining(data.assessment.time_limit_minutes * 60); // Convert minutes to seconds
        }

      } catch (err) {
        console.error('Error fetching assessment:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (moduleId) {
      fetchAssessmentDetails();
    }
  }, [moduleId]);

  // Set up timer and auto-save
  useEffect(() => {
    if (!timeRemaining || !assessmentData) return;

    // Timer countdown
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

    // Auto-save every minute
    const saveInterval = setInterval(() => {
      handleAutoSave();
    }, 60000); // 60 seconds
    
    setAutoSaveInterval(saveInterval);

    return () => {
      clearInterval(timer);
      clearInterval(saveInterval);
    };
  }, [timeRemaining, assessmentData]);

  // Save progress before unloading/navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      handleAutoSave();
      // Standard way to show a confirmation dialog
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

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Auto-save progress
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

  // Handle time up
  const handleTimeUp = () => {
    handleSubmitAssessment();
  };

  // Handle answer change for MCQ
  const handleSingleAnswerChange = (questionId: string, answerId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  // Handle answer change for MSQ
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

  // Navigate to next question
  const goToNextQuestion = () => {
    if (!assessmentData) return;
    
    if (currentQuestionIndex < assessmentData.assessment.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Show submit confirmation dialog
  const confirmSubmit = () => {
    setIsSubmitDialogOpen(true);
  };

  // Submit assessment
  const handleSubmitAssessment = async () => {
    if (!moduleId || !assessmentData) return;
    
    try {
      setIsSubmitting(true);
      setIsSubmitDialogOpen(false);
      
      // Explicitly type the result from the action
      const result: SubmitAssessmentActionResult = await submitAssessmentAction({
        moduleId,
        answers
      });
      
      // Use a type guard to ensure we only access success properties when success is true
      if (result.success) {
        setAssessmentResult({
          score: result.score, // Now type-safe
          passed: result.passed, // Now type-safe
          correctAnswers: result.correct_answers, // Now type-safe
          totalQuestions: result.total_questions // Now type-safe
        });
        setIsResultDialogOpen(true);
      } else {
        // Handle failure case: result.success is false
        console.error('Error submitting assessment:', result.error, result.errorDetails);
        setError(result.error || 'An unknown error occurred while submitting the assessment.');
        // Do not open the result dialog on failure
      }
      
    } catch (err) {
      // Catch any unexpected errors from the action call itself (e.g., network issues)
      console.error('Critical error submitting assessment:', err);
      setError(err instanceof Error ? err.message : 'A critical unknown error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Return to dashboard after viewing results
  const handleFinish = () => {
    router.push('/app/dashboard');
  };

  if (isLoading) {
    return <AssessmentLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Error Loading Assessment</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{error}</p>
        <Button onClick={() => router.push(`/app/assessment/${moduleId}`)}>
          Return to Assessment Overview
        </Button>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Assessment Not Found</h1>
        <Button onClick={() => router.push('/app/dashboard')}>Back to Dashboard</Button>
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

      {/* Submit Confirmation Dialog */}
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

      {/* Results Dialog */}
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