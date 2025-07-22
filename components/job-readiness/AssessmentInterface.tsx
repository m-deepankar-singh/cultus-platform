'use client'

import { useState, useEffect, useCallback } from 'react'
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAssessmentDetails } from '@/hooks/useAssessmentDetails'
import { useSubmitAssessment } from '@/hooks/useSubmitAssessment'
import { Clock, CheckCircle2, AlertCircle, FileText, Trophy, Timer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import gsap from 'gsap'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (!isLoading && assessmentData) {
      gsap.fromTo(
        ".assessment-card",
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: "power2.out"
        }
      );
    }
  }, [isLoading, assessmentData])

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
        <PerformantAnimatedCard 
          variant="glass" 
          className="assessment-card"
          staggerIndex={0}
        >
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200/50 dark:bg-gray-700/50 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200/50 dark:bg-gray-700/50 rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200/50 dark:bg-gray-700/50 rounded"></div>
                <div className="h-4 bg-gray-200/50 dark:bg-gray-700/50 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </PerformantAnimatedCard>
      </div>
    )
  }

  if (error) {
    return (
      <PerformantAnimatedCard variant="glass" className="assessment-card">
        <div className="p-6 text-center space-y-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 w-fit mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">Error Loading Assessment</h2>
            <p className="text-red-700 dark:text-red-300">
              Failed to load assessment. Please try again or contact support.
            </p>
          </div>
          <AnimatedButton onClick={() => window.location.reload()}>
            Try Again
          </AnimatedButton>
        </div>
      </PerformantAnimatedCard>
    )
  }

  if (!assessmentData) {
    return (
      <PerformantAnimatedCard variant="glass" className="assessment-card">
        <div className="p-6 text-center space-y-4">
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 w-fit mx-auto">
            <AlertCircle className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Assessment Not Found</h2>
            <p className="text-muted-foreground">
              The requested assessment could not be found.
            </p>
          </div>
        </div>
      </PerformantAnimatedCard>
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
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          className="assessment-card"
          staggerIndex={0}
        >
          <div className="p-4 md:p-8 text-center space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight gradient-text mb-2">
                  {assessment.name}
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground">
                  {assessment.instructions || 'Complete this assessment to unlock your first star and advance your learning journey.'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-8 text-left">
              <PerformantAnimatedCard 
                variant="subtle" 
                hoverEffect="scale"
                staggerIndex={1}
                className="space-y-4"
              >
                <h3 className="font-semibold text-xl flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Assessment Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Questions</span>
                    </div>
                    <span className="text-sm font-bold">{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Time Limit</span>
                    </div>
                    <span className="text-sm font-bold">{assessment.time_limit_minutes} min</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Pass Threshold</span>
                    </div>
                    <span className="text-sm font-bold">{assessment.passing_threshold}%</span>
                  </div>
                </div>
              </PerformantAnimatedCard>
              
              <PerformantAnimatedCard 
                variant="subtle" 
                hoverEffect="scale"
                staggerIndex={2}
                className="space-y-4"
              >
                <h3 className="font-semibold text-xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Important Notes
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                    <span>Navigate freely between questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                    <span>Progress is automatically saved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                    <span>Timer starts when you begin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                    <span>Auto-submit when time expires</span>
                  </li>
                </ul>
              </PerformantAnimatedCard>
            </div>

            <div className="pt-6">
              <AnimatedButton 
                onClick={handleStartAssessment} 
                size="lg" 
                className="px-6 md:px-12 py-3 md:py-4 text-base md:text-lg bg-gradient-to-r from-primary to-accent w-full sm:w-auto"
              >
                <Clock className="h-5 w-5 md:h-6 md:w-6 mr-3" />
                Start Assessment
              </AnimatedButton>
            </div>
          </div>
        </PerformantAnimatedCard>
      </div>
    )
  }

  // Assessment interface
  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="glow"
        className="assessment-card"
        staggerIndex={0}
      >
        <div className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
              <h1 className="text-xl md:text-2xl font-bold gradient-text">{assessment.name}</h1>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur border border-blue-200/30 dark:border-blue-600/30">
                  <OptimizedProgressRing
                    value={timeRemaining < 300 ? (timeRemaining / 300) * 100 : 100}
                    size={20}
                    color={timeRemaining < 300 ? "danger" : "primary"}
                    showValue={false}
                  />
                  <Timer className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  <span className={`font-mono text-xs sm:text-sm font-bold ${
                    timeRemaining < 300 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
            <div className="text-left lg:text-right w-full lg:w-auto">
              <div className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {getAnsweredCount()} answered • {Math.round(progress)}% complete
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Progress</span>
              <OptimizedProgressRing
                value={progress}
                size={32}
                color="primary"
                showValue={true}
                delay={200}
              />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${mounted ? progress : 0}%`,
                  transitionDelay: '300ms'
                }}
              />
            </div>
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Current Question */}
      {currentQuestion && (
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          className="assessment-card"
          staggerIndex={1}
        >
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-6">
              <h2 className="text-lg md:text-xl font-semibold flex-1 leading-relaxed">
                {currentQuestion.question_text}
              </h2>
              <Badge 
                variant="outline" 
                className="text-xs bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 self-start"
              >
                {currentQuestion.question_type === 'MSQ' ? 'Multiple Select' : 
                 currentQuestion.question_type === 'TF' ? 'True/False' : 'Multiple Choice'}
              </Badge>
            </div>
            <div>
            {currentQuestion.question_type === 'MSQ' ? (
              // Multiple Select Question - Checkboxes
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/30 dark:border-blue-600/30">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Select all correct answers:
                  </span>
                </div>
                {currentQuestion.options?.map((option, index) => (
                  <PerformantAnimatedCard
                    key={option.id}
                    variant="subtle"
                    hoverEffect="scale"
                    staggerIndex={index}
                    className="transition-all duration-200 hover:shadow-md border-2 hover:border-primary/30"
                  >
                    <div className="p-3 md:p-4 flex items-center space-x-3">
                      <Checkbox
                        id={option.id}
                        checked={isMSQOptionSelected(currentQuestion.id, option.id)}
                        onCheckedChange={(checked) => 
                          handleMSQAnswerChange(currentQuestion.id, option.id, !!checked)
                        }
                        className="min-w-[1.5rem] min-h-[1.5rem]"
                      />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm md:text-base leading-relaxed">
                        {option.text}
                      </Label>
                    </div>
                  </PerformantAnimatedCard>
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
                className="space-y-4"
              >
                {currentQuestion.options?.map((option, index) => (
                  <PerformantAnimatedCard
                    key={option.id}
                    variant="subtle"
                    hoverEffect="scale"
                    staggerIndex={index}
                    className="transition-all duration-200 hover:shadow-md border-2 hover:border-primary/30"
                  >
                    <div className="p-3 md:p-4 flex items-center space-x-3">
                      <RadioGroupItem value={option.id} id={option.id} className="min-w-[1.5rem] min-h-[1.5rem]" />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm md:text-base leading-relaxed">
                        {option.text}
                      </Label>
                    </div>
                  </PerformantAnimatedCard>
                ))}
              </RadioGroup>
            )}
            </div>
          </div>
        </PerformantAnimatedCard>
      )}

      {/* Navigation */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="glow"
        className="assessment-card"
        staggerIndex={2}
      >
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <AnimatedButton
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 md:px-6 w-full sm:w-auto order-2 sm:order-1"
            >
              Previous
            </AnimatedButton>

            <div className="flex items-center gap-4 w-full sm:w-auto order-1 sm:order-2">
              {currentQuestionIndex === questions.length - 1 ? (
                <AnimatedButton 
                  onClick={() => setShowConfirmSubmit(true)}
                  className="px-4 md:px-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 w-full sm:w-auto"
                  disabled={getAnsweredCount() === 0}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Submit Assessment
                </AnimatedButton>
              ) : (
                <AnimatedButton
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="px-4 md:px-6 bg-gradient-to-r from-primary to-accent w-full sm:w-auto"
                >
                  Next
                </AnimatedButton>
              )}
            </div>
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Submit Confirmation */}
      {showConfirmSubmit && (
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="glow"
          className="assessment-card border-2 border-orange-300/50 dark:border-orange-600/50 bg-gradient-to-r from-orange-500/10 to-amber-500/10"
          staggerIndex={3}
        >
          <div className="p-4 md:p-8 text-center space-y-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 md:p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur">
                <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-orange-900 dark:text-orange-100 mb-3">
                Ready to Submit?
              </h3>
              <div className="space-y-2">
                <p className="text-sm md:text-base text-orange-700 dark:text-orange-300">
                  You have answered <span className="font-bold">{getAnsweredCount()}</span> of <span className="font-bold">{questions.length}</span> questions.
                </p>
                <p className="text-xs md:text-sm text-orange-600 dark:text-orange-400">
                  Once submitted, you cannot change your answers.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <AnimatedButton
                variant="outline"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 md:px-6 border-orange-300 hover:bg-orange-50 dark:border-orange-600 dark:hover:bg-orange-900/20 w-full sm:w-auto order-2 sm:order-1"
              >
                Review Answers
              </AnimatedButton>
              <AnimatedButton
                onClick={handleSubmitAssessment}
                disabled={submitAssessment.isPending}
                className="px-4 md:px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 w-full sm:w-auto order-1 sm:order-2"
              >
                {submitAssessment.isPending ? (
                  <>
                    <OptimizedProgressRing
                      value={100}
                      size={16}
                      color="warning"
                      showValue={false}
                    />
                    <span className="ml-2">Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Submit Final Answers
                  </>
                )}
              </AnimatedButton>
            </div>
          </div>
        </PerformantAnimatedCard>
      )}
    </div>
  )
} 