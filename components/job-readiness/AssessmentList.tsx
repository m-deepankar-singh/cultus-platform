'use client'

import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { AssessmentCard } from './AssessmentCard'
import { Loader2, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

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
      <PerformantAnimatedCard variant="glass" className="py-12">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1">
              <div className="text-lg font-medium">
                Loading Assessments...
              </div>
              <div className="text-sm text-muted-foreground">
                Please wait while we load your assessments
              </div>
            </div>
          </div>
        </div>
      </PerformantAnimatedCard>
    )
  }

  if (error) {
    return (
      <PerformantAnimatedCard 
        variant="glass" 
        className="border-destructive/20 bg-destructive/5"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-1">
              Connection Error
            </h3>
            <p className="text-destructive/80">
              Failed to load assessments. Please refresh the page and try again.
            </p>
          </div>
        </div>
      </PerformantAnimatedCard>
    )
  }

  if (!assessmentData?.assessments || assessmentData.assessments.length === 0) {
    return (
      <PerformantAnimatedCard 
        variant="glass" 
        className="py-12 text-center border-primary/20 bg-primary/5"
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-primary mb-3">
              No Assessments Available
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Assessments are currently being configured for your profile. 
              Please check back shortly or contact support.
            </p>
          </div>
        </div>
      </PerformantAnimatedCard>
    )
  }

  const { assessments, current_tier, current_star_level } = assessmentData
  const completedAssessments = assessments.filter(a => a.is_completed)
  const pendingAssessments = assessments.filter(a => !a.is_completed && a.is_unlocked)
  const lockedAssessments = assessments.filter(a => !a.is_unlocked)

  const progressPercentage = Math.round((completedAssessments.length / assessments.length) * 100)

  return (
    <div className="space-y-8">
      {/* Completion Status with Progress Ring */}
      <PerformantAnimatedCard variant="glass" className="text-center py-6">
        <div className="flex items-center justify-center gap-6">
          <OptimizedProgressRing
            value={progressPercentage}
            size={60}
            color="success"
            showValue={true}
            delay={300}
          />
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-lg font-semibold">Assessment Progress</span>
            </div>
            <p className="text-muted-foreground">
              {completedAssessments.length} of {assessments.length} assessments completed
            </p>
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Available Assessments */}
      {pendingAssessments.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-primary to-accent"></div>
            <h2 className="text-2xl font-bold gradient-text">
              Available Assessments
            </h2>
          </div>
          
          <div className="grid gap-6">
            {pendingAssessments.map((assessment, index) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                staggerIndex={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-success to-emerald-500"></div>
            <h2 className="text-2xl font-bold text-success">
              Completed Assessments
            </h2>
          </div>
          
          <div className="grid gap-6">
            {completedAssessments.map((assessment, index) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                staggerIndex={index + pendingAssessments.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* Locked Assessments */}
      {lockedAssessments.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-muted-foreground to-muted"></div>
            <h2 className="text-2xl font-bold text-muted-foreground">
              Upcoming Assessments
            </h2>
          </div>
          
          <div className="grid gap-6">
            {lockedAssessments.map((assessment, index) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                staggerIndex={index + pendingAssessments.length + completedAssessments.length}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Complete State */}
      {pendingAssessments.length === 0 && completedAssessments.length === assessments.length && (
        <PerformantAnimatedCard 
          variant="glass" 
          className="text-center py-12 border-success/20 bg-success/5"
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <OptimizedProgressRing
                value={100}
                size={80}
                color="success"
                showValue={false}
                delay={300}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-success">
                All Assessments Complete!
              </h3>
              <p className="text-lg text-success/80 max-w-md mx-auto">
                You've successfully completed all available assessments. Your tier has been determined as{' '}
                <strong className="text-success">{current_tier}</strong>.
              </p>
              <p className="text-success/70">
                You can now proceed to the next phase of your Job Readiness journey.
              </p>
            </div>
          </div>
        </PerformantAnimatedCard>
      )}
    </div>
  )
} 