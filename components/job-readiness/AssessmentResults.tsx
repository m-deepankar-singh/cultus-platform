'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { Trophy, CheckCircle2, XCircle, Star, ArrowRight, RotateCcw, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { StarRating } from '@/components/ui/StarRating'

interface AssessmentResultsProps {
  moduleId: string
}

const tierColors = {
  BRONZE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-600',
  SILVER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-600', 
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-600'
}

const tierIcons = {
  BRONZE: <Trophy className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
  SILVER: <Trophy className="h-6 w-6 text-gray-600 dark:text-gray-400" />,
  GOLD: <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
}

export function AssessmentResults({ moduleId }: AssessmentResultsProps) {
  const { data: progress } = useJobReadinessProgress()
  const { data: assessmentData, isLoading } = useAssessmentList(progress?.products[0]?.id || '')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading results...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessmentData) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load assessment results. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  // Find the specific assessment
  const assessment = assessmentData.assessments.find(a => a.id === moduleId)
  
  if (!assessment) {
    return (
      <Alert>
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Assessment not found.
        </AlertDescription>
      </Alert>
    )
  }

  if (!assessment.is_completed) {
    return (
      <Alert>
        <AlertDescription>
          This assessment has not been completed yet.
        </AlertDescription>
      </Alert>
    )
  }

  const { last_score, tier_achieved, is_tier_determining, configuration } = assessment
  const passed = last_score !== undefined && last_score !== null && last_score >= configuration.pass_threshold
  const scorePercentage = last_score ?? 0

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card className={`border-2 ${
        passed 
          ? 'border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
          : 'border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
      }`}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            {passed ? (
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/50">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/50">
                <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {assessment.name}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Score Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Your Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Visualization */}
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
              {scorePercentage}%
            </div>
            <Progress value={scorePercentage} className="h-3 mb-4" />
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>0%</span>
              <span className="font-medium">Passing: {configuration.pass_threshold}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {Math.round((scorePercentage / 100) * assessment.questions_count)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {assessment.questions_count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {configuration.pass_threshold}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Required to Pass</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Achievement */}
      {is_tier_determining && tier_achieved && (
        <Card className={tierColors[tier_achieved as keyof typeof tierColors]}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tierIcons[tier_achieved as keyof typeof tierIcons]}
              Tier Achievement
            </CardTitle>
            <CardDescription>
              Your performance has determined your skill tier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge className={`text-lg px-4 py-2 ${tierColors[tier_achieved as keyof typeof tierColors]}`}>
                {tier_achieved} TIER
              </Badge>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">🎉 Congratulations!</h3>
              <p className="text-sm">
                You've been placed in the <strong>{tier_achieved}</strong> tier based on your assessment performance. 
                This determines the level of content and challenges you'll receive in the upcoming modules.
              </p>
            </div>

            {/* Unlock Star */}
            <div className="text-center p-4 rounded-lg bg-white/50 dark:bg-black/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">First Star Earned!</span>
              </div>
                             <StarRating currentStars={1} totalStars={5} size="lg" showNumbers={false} />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                You've unlocked your first star and can now proceed to courses
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            What's Next?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passed ? (
            <div className="space-y-4">
              <Alert className="border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Great job! You've successfully completed this assessment. 
                  {is_tier_determining && " You've earned your first star and can now access course content."}
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <Link href="/app/job-readiness">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                {is_tier_determining && (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/app/job-readiness/courses">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Start Courses
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-orange-200 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20">
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  You scored {scorePercentage}%, which is below the passing threshold of {configuration.pass_threshold}%. 
                  Don't worry - you can retake this assessment to improve your score.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-medium">Suggestions for improvement:</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400 ml-4">
                  <li>• Review the relevant course materials</li>
                  <li>• Take practice quizzes if available</li>
                  <li>• Focus on areas where you had difficulty</li>
                  <li>• Ensure you understand the concepts before retaking</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/app/job-readiness">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href={`/app/job-readiness/assessments/${moduleId}`}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake Assessment
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Info */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm">Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Assessment Type: </span>
              <span className="font-medium">
                {is_tier_determining ? 'Tier-Determining' : 'Standard Assessment'}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Questions: </span>
              <span className="font-medium">{assessment.questions_count}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Time Limit: </span>
              <span className="font-medium">{configuration.duration_minutes} minutes</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Passing Score: </span>
              <span className="font-medium">{configuration.pass_threshold}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 