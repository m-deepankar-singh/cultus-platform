"use client"

import { useState, useEffect } from "react"
import { Star, Trophy, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card"
import { cn } from "@/lib/utils"
import { useJobReadinessProgress } from "@/hooks/useJobReadinessProgress"

interface TierConfig {
  name: string
  bgColor: string
  textColor: string
  starColor: string
  starGradient: string
}

const tierConfigs: Record<string, TierConfig> = {
  BRONZE: {
    name: "Bronze",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    textColor: "text-orange-800 dark:text-orange-300",
    starColor: "text-orange-500",
    starGradient: "from-orange-400 to-orange-600"
  },
  SILVER: {
    name: "Silver", 
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    textColor: "text-gray-800 dark:text-gray-300",
    starColor: "text-gray-500",
    starGradient: "from-gray-400 to-gray-600"
  },
  GOLD: {
    name: "Gold",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20", 
    textColor: "text-yellow-800 dark:text-yellow-300",
    starColor: "text-yellow-500",
    starGradient: "from-yellow-400 to-yellow-600"
  }
}

export function OverallProgressDisplay() {
  const { data: progress, isLoading, error } = useJobReadinessProgress()
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse flex items-center justify-center gap-4">
          <div className="h-6 bg-muted rounded w-32"></div>
          <div className="h-8 bg-muted rounded w-24"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Unable to load progress</p>
      </div>
    )
  }

  const currentTier = progress?.currentTier
  const currentStars = progress?.currentStars || 0
  const tierConfig = currentTier ? tierConfigs[currentTier] : null

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Title - Centered */}
        <h2 className="text-lg font-medium text-center mb-4">Your Progress</h2>
        
        {/* Progress and Tier Container - Centered layout */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          {/* Universal 5-Star System */}
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 5 }, (_, index) => {
              const starNumber = index + 1
              const isEarned = starNumber <= currentStars
              const starColor = tierConfig?.starColor || "text-yellow-500"
              return (
                <div 
                  key={index}
                  className="relative w-7 h-7 sm:w-8 sm:h-8"
                >
                  <Star 
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 transition-all duration-300",
                      isEarned 
                        ? `fill-current ${starColor} drop-shadow-lg` 
                        : "text-muted-foreground"
                    )}
                    style={{
                      filter: isEarned ? 'drop-shadow(0 0 6px currentColor) brightness(1.2)' : 'none'
                    }}
                  />
                </div>
              )
            })}
          </div>
          
          {/* Tier Badge */}
          {currentTier && tierConfig ? (
            <Badge 
              variant="secondary"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base font-medium",
                tierConfig.bgColor,
                tierConfig.textColor,
                "border"
              )}
            >
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
              {tierConfig.name} Tier
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base">
              <Clock className="h-4 w-4" />
              No Tier Yet
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

