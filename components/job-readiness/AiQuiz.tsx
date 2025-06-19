'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Brain, CheckCircle, X, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface QuizOption {
  id: string
  text: string
}

interface QuizQuestion {
  id: string
  question_text: string
  options: QuizOption[]
  question_type: string
}

interface AiQuizProps {
  questions: QuizQuestion[]
  onSubmit: (answers: Array<{ question_id: string; selected_option_id: string | string[] }>) => void
  onCancel: () => void
  isSubmitting: boolean
  remainingAttempts?: number
  onReturnToCourse?: () => void
}

export function AiQuiz({ questions, onSubmit, onCancel, isSubmitting, remainingAttempts }: AiQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [showResults, setShowResults] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const hasAnswered = answers[currentQuestion?.id] !== undefined

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (isLastQuestion) {
      setShowResults(true)
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentQuestionIndex(prev => prev - 1)
  }

  const handleSubmit = () => {
    const formattedAnswers = questions.map(question => ({
      question_id: question.id,
      selected_option_id: answers[question.id] || (question.question_type === 'MSQ' ? [] : '')
    }))
    
    onSubmit(formattedAnswers)
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'MCQ':
        return 'Single Choice'
      case 'MSQ':
        return 'Multiple Choice'
      case 'TF':
        return 'True/False'
      default:
        return 'Question'
    }
  }

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'MCQ':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'MSQ':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'TF':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getCompletionStatus = () => {
    const answeredCount = Object.keys(answers).length
    return {
      completed: answeredCount,
      total: questions.length,
      percentage: Math.round((answeredCount / questions.length) * 100)
    }
  }

  if (!currentQuestion) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertCircle className="h-5 w-5" />
            Quiz Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 dark:text-red-300">
            No quiz questions available. Please try again later.
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Close
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (showResults) {
    const status = getCompletionStatus()
    return (
      <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
            <CheckCircle className="h-5 w-5" />
            Quiz Summary
          </CardTitle>
          <CardDescription className="text-yellow-700 dark:text-yellow-300">
            Review your answers before submitting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {status.completed} / {status.total}
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              Questions Answered ({status.percentage}%)
            </div>
          </div>

          {status.completed < status.total && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have {status.total - status.completed} unanswered questions. 
                You can go back to answer them or submit with current answers.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowResults(false)}
              className="flex-1"
            >
              Review Answers
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-purple-900 dark:text-purple-100">
              AI-Generated Quiz
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getQuestionTypeColor(currentQuestion.question_type)}>
              {getQuestionTypeLabel(currentQuestion.question_type)}
            </Badge>
            <Badge variant="outline">
              {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-purple-700 dark:text-purple-300">
          Answer the questions based on the lesson content
          {remainingAttempts && remainingAttempts < 3 && (
            <span className="block mt-1 text-orange-600 dark:text-orange-400 font-medium">
              {remainingAttempts} attempts remaining
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300">
            <span>Progress</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
            <div 
              className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentQuestion.question_text}
          </h3>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.question_type === 'MCQ' || currentQuestion.question_type === 'TF' ? (
              <RadioGroup
                value={answers[currentQuestion.id] as string || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="flex-1 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : currentQuestion.question_type === 'MSQ' ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const selectedOptions = (answers[currentQuestion.id] as string[]) || []
                  return (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={selectedOptions.includes(option.id)}
                        onCheckedChange={(checked) => {
                          const currentSelections = (answers[currentQuestion.id] as string[]) || []
                          if (checked) {
                            handleAnswerChange(currentQuestion.id, [...currentSelections, option.id])
                          } else {
                            handleAnswerChange(currentQuestion.id, currentSelections.filter(id => id !== option.id))
                          }
                        }}
                      />
                      <Label
                        htmlFor={option.id}
                        className="flex-1 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {option.text}
                      </Label>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {hasAnswered && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <Button
              onClick={handleNext}
              disabled={!hasAnswered}
              variant={isLastQuestion ? "default" : "outline"}
            >
              {isLastQuestion ? 'Review & Submit' : 'Next'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 