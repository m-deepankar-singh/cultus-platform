import { cn } from '@/lib/utils'
import { CheckCircle2, Circle } from 'lucide-react'

interface MilestoneProgressIndicatorProps {
  currentPercentage: number
  milestonesUnlocked: number[]
  isDisabled?: boolean
  className?: string
}

const MILESTONES = [10, 25, 50, 75, 100] // percentages

export function MilestoneProgressIndicator({
  currentPercentage,
  milestonesUnlocked = [],
  isDisabled = false,
  className
}: MilestoneProgressIndicatorProps) {
  
  return (
    <div className={cn("relative space-y-2", className)}>
      {/* Progress Bar with Milestone Markers */}
      <div className="relative pb-8 px-2 sm:px-2">
        {/* Background Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          {/* Current Progress */}
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(currentPercentage, 100)}%` }}
          />
        </div>
        
        {/* Milestone Markers */}
        <div className="absolute top-0 w-full h-2 overflow-visible">
          {MILESTONES.map((milestone, index) => {
            const isUnlocked = milestonesUnlocked.includes(milestone)
            const isCurrent = currentPercentage >= milestone
            
            // Adjust positioning for edge milestones to prevent overflow
            let leftPosition = milestone
            let transform = 'translateX(-50%)'
            
            // Special handling for edge cases on mobile
            if (milestone === 10) {
              leftPosition = Math.max(milestone, 8) // Keep 10% milestone away from left edge
              transform = 'translateX(-30%)'
            } else if (milestone === 100) {
              leftPosition = Math.min(milestone, 92) // Keep 100% milestone away from right edge  
              transform = 'translateX(-70%)'
            }
            
            return (
              <div
                key={milestone}
                className="absolute flex flex-col items-center"
                style={{ 
                  left: `${leftPosition}%`,
                  transform: transform
                }}
              >
                {/* Marker Dot */}
                <div
                  className={cn(
                    "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 transition-all duration-200 z-10",
                    "flex items-center justify-center",
                    isUnlocked || isCurrent
                      ? "bg-emerald-500 border-emerald-400 shadow-sm" 
                      : "bg-muted-foreground border-muted-foreground"
                  )}
                >
                  {(isUnlocked || isCurrent) && (
                    <CheckCircle2 className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                  )}
                </div>
                
                {/* Marker Label - Hidden on mobile since grid shows them */}
                <div
                  className={cn(
                    "absolute top-4 sm:top-5 text-[10px] sm:text-xs font-medium whitespace-nowrap text-center",
                    "transition-colors duration-200 min-w-[1.5rem] sm:min-w-[2rem]",
                    "hidden sm:block", // Hide on mobile, show on sm and up
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
      
      {/* Milestone Legend - More minimal on mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-muted-foreground mt-3 sm:mt-4 gap-2 sm:gap-4">
        {/* Hide legend on mobile, show only on sm+ */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-xs">Unlocked</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs">Locked</span>
          </div>
        </div>
        
        {/* Current Progress Info - Simplified on mobile */}
        <div className="text-center sm:text-right">
          <div className="text-foreground font-medium text-sm sm:text-base">
            {Math.floor(currentPercentage)}% Complete
          </div>
          <div className="text-muted-foreground text-[10px] sm:text-xs">
            <span className="sm:hidden">{milestonesUnlocked.length}/5</span>
            <span className="hidden sm:inline">{milestonesUnlocked.length} of {MILESTONES.length} milestones</span>
          </div>
        </div>
      </div>
      
      
      {/* Disabled State Overlay - Only covers this component */}
      {isDisabled && (
        <div className="absolute inset-0 bg-transparent cursor-not-allowed pointer-events-none" />
      )}
    </div>
  )
} 