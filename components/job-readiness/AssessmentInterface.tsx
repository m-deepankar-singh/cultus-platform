'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAssessmentDetails } from '@/hooks/useAssessmentDetails'
import { useSubmitAssessment } from '@/hooks/useSubmitAssessment'
import { Clock, CheckCircle2, AlertCircle, FileText, Trophy, Timer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface AssessmentInterfaceProps {
  moduleId: string
}

interface Answer {
  questionId: string
  selectedOptionId: string | string[] // Can be single option (MCQ) or multiple options (MSQ)
}

export function AssessmentInterface({ moduleId }: AssessmentInterfaceProps) {
  const router = useRouter()
  const { data: assessmentData, isLoading, error } = useAssessmentDetails(moduleId)
  const submitAssessment = useSubmitAssessment()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isStarted, setIsStarted] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)

  const handleSubmitAssessment = useCallback(async () => {
    if (!assessmentData?.assessment.questions) return

    // Convert answers to the expected format
    const answersMap: { [questionId: string]: string | string[] } = {}
    answers.forEach(answer => {
      answersMap[answer.questionId] = answer.selectedOptionId
    })

    const submissionData = {
      answers: answersMap,
      time_spent_seconds: assessmentData.assessment.time_limit_minutes ? 
        (assessmentData.assessment.time_limit_minutes * 60) - (timeRemaining || 0) : 0,
      started_at: new Date().toISOString()
    }

    try {
      await submitAssessment.mutateAsync({
        moduleId,
        data: submissionData
      })
      // Redirect to results page
      router.push(`/app/job-readiness/assessments/${moduleId}/results`)
    } catch (error) {
      console.error('Failed to submit assessment:', error)
    }
  }, [assessmentData, answers, timeRemaining, submitAssessment, moduleId, router])

  // Initialize timer when assessment starts
  useEffect(() => {
    if (isStarted && assessmentData?.assessment.time_limit_minutes && timeRemaining === null) {
      setTimeRemaining(assessmentData.assessment.time_limit_minutes * 60) // Convert to seconds
    }
  }, [isStarted, assessmentData, timeRemaining])

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Time's up - auto submit
          if (assessmentData?.assessment.questions) {
            handleSubmitAssessment()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, handleSubmitAssessment, assessmentData])

  const handleStartAssessment = () => {
    setIsStarted(true)
  }

  const handleAnswerChange = (questionId: string, optionId: string | string[]) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId)
      if (existing >= 0) {
        const newAnswers = [...prev]
        newAnswers[existing] = { questionId, selectedOptionId: optionId }
        return newAnswers
      }
      return [...prev, { questionId, selectedOptionId: optionId }]
    })
  }

  const handleMSQAnswerChange = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId)
      let currentAnswers: string[] = []
      
      if (existing >= 0) {
        const currentValue = prev[existing].selectedOptionId
        currentAnswers = Array.isArray(currentValue) ? currentValue : []
      }

      if (checked) {
        // Add option if not already selected
        if (!currentAnswers.includes(optionId)) {
          currentAnswers = [...currentAnswers, optionId]
        }
      } else {
        // Remove option if currently selected
        currentAnswers = currentAnswers.filter(id => id !== optionId)
      }

      const newAnswer = { questionId, selectedOptionId: currentAnswers }
      
      if (existing >= 0) {
        const newAnswers = [...prev]
        newAnswers[existing] = newAnswer
        return newAnswers
      }
      return [...prev, newAnswer]
    })
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (assessmentData?.assessment.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.questionId === questionId)?.selectedOptionId
  }

  const isMSQOptionSelected = (questionId: string, optionId: string) => {
    const answer = getAnswerForQuestion(questionId)
    return Array.isArray(answer) ? answer.includes(optionId) : false
  }

  const getAnsweredCount = () => {
    return answers.filter(answer => {
      if (Array.isArray(answer.selectedOptionId)) {
        return answer.selectedOptionId.length > 0
      }
      return answer.selectedOptionId !== ''
    }).length
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load assessment. Please try again or contact support.
        </AlertDescription>
      </Alert>
    )
  }

  if (!assessmentData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Assessment not found.
        </AlertDescription>
      </Alert>
    )
  }

  const { assessment } = assessmentData
  const questions = assessment.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  // Pre-assessment start screen
  if (!isStarted) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200 dark:border-blue-600">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">{assessment.name}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {assessment.instructions || 'Complete this assessment to determine your skill level.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assessment Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Assessment Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm">{questions.length} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm">{assessment.time_limit_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm">Passing threshold: {assessment.passing_threshold}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Important Notes</h3>
                <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                  <li>• You can navigate between questions</li>
                  <li>• Your progress is automatically saved</li>
                  <li>• The timer will start when you begin</li>
                  <li>• Assessment will auto-submit when time expires</li>
                </ul>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center pt-4">
              <Button onClick={handleStartAssessment} size="lg" className="px-8">
                <Clock className="h-5 w-5 mr-2" />
                Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Assessment interface
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">{assessment.name}</h1>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className={`font-mono text-sm ${
                    timeRemaining < 300 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{getAnsweredCount()} of {questions.length} answered</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg flex-1">
                {currentQuestion.question_text}
              </CardTitle>
              <Badge variant="outline" className="ml-2 text-xs">
                {currentQuestion.question_type === 'MSQ' ? 'Multiple Select' : 
                 currentQuestion.question_type === 'TF' ? 'True/False' : 'Multiple Choice'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {currentQuestion.question_type === 'MSQ' ? (
              // Multiple Select Question - Checkboxes
              <div className="space-y-3">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-3 font-medium">
                  Select all correct answers:
                </div>
                {currentQuestion.options?.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={isMSQOptionSelected(currentQuestion.id, option.id)}
                      onCheckedChange={(checked) => 
                        handleMSQAnswerChange(currentQuestion.id, option.id, !!checked)
                      }
                    />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              // Single Choice Question (MCQ/TF) - Radio buttons
              <RadioGroup
                value={typeof getAnswerForQuestion(currentQuestion.id) === 'string' 
                  ? getAnswerForQuestion(currentQuestion.id) as string 
                  : ''
                }
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex items-center gap-3">
              {currentQuestionIndex === questions.length - 1 ? (
                <Button 
                  onClick={() => setShowConfirmSubmit(true)}
                  className="px-6"
                  disabled={getAnsweredCount() === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Assessment
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation */}
      {showConfirmSubmit && (
        <Card className="border-orange-200 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                  Ready to Submit?
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                  You have answered {getAnsweredCount()} of {questions.length} questions. 
                  Once submitted, you cannot change your answers.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  Review Answers
                </Button>
                <Button
                  onClick={handleSubmitAssessment}
                  disabled={submitAssessment.isPending}
                >
                  {submitAssessment.isPending ? (
                    <>
                      <Timer className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submit Final Answers
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 