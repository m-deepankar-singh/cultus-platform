import { cn } from '@/lib/utils'
import { CheckCircle2, Circle } from 'lucide-react'

interface MilestoneProgressIndicatorProps {
  currentPercentage: number
  milestonesUnlocked: number[]
  isDisabled?: boolean
  className?: string
}

const MILESTONES = [10, 25, 50, 75, 90, 95, 100] // percentages

export function MilestoneProgressIndicator({
  currentPercentage,
  milestonesUnlocked = [],
  isDisabled = false,
  className
}: MilestoneProgressIndicatorProps) {
  
  return (
    <div className={cn("relative space-y-2", className)}>
      {/* Progress Bar with Milestone Markers */}
      <div className="relative">
        {/* Background Progress Bar */}
        <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
          {/* Current Progress */}
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(currentPercentage, 100)}%` }}
          />
        </div>
        
        {/* Milestone Markers */}
        <div className="absolute top-0 w-full h-2 flex justify-between items-center">
          {MILESTONES.map((milestone) => {
            const isUnlocked = milestonesUnlocked.includes(milestone)
            const isCurrent = currentPercentage >= milestone
            
            return (
              <div
                key={milestone}
                className="relative flex flex-col items-center"
                style={{ 
                  position: 'absolute',
                  left: `${milestone}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Marker Dot */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2 transition-all duration-200",
                    "flex items-center justify-center",
                    isUnlocked || isCurrent
                      ? "bg-green-500 border-green-400 shadow-sm" 
                      : "bg-gray-400 border-gray-500"
                  )}
                >
                  {(isUnlocked || isCurrent) && (
                    <CheckCircle2 className="w-2 h-2 text-white" />
                  )}
                </div>
                
                {/* Marker Label */}
                <div
                  className={cn(
                    "absolute top-4 text-xs font-medium whitespace-nowrap",
                    "transition-colors duration-200",
                    isUnlocked || isCurrent
                      ? "text-green-300"
                      : "text-gray-400"
                  )}
                >
                  {milestone}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Milestone Legend */}
      <div className="flex justify-between items-center text-xs text-gray-300 mt-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span>Unlocked</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-gray-400" />
            <span>Locked</span>
          </div>
        </div>
        
        {/* Current Progress Info */}
        <div className="text-right">
          <div className="text-white font-medium">
            {Math.round(currentPercentage)}% Complete
          </div>
          <div className="text-gray-400">
            {milestonesUnlocked.length} of {MILESTONES.length} milestones
          </div>
        </div>
      </div>
      
      {/* Milestone List (for mobile/accessibility) */}
      <div className="grid grid-cols-4 gap-2 mt-4 lg:hidden">
        {MILESTONES.map((milestone) => {
          const isUnlocked = milestonesUnlocked.includes(milestone)
          const isCurrent = currentPercentage >= milestone
          
          return (
            <div
              key={milestone}
              className={cn(
                "flex items-center justify-center",
                "py-1 px-2 rounded text-xs font-medium",
                "transition-colors duration-200",
                isUnlocked || isCurrent
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 text-gray-300"
              )}
            >
              {milestone}%
            </div>
          )
        })}
      </div>
      
      {/* Disabled State Overlay - Only covers this component */}
      {isDisabled && (
        <div className="absolute inset-0 bg-transparent cursor-not-allowed pointer-events-none" />
      )}
    </div>
  )
} 