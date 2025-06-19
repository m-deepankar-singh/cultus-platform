'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Trophy, CheckCircle2, Lock, Play, RotateCcw, Eye } from 'lucide-react'
import Link from 'next/link'

interface Assessment {
  id: string
  name: string
  type: string
  configuration: {
    pass_threshold: number
    duration_minutes: number
  }
  sequence: number
  is_unlocked: boolean
  is_completed: boolean
  is_tier_determining: boolean
  questions_count: number
  last_score: number | null
  tier_achieved: string | null
}

interface AssessmentCardProps {
  assessment: Assessment
  current_tier?: string | null
  current_star_level?: string | null
}

const tierColors = {
  BRONZE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  SILVER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', 
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
}

export function AssessmentCard({ assessment }: AssessmentCardProps) {
  const {
    id,
    name,
    configuration,
    is_unlocked,
    is_completed,
    is_tier_determining,
    questions_count,
    last_score,
    tier_achieved
  } = assessment

  const getStatusIcon = () => {
    if (is_completed) return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
    if (!is_unlocked) return <Lock className="h-5 w-5 text-gray-400" />
    return <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  }

  const getStatusText = () => {
    if (is_completed) return 'Completed'
    if (!is_unlocked) return 'Locked'
    return 'Available'
  }

  const getStatusColor = () => {
    if (is_completed) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    if (!is_unlocked) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  }

  const getActionButton = () => {
    if (!is_unlocked) {
      return (
        <Button disabled variant="outline" className="w-full">
          <Lock className="h-4 w-4 mr-2" />
          Locked
        </Button>
      )
    }

    if (is_completed) {
      return (
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/app/job-readiness/assessments/${id}/results`}>
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link href={`/app/job-readiness/assessments/${id}`}>
              <RotateCcw className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )
    }

    return (
      <Button asChild className="w-full">
        <Link href={`/app/job-readiness/assessments/${id}`}>
          <Play className="h-4 w-4 mr-2" />
          Start Assessment
        </Link>
      </Button>
    )
  }

  return (
    <Card className={`transition-all hover:shadow-md ${
      is_completed 
        ? 'border-green-200 dark:border-green-800' 
        : is_unlocked 
          ? 'border-blue-200 dark:border-blue-600' 
          : 'border-gray-200 dark:border-gray-700 opacity-75'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getStatusIcon()}
              {name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
              {is_tier_determining && (
                <Badge variant="secondary" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  Tier Determining
                </Badge>
              )}
              {tier_achieved && (
                <Badge className={tierColors[tier_achieved as keyof typeof tierColors]}>
                  {tier_achieved} Achieved
                </Badge>
              )}
            </div>
          </div>
          {last_score !== null && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {last_score}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last Score
              </div>
            </div>
          )}
        </div>
        <CardDescription>
          {is_tier_determining 
            ? 'This assessment determines your tier level and unlocks appropriate content for your skill level.'
            : 'Standard assessment to evaluate your knowledge and progress.'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Assessment Details */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>{questions_count} Questions</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{configuration.duration_minutes} mins</span>
          </div>
        </div>

        {/* Pass Threshold */}
        <div className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Passing threshold: </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {configuration.pass_threshold}%
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {getActionButton()}
        </div>

        {/* Completion Message */}
        {is_completed && last_score !== null && (
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="text-sm text-green-700 dark:text-green-300">
              {last_score >= configuration.pass_threshold 
                ? '🎉 Congratulations! You passed this assessment.' 
                : '💪 Keep practicing! You can retake this assessment.'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 