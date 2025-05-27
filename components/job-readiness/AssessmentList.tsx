'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { AssessmentCard } from './AssessmentCard'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AssessmentListProps {
  productId?: string
}

export function AssessmentList({ productId: providedProductId }: AssessmentListProps = {}) {
  const { data: progress, isLoading: progressLoading } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: assessmentData, isLoading: assessmentsLoading, error } = useAssessmentList(productId || '')

  if (progressLoading || assessmentsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading assessments...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load assessments. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (!assessmentData?.assessments || assessmentData.assessments.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No assessments are currently available. Please check back later or contact support.
        </AlertDescription>
      </Alert>
    )
  }

  const { assessments, current_tier, current_star_level } = assessmentData
  const completedAssessments = assessments.filter(a => a.is_completed)
  const pendingAssessments = assessments.filter(a => !a.is_completed && a.is_unlocked)
  const lockedAssessments = assessments.filter(a => !a.is_unlocked)

  return (
    <div className="space-y-6">
      {/* Completion Status */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {completedAssessments.length} of {assessments.length} assessments completed
          </span>
        </div>
      </div>

      {/* Available Assessments */}
      {pendingAssessments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Available Assessments
          </h2>
          <div className="grid gap-4">
            {pendingAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Completed Assessments
          </h2>
          <div className="grid gap-4">
            {completedAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked Assessments */}
      {lockedAssessments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Coming Soon
          </h2>
          <div className="grid gap-4">
            {lockedAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Completed Users */}
      {pendingAssessments.length === 0 && completedAssessments.length === assessments.length && (
        <div className="text-center py-8">
          <div className="p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              All Assessments Complete!
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-4">
              You've successfully completed all available assessments. Your tier has been determined as <strong>{current_tier}</strong>.
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              You can now proceed to the next module in your Job Readiness journey.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 