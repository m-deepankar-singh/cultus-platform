'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { Medal, Trophy, Star, Target, Clock, CheckCircle } from 'lucide-react'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'

const tierColors = {
  BRONZE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  SILVER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', 
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
}

const tierIcons = {
  BRONZE: <Medal className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
  SILVER: <Trophy className="h-4 w-4 text-gray-600 dark:text-gray-400" />,
  GOLD: <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
}

interface TierDisplayProps {
  productId?: string
}

export function TierDisplay({ productId: providedProductId }: TierDisplayProps = {}) {
  const { data: progress } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: assessmentData } = useAssessmentList(productId || '')

  if (!assessmentData) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { 
    tier_criteria, 
    current_tier, 
    all_assessments_complete = false,
    completed_assessments_count = 0,
    total_assessments_count = 0
  } = assessmentData

  const hasAssessments = total_assessments_count > 0
  const progressPercentage = hasAssessments ? Math.round((completed_assessments_count / total_assessments_count) * 100) : 0

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Tier System
        </CardTitle>
        <CardDescription>
          Complete all assessment modules to determine your tier level and unlock appropriate content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Status Display */}
          {all_assessments_complete && current_tier ? (
            // All assessments completed - show current tier
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <span className="font-medium text-gray-700 dark:text-gray-300">Current Tier:</span>
              <Badge className={tierColors[current_tier as keyof typeof tierColors]}>
                <span className="flex items-center gap-1">
                  {tierIcons[current_tier as keyof typeof tierIcons]}
                  {current_tier}
                </span>
              </Badge>
            </div>
          ) : (
            // Assessments incomplete - show "No Tier Yet" state
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="font-medium text-amber-700 dark:text-amber-300">Current Tier:</span>
                <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    No Tier Yet
                  </span>
                </Badge>
              </div>

              {/* Assessment Completion Progress */}
              {hasAssessments && (
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Assessment Progress
                      </h4>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {completed_assessments_count}/{total_assessments_count} completed
                      </span>
                    </div>
                    
                    <Progress 
                      value={progressPercentage} 
                      className="h-2"
                    />
                    
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Complete all {total_assessments_count} assessment modules to unlock your tier and earn your first star.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tier Criteria - Show as goals when no tier assigned */}
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(tier_criteria).map(([tier, criteria]) => {
              const tierName = tier.toUpperCase() as keyof typeof tierColors
              const isCurrentTier = all_assessments_complete && current_tier === tierName
              
              return (
                <Card 
                  key={tier} 
                  className={`transition-all ${
                    isCurrentTier 
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-blue-200 dark:border-blue-600' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {tierIcons[tierName]}
                      <span className="capitalize">{tier}</span>
                      {isCurrentTier && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Score Range:
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {criteria.min_score}% - {criteria.max_score}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {tier === 'bronze' && 'Entry level - Build foundational skills'}
                        {tier === 'silver' && 'Intermediate - Advance your knowledge'}
                        {tier === 'gold' && 'Advanced - Master complex concepts'}
                      </div>
                      {!all_assessments_complete && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Goal: Complete all assessments to determine eligibility
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Help Information */}
          {!all_assessments_complete && hasAssessments && (
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    How Tier Assignment Works
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your final tier will be determined by your average performance across <strong>all assessment modules</strong>. 
                    This ensures a comprehensive evaluation of your skills before unlocking advanced content.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Initial State - No Assessments */}
          {!hasAssessments && (
            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Ready to Get Started?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Assessment modules will be available soon to determine your tier level and begin your Job Readiness journey.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 