'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StarRating } from '@/components/ui/StarRating'
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Star, 
  ArrowRight, 
  RotateCcw, 
  Home, 
  ThumbsUp, 
  ThumbsDown, 
  Target,
  TrendingUp,
  FileText,
  Link as LinkIcon,
  Info
} from 'lucide-react'
import Link from 'next/link'

interface ProjectFeedbackProps {
  submissionResult: {
    success: boolean
    submission: {
      id: string
      project_title: string
      submission_type: string
      submission_content?: string
      submission_url?: string
      score: number
      passed: boolean
      content_optimized?: boolean
      original_content_length?: number
    }
    feedback: {
      summary: string
      strengths: string[]
      weaknesses: string[]
      improvements: string[]
    }
    star_level_updated: boolean
    new_star_level: string
    passing_threshold: number
    storage_optimization?: {
      optimized: boolean
      message: string
      original_size: string
    }
  }
  onStartNew?: () => void
  isAlreadySubmitted?: boolean
}

export function ProjectFeedback({ 
  submissionResult, 
  onStartNew, 
  isAlreadySubmitted = false 
}: ProjectFeedbackProps) {
  const { submission, feedback, star_level_updated, new_star_level, passing_threshold } = submissionResult
  const passed = submission.passed
  const score = submission.score

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default'
    return 'destructive'
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card className={`border-2 ${passed ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {passed ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <CardTitle className={`text-2xl ${passed ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {passed ? 'Project Completed!' : 'Project Needs Improvement'}
                </CardTitle>
                <CardDescription className={passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                  {submission.project_title}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {score}%
              </div>
              <Badge variant={getScoreBadgeVariant(score)}>
                {passed ? 'Passed' : 'Failed'} (Required: {passing_threshold}%)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Score Progress</span>
                <span>{score}% / {passing_threshold}%</span>
              </div>
              <Progress value={score} className="h-2" />
            </div>

            {/* Star Level Update */}
            {star_level_updated && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <Star className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Congratulations!</strong> You've earned your 4th star!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submission Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Submission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Text Submission</p>
              {submissionResult.storage_optimization?.optimized && (
                <Badge variant="outline" className="text-xs">
                  Storage Optimized
                </Badge>
              )}
            </div>
            
            {/* Storage Optimization Notice */}
            {submissionResult.storage_optimization && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  {submissionResult.storage_optimization.message}
                  <br />
                  <span className="text-xs text-blue-600">
                    Original size: {submissionResult.storage_optimization.original_size}
                  </span>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="bg-muted p-4 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap font-mono">
                {submission.submission_content?.substring(0, 500)}
                {submission.submission_content && submission.submission_content.length > 500 && '...'}
              </p>
            </div>
            {submission.submission_content && submission.submission_content.length > 500 && (
              <p className="text-xs text-muted-foreground">
                Showing first 500 characters of {submission.submission_content.length} total characters
                {submissionResult.storage_optimization?.optimized && (
                  <span className="text-blue-600 ml-1">
                    (optimized summary)
                  </span>
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            AI Feedback & Analysis
          </CardTitle>
          <CardDescription>
            Detailed feedback from our AI evaluation system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div>
            <h4 className="font-medium mb-2">Overall Assessment</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feedback.summary}
            </p>
          </div>

          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {feedback.weaknesses && feedback.weaknesses.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {feedback.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements && feedback.improvements.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {feedback.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">
                {passed ? 'What\'s Next?' : 'Next Steps'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {passed 
                  ? 'Continue with your Job Readiness journey.'
                  : 'Review the feedback above and try again with a new project. Each attempt gives you a fresh project to work on.'
                }
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/app/job-readiness">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              {!passed && !isAlreadySubmitted && onStartNew && (
                <Button onClick={onStartNew} variant="default">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry with New Project
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 