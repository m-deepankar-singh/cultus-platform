 "use client"

import { Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useJobReadinessProgress } from "@/hooks/useJobReadinessProgress"

interface TierConfig {
  name: string
  color: string
  bgColor: string
  textColor: string
}

const tierConfigs: Record<string, TierConfig> = {
  BRONZE: {
    name: "Bronze",
    color: "bg-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    textColor: "text-amber-700 dark:text-amber-400"
  },
  SILVER: {
    name: "Silver",
    color: "bg-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    textColor: "text-gray-700 dark:text-gray-400"
  },
  GOLD: {
    name: "Gold",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    textColor: "text-yellow-700 dark:text-yellow-400"
  }
}

export function OverallProgressDisplay() {
  const { data: progress, isLoading, error } = useJobReadinessProgress()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading progress data</p>
        </CardContent>
      </Card>
    )
  }

  const currentStars = progress?.currentStars || 0
  const currentTier = progress?.currentTier || 'BRONZE'
  const tierConfig = tierConfigs[currentTier]

  return (
    <Card className={cn("border-2", tierConfig.bgColor)}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-3">
          <span>Your Progress</span>
          <Badge variant="secondary" className={cn("text-sm", tierConfig.textColor, tierConfig.color)}>
            {tierConfig.name} Tier
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 5-Star Display */}
        <div className="flex justify-center items-center gap-3">
          {[1, 2, 3, 4, 5].map((starNumber) => {
            const isEarned = starNumber <= currentStars
            return (
              <div key={starNumber} className="relative">
                <Star
                  className={cn(
                    "w-12 h-12 transition-all duration-300",
                    isEarned
                      ? `fill-current ${tierConfig.textColor} ${tierConfig.color}`
                      : "text-gray-300 dark:text-gray-600"
                  )}
                />
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                  {starNumber}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress Text */}
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold">
            {currentStars} of 5 Stars Earned
          </p>
          <p className="text-muted-foreground">
            {currentStars === 0 && "Start your journey by completing the initial assessments"}
            {currentStars === 1 && "Great start! Continue with the courses to earn your second star"}
            {currentStars === 2 && "Excellent progress! Watch expert sessions to earn your third star"}
            {currentStars === 3 && "You're halfway there! Complete a real-world project for your fourth star"}
            {currentStars === 4 && "Almost done! Finish the interview simulation to earn your final star"}
            {currentStars === 5 && "Congratulations! You've completed the Job Readiness program"}
          </p>
        </div>

        {/* Next Steps */}
        {currentStars < 5 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Next: {getNextStepText(currentStars)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getNextStepText(currentStars: number): string {
  switch (currentStars) {
    case 0:
      return "Complete Initial Assessments"
    case 1:
      return "Complete Course Modules"
    case 2:
      return "Watch 5 Expert Sessions"
    case 3:
      return "Complete AI-Generated Project"
    case 4:
      return "Complete Interview Simulation"
    default:
      return "Program Complete!"
  }
}