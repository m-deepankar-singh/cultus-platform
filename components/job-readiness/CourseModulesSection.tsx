'use client'

import { Brain, Play } from 'lucide-react'

interface AssessmentsSectionProps {
  productId?: string
}

export function AssessmentsSection({ productId }: AssessmentsSectionProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Assessments Card */}
      <div className="p-8 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/5 text-center space-y-6">
        {/* Header with icons */}
        <div className="flex items-center justify-center gap-4">
          <div className="p-3 rounded-full bg-green-500/20 border border-green-500/30">
            <Brain className="w-6 h-6 text-green-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-white">Assessments</h2>
          
          <div className="p-3 rounded-full bg-blue-500/20 border border-blue-500/30">
            <Play className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        
        {/* Description */}
        <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Complete tier-determining assessments to establish your skill level and unlock your learning path. 
          Your performance will determine your initial tier: Bronze, Silver, or Gold.
        </p>
        
        {/* Action Button */}
        <div className="pt-4">
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium">
            <Play className="w-4 h-4" />
            <span>Start Assessment</span>
          </button>
        </div>
      </div>
    </div>
  )
}