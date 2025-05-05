"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle } from "lucide-react"

// Mock assessment data
const assessmentData = {
  id: "assessment-1",
  title: "NLP: Build a Chatbot with Sentiment Analyzer",
  description: "Test your knowledge of natural language processing and sentiment analysis",
  timeLimit: 10, // minutes
  questions: [
    {
      id: "q1",
      type: "mcq",
      question: "Which of the following is NOT a common approach to sentiment analysis?",
      options: [
        { id: "q1-a", text: "Rule-based approaches" },
        { id: "q1-b", text: "Automatic approaches" },
        { id: "q1-c", text: "Hybrid approaches" },
        { id: "q1-d", text: "Quantum approaches" },
      ],
      correctAnswer: "q1-d",
    },
    {
      id: "q2",
      type: "mcq",
      question: "What is the primary goal of sentiment analysis?",
      options: [
        { id: "q2-a", text: "To identify the language of the text" },
        { id: "q2-b", text: "To determine the emotional tone behind a text" },
        { id: "q2-c", text: "To translate text from one language to another" },
        { id: "q2-d", text: "To compress text for efficient storage" },
      ],
      correctAnswer: "q2-b",
    },
    {
      id: "q3",
      type: "msq",
      question:
        "Which of the following libraries can be used for sentiment analysis in Python? (Select all that apply)",
      options: [
        { id: "q3-a", text: "NLTK" },
        { id: "q3-b", text: "TextBlob" },
        { id: "q3-c", text: "Matplotlib" },
        { id: "q3-d", text: "Scikit-learn" },
      ],
      correctAnswers: ["q3-a", "q3-b", "q3-d"],
    },
    {
      id: "q4",
      type: "mcq",
      question: "What is a common challenge in sentiment analysis?",
      options: [
        { id: "q4-a", text: "Handling negations" },
        { id: "q4-b", text: "Rendering graphics" },
        { id: "q4-c", text: "Database optimization" },
        { id: "q4-d", text: "Network latency" },
      ],
      correctAnswer: "q4-a",
    },
    {
      id: "q5",
      type: "msq",
      question: "Which of the following are valid sentiment classifications? (Select all that apply)",
      options: [
        { id: "q5-a", text: "Positive" },
        { id: "q5-b", text: "Negative" },
        { id: "q5-c", text: "Neutral" },
        { id: "q5-d", text: "Colorful" },
      ],
      correctAnswers: ["q5-a", "q5-b", "q5-c"],
    },
  ],
}

export function AssessmentInterface({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState(assessmentData.timeLimit * 60) // in seconds
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false)
  const [results, setResults] = useState<{
    score: number
    totalQuestions: number
    correctAnswers: number
    incorrectAnswers: number
  } | null>(null)

  const currentQuestion = assessmentData.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / assessmentData.questions.length) * 100

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format time (seconds to MM:SS)
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  // Handle single choice selection (MCQ)
  const handleSingleChoiceChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  // Handle multiple choice selection (MSQ)
  const handleMultipleChoiceChange = (optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const currentAnswers = (prev[currentQuestion.id] as string[]) || []

      if (checked) {
        return {
          ...prev,
          [currentQuestion.id]: [...currentAnswers, optionId],
        }
      } else {
        return {
          ...prev,
          [currentQuestion.id]: currentAnswers.filter((id) => id !== optionId),
        }
      }
    })
  }

  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < assessmentData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  // Calculate results
  const calculateResults = () => {
    let correctAnswers = 0

    assessmentData.questions.forEach((question) => {
      const userAnswer = answers[question.id]

      if (question.type === "mcq") {
        if (userAnswer === question.correctAnswer) {
          correctAnswers++
        }
      } else if (question.type === "msq") {
        const userAnswerArray = (userAnswer as string[]) || []
        const correctAnswerArray = question.correctAnswers || []

        // Check if arrays have the same elements (order doesn't matter)
        const isCorrect =
          userAnswerArray.length === correctAnswerArray.length &&
          userAnswerArray.every((item) => correctAnswerArray.includes(item))

        if (isCorrect) {
          correctAnswers++
        }
      }
    })

    return {
      score: Math.round((correctAnswers / assessmentData.questions.length) * 100),
      totalQuestions: assessmentData.questions.length,
      correctAnswers,
      incorrectAnswers: assessmentData.questions.length - correctAnswers,
    }
  }

  // Handle assessment submission
  const handleSubmit = () => {
    const calculatedResults = calculateResults()
    setResults(calculatedResults)
    setIsSubmitDialogOpen(false)
    setIsResultDialogOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MainNav />
      <main className="flex-1 container py-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/course/${courseId}`)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to course
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`font-medium ${timeRemaining < 60 ? "text-red-500" : ""}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold">{assessmentData.title}</h1>
              <p className="text-muted-foreground">{assessmentData.description}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {assessmentData.questions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                <Progress value={progress} className="w-24 h-2" />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
                <CardDescription>
                  {currentQuestion.type === "mcq" ? "Select one answer" : "Select all that apply"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentQuestion.type === "mcq" ? (
                  <RadioGroup
                    value={(answers[currentQuestion.id] as string) || ""}
                    onValueChange={handleSingleChoiceChange}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50"
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={option.id}
                          checked={((answers[currentQuestion.id] as string[]) || []).includes(option.id)}
                          onCheckedChange={(checked) => handleMultipleChoiceChange(option.id, checked as boolean)}
                        />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                {currentQuestionIndex < assessmentData.questions.length - 1 ? (
                  <Button onClick={goToNextQuestion}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={() => setIsSubmitDialogOpen(true)}>Submit Assessment</Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your assessment? You won't be able to change your answers after
              submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Dialog */}
      <AlertDialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Assessment Results</AlertDialogTitle>
          </AlertDialogHeader>

          {results && (
            <div className="py-6">
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="relative mb-4">
                  <svg className="w-32 h-32">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="5"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className={`${
                        results.score >= 70
                          ? "text-green-500"
                          : results.score >= 50
                            ? "text-yellow-500"
                            : "text-red-500"
                      } stroke-current`}
                      strokeWidth="5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                      strokeDasharray="364.4"
                      strokeDashoffset={364.4 - (364.4 * results.score) / 100}
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold">
                    {results.score}%
                  </div>
                </div>

                {results.score >= 70 ? (
                  <div className="flex items-center text-green-500 mb-2">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="font-medium">Passed</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-500 mb-2">
                    <XCircle className="h-5 w-5 mr-1" />
                    <span className="font-medium">Failed</span>
                  </div>
                )}

                <p className="text-muted-foreground text-sm">
                  {results.score >= 70
                    ? "Great job! You've passed the assessment."
                    : "You didn't pass this time. Review the material and try again."}
                </p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Questions</span>
                  <span className="font-medium">{results.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Correct Answers</span>
                  <span className="font-medium text-green-500">{results.correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incorrect Answers</span>
                  <span className="font-medium text-red-500">{results.incorrectAnswers}</span>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction className="w-full sm:w-auto" onClick={() => router.push(`/course/${courseId}`)}>
              Return to Course
            </AlertDialogAction>
            {results && results.score < 70 && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsResultDialogOpen(false)
                  setCurrentQuestionIndex(0)
                  setAnswers({})
                  setTimeRemaining(assessmentData.timeLimit * 60)
                }}
              >
                Retry Assessment
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
