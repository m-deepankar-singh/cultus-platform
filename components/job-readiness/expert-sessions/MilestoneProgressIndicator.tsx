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
      <div className="relative pb-8">
        {/* Background Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          {/* Current Progress */}
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(currentPercentage, 100)}%` }}
          />
        </div>
        
        {/* Milestone Markers */}
        <div className="absolute top-0 w-full h-2">
          {MILESTONES.map((milestone, index) => {
            const isUnlocked = milestonesUnlocked.includes(milestone)
            const isCurrent = currentPercentage >= milestone
            
            return (
              <div
                key={milestone}
                className="absolute flex flex-col items-center"
                style={{ 
                  left: `${milestone}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Marker Dot */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2 transition-all duration-200 z-10",
                    "flex items-center justify-center",
                    isUnlocked || isCurrent
                      ? "bg-emerald-500 border-emerald-400 shadow-sm" 
                      : "bg-muted-foreground border-muted-foreground"
                  )}
                >
                  {(isUnlocked || isCurrent) && (
                    <CheckCircle2 className="w-2 h-2 text-white" />
                  )}
                </div>
                
                {/* Marker Label */}
                <div
                  className={cn(
                    "absolute top-5 text-xs font-medium whitespace-nowrap text-center",
                    "transition-colors duration-200 min-w-[2rem]",
                    isUnlocked || isCurrent
                      ? "text-emerald-400 dark:text-emerald-300"
                      : "text-muted-foreground"
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
      <div className="flex justify-between items-center text-xs text-muted-foreground mt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Unlocked</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-muted-foreground" />
            <span>Locked</span>
          </div>
        </div>
        
        {/* Current Progress Info */}
        <div className="text-right">
          <div className="text-foreground font-medium">
            {Math.round(currentPercentage)}% Complete
          </div>
          <div className="text-muted-foreground">
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
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
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