"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, PlayCircle, Star } from "lucide-react"

interface OverallProgress {
  completed_sessions_count: number
  required_sessions: number
  progress_percentage: number
  third_star_unlocked: boolean
}

interface OverallSessionProgressProps {
  overallProgress: OverallProgress
}

export function OverallSessionProgress({ overallProgress }: OverallSessionProgressProps) {
  const {
    completed_sessions_count,
    required_sessions,
    progress_percentage,
    third_star_unlocked
  } = overallProgress

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Expert Sessions Progress
          {third_star_unlocked && (
            <Badge variant="default" className="bg-yellow-500 text-yellow-50">
              <Star className="h-3 w-3 mr-1" />
              Star 3 Unlocked!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Sessions Completed: {completed_sessions_count} of {required_sessions}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress_percentage}%
            </span>
          </div>
          <Progress value={progress_percentage} className="h-2" />
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completed_sessions_count}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-blue-100 rounded-full">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Remaining</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.max(0, required_sessions - completed_sessions_count)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{progress_percentage}%</p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center p-4 bg-muted rounded-lg">
          {third_star_unlocked ? (
            <p className="text-green-700 font-medium">
              🎉 Congratulations! You've completed all required expert sessions and unlocked Star 3!
            </p>
          ) : completed_sessions_count === 0 ? (
            <p className="text-muted-foreground">
              Start watching expert sessions to earn your third star. Complete {required_sessions} sessions to unlock the Projects module.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Great progress! Complete {required_sessions - completed_sessions_count} more sessions to unlock Star 3 and access Projects.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 