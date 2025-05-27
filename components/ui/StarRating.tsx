 "use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  currentStars: number
  totalStars?: number
  size?: "sm" | "md" | "lg"
  tier?: "BRONZE" | "SILVER" | "GOLD"
  showNumbers?: boolean
  className?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8"
}

const tierColors = {
  BRONZE: "text-amber-600 fill-amber-600",
  SILVER: "text-gray-400 fill-gray-400", 
  GOLD: "text-yellow-500 fill-yellow-500"
}

export function StarRating({ 
  currentStars, 
  totalStars = 5, 
  size = "md",
  tier = "BRONZE",
  showNumbers = false,
  className 
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: totalStars }).map((_, index) => {
        const starNumber = index + 1
        const isEarned = starNumber <= currentStars
        
        return (
          <div key={starNumber} className="relative">
            <Star
              className={cn(
                sizeClasses[size],
                "transition-all duration-300",
                isEarned
                  ? tierColors[tier]
                  : "text-gray-300 dark:text-gray-600"
              )}
            />
            {showNumbers && (
              <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                {starNumber}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}