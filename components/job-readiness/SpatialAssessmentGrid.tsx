'use client'

import { motion } from 'framer-motion'
import { useAssessmentList } from '@/hooks/useAssessmentList'
import { useJobReadinessProgress } from '@/hooks/useJobReadinessProgress'
import { DimensionalPortalCard } from './DimensionalPortalCard'
import { Loader2, AlertCircle, CheckCircle2, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpatialAssessmentGridProps {
  productId?: string
}

export function SpatialAssessmentGrid({ productId: providedProductId }: SpatialAssessmentGridProps = {}) {
  const { data: progress, isLoading: progressLoading } = useJobReadinessProgress()
  const fallbackProductId = progress?.products[0]?.id
  const productId = providedProductId || fallbackProductId
  const { data: assessmentData, isLoading: assessmentsLoading, error } = useAssessmentList(productId || '')

  if (progressLoading || assessmentsLoading) {
    return (
      <div className="relative">
        <motion.div
          className="flex items-center justify-center py-24"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 text-white/70">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8" />
            </motion.div>
            <div className="space-y-1">
              <motion.div 
                className="text-lg font-medium"
                animate={{
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Loading Assessments...
              </motion.div>
              <div className="text-sm text-white/50">
                Calibrating assessment protocols
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        className="relative p-8 rounded-2xl backdrop-blur-md border border-red-400/30"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
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
      </motion.div>
    )
  }

  if (!assessmentData?.assessments || assessmentData.assessments.length === 0) {
    return (
      <motion.div
        className="relative p-12 rounded-2xl backdrop-blur-md border border-blue-400/30 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center"
          animate={{
            boxShadow: ['0 0 20px rgba(59, 130, 246, 0.3)', '0 0 40px rgba(59, 130, 246, 0.6)', '0 0 20px rgba(59, 130, 246, 0.3)']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Zap className="h-8 w-8 text-blue-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-blue-300 mb-3">
          No Assessments Available
        </h3>
        <p className="text-blue-200/80 max-w-md mx-auto">
          Assessments are currently being configured for your profile. 
          Please check back shortly or contact support.
        </p>
      </motion.div>
    )
  }

  const { assessments, current_tier, current_star_level } = assessmentData
  const completedAssessments = assessments.filter(a => a.is_completed)
  const pendingAssessments = assessments.filter(a => !a.is_completed && a.is_unlocked)
  const lockedAssessments = assessments.filter(a => !a.is_unlocked)

  return (
    <div className="space-y-12">
      {/* Completion status quantum display */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md border border-white/20"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(0, 0, 0, 0.8) 100%)'
          }}
          animate={{
            boxShadow: ['0 0 20px rgba(34, 197, 94, 0.3)', '0 0 30px rgba(34, 197, 94, 0.5)', '0 0 20px rgba(34, 197, 94, 0.3)']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </motion.div>
          <span className="text-white font-medium">
            {completedAssessments.length} of {assessments.length} Assessments Complete
          </span>
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.3, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>

      {/* Available Assessments */}
      {pendingAssessments.length > 0 && (
        <motion.section
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            className="flex items-center gap-4"
            animate={{
              x: [0, 5, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div
              className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-500"
              animate={{
                scaleX: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <h2 className="text-2xl font-bold text-blue-300">
              Available Assessments
            </h2>
            <motion.div
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Sparkles className="w-6 h-6 text-blue-400" />
            </motion.div>
          </motion.div>
          
          <div className="grid gap-8">
            {pendingAssessments.map((assessment, index) => (
              <DimensionalPortalCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                index={index}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <motion.section
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.div
            className="flex items-center gap-4"
            animate={{
              x: [0, -5, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div
              className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500"
              animate={{
                scaleX: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5
              }}
            />
            <h2 className="text-2xl font-bold text-green-300">
              Completed Assessments
            </h2>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </motion.div>
          </motion.div>
          
          <div className="grid gap-8">
            {completedAssessments.map((assessment, index) => (
              <DimensionalPortalCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                index={index + pendingAssessments.length}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Locked Assessments */}
      {lockedAssessments.length > 0 && (
        <motion.section
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.div
            className="flex items-center gap-4"
          >
            <motion.div
              className="w-8 h-0.5 bg-gradient-to-r from-slate-400 to-slate-600"
              animate={{
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <h2 className="text-2xl font-bold text-slate-300">
              Upcoming Assessments
            </h2>
          </motion.div>
          
          <div className="grid gap-8">
            {lockedAssessments.map((assessment, index) => (
              <DimensionalPortalCard
                key={assessment.id}
                assessment={assessment}
                current_tier={current_tier}
                current_star_level={current_star_level}
                index={index + pendingAssessments.length + completedAssessments.length}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* All Complete Celebration */}
      {pendingAssessments.length === 0 && completedAssessments.length === assessments.length && (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <motion.div
            className="relative p-12 rounded-3xl backdrop-blur-md border border-green-400/30 max-w-2xl mx-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 50%, rgba(0, 0, 0, 0.8) 100%)'
            }}
            animate={{
              boxShadow: ['0 0 40px rgba(34, 197, 94, 0.3)', '0 0 80px rgba(34, 197, 94, 0.6)', '0 0 40px rgba(34, 197, 94, 0.3)']
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Celebration particles */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-green-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            <motion.div
              className="relative z-10"
              animate={{
                y: [0, -10, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/30 border-2 border-green-400 flex items-center justify-center"
                animate={{
                  rotate: 360
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </motion.div>
              
              <h3 className="text-3xl font-bold text-green-300 mb-4">
                All Assessments Complete!
              </h3>
              
              <p className="text-green-200 mb-6 text-lg leading-relaxed">
                You have successfully completed all available assessments. Your tier designation is <strong className="text-green-300">{current_tier}</strong>.
              </p>
              
              <motion.div
                className="text-sm text-green-300/80"
                animate={{
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Ready to proceed to the next phase of your learning journey...
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}