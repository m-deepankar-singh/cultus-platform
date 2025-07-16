'use client'

import { useAssessmentList } from '@/hooks/useAssessmentList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { SimpleAssessmentCard } from './SimpleAssessmentCard'
import { Loader2, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

interface SimpleAssessmentGridProps {
  productId?: string
}

export function SimpleAssessmentGrid({ productId: providedProductId }: SimpleAssessmentGridProps = {}) {
  const { data: progress, isLoading: progressLoading } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: assessmentData, isLoading: assessmentsLoading, error } = useAssessmentList(productId || '')

  if (progressLoading || assessmentsLoading) {
    return (
      <div className="relative">
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-4 text-white/70">
            <Loader2 className="h-8 w-8 animate-spin" />
            <div className="space-y-1">
              <div className="text-lg font-medium">
                Loading Assessments...
              </div>
              <div className="text-sm text-white/50">
                Please wait while we load your assessments
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="relative p-8 rounded-2xl backdrop-blur-md border border-red-400/30"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-red-500/20 border border-red-400/30">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-1">
              Connection Error
            </h3>
            <p className="text-red-200/80">
              Failed to load assessments. Please refresh the page and try again.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!assessmentData?.assessments || assessmentData.assessments.length === 0) {
    return (
      <div
        className="relative p-12 rounded-2xl backdrop-blur-md border border-blue-400/30 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)'
        }}
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
          <Zap className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-blue-300 mb-3">
          No Assessments Available
        </h3>
        <p className="text-blue-200/80 max-w-md mx-auto">
          Assessments are currently being configured for your profile. 
          Please check back shortly or contact support.
        </p>
      </div>
    )
  }

  const { assessments, current_tier, current_star_level } = assessmentData
  const completedAssessments = assessments.filter(a => a.is_completed)
  const pendingAssessments = assessments.filter(a => !a.is_completed && a.is_unlocked)
  const lockedAssessments = assessments.filter(a => !a.is_unlocked)

  return (
    <div className="space-y-16">
      {/* Completion status */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md border border-white/20"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)'
          }}
        >
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="text-white font-medium">
            {completedAssessments.length} of {assessments.length} Assessments Complete
          </span>
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Available Assessments */}
      {pendingAssessments.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-500" />
            <h2 className="text-2xl font-bold text-blue-300">
              Available Assessments
            </h2>
          </div>
          
          <div className="grid gap-6">
            {pendingAssessments.map((assessment, index) => (
              <SimpleAssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500" />
            <h2 className="text-2xl font-bold text-green-300">
              Completed Assessments
            </h2>
          </div>
          
          <div className="grid gap-6">
            {completedAssessments.map((assessment, index) => (
              <SimpleAssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                index={index + pendingAssessments.length}
              />
            ))}
          </div>
        </section>
      )}

      {/* Locked Assessments */}
      {lockedAssessments.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-gradient-to-r from-slate-400 to-slate-600" />
            <h2 className="text-2xl font-bold text-slate-300">
              Upcoming Assessments
            </h2>
          </div>
          
          <div className="grid gap-6">
            {lockedAssessments.map((assessment, index) => (
              <SimpleAssessmentCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                index={index + pendingAssessments.length + completedAssessments.length}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Complete State */}
      {pendingAssessments.length === 0 && completedAssessments.length === assessments.length && (
        <div className="text-center py-16">
          <div
            className="relative p-12 rounded-3xl backdrop-blur-md border border-green-400/30 max-w-2xl mx-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(0, 0, 0, 0.8) 100%)'
            }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/30 border-2 border-green-400 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
            
            <h3 className="text-3xl font-bold text-green-300 mb-4">
              All Assessments Complete!
            </h3>
            
            <p className="text-green-200 mb-6 text-lg leading-relaxed">
              You have successfully completed all available assessments. Your tier designation is <strong className="text-green-300">{current_tier}</strong>.
            </p>
            
            <div className="text-sm text-green-300/80">
              Ready to proceed to the next phase of your learning journey...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}