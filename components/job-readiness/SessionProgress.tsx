"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Play, Target } from "lucide-react"

interface ExpertSession {
  id: string
  title: string
  description: string
  video_url: string
  video_duration: number
  created_at: string
  student_progress: {
    watch_time_seconds: number
    completion_percentage: number
    is_completed: boolean
    completed_at: string | null
  }
}

interface SessionProgressProps {
  session: ExpertSession
}

export function SessionProgress({ session }: SessionProgressProps) {
  const { student_progress } = session
  const completionThreshold = 100 // 100% threshold for completion
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getStatusInfo = () => {
    if (student_progress.is_completed) {
      return {
        icon: CheckCircle,
        label: "Completed",
        color: "text-green-600",
        bgColor: "bg-green-100",
        variant: "default" as const,
        badgeClass: "bg-green-500 text-white"
      }
    } else if (student_progress.completion_percentage > 0) {
      return {
        icon: Clock,
        label: `${student_progress.completion_percentage}% watched`,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        variant: "secondary" as const,
        badgeClass: "bg-blue-500 text-white"
      }
    } else {
      return {
        icon: Play,
        label: "Not started",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        variant: "outline" as const,
        badgeClass: "bg-gray-500 text-white"
      }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          Session Progress
          <Badge variant={statusInfo.variant} className={statusInfo.badgeClass}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Watch Progress</span>
            <span className="text-sm text-muted-foreground">
              {student_progress.completion_percentage}%
            </span>
          </div>
          <Progress 
            value={student_progress.completion_percentage} 
            className="h-3"
          />
        </div>

        {/* Progress Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className={`p-2 ${statusInfo.bgColor} rounded-full`}>
              <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <p className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-purple-100 rounded-full">
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Watch Time</p>
              <p className="text-sm text-muted-foreground">
                {formatDuration(student_progress.watch_time_seconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-orange-100 rounded-full">
              <Target className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Remaining</p>
              <p className="text-sm text-muted-foreground">
                {formatDuration(
                  Math.max(0, session.video_duration - student_progress.watch_time_seconds)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Completion Requirements */}
        {!student_progress.is_completed && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="text-sm font-medium mb-1">Completion Requirements</h4>
                <p className="text-sm text-muted-foreground">
                  Watch at least {completionThreshold}% of the video to mark this session as completed. 
                  You need to complete {Math.max(0, Math.ceil((completionThreshold - student_progress.completion_percentage) / 100 * session.video_duration))} more seconds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completion Celebration */}
        {student_progress.is_completed && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-1">
                  Session Completed! 🎉
                </h4>
                <p className="text-sm text-green-700">
                  Great job! You've successfully completed this expert session. 
                  Complete 5 sessions total to unlock your third star and access Projects.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 