"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, CheckCircle2, Clock, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ExpertSessionProgress {
  watch_time_seconds: number
  completion_percentage: number
  is_completed: boolean
  completed_at: string | null
}

interface ExpertSession {
  id: string
  title: string
  description: string
  video_url: string
  video_duration: number
  created_at: string
  student_progress: ExpertSessionProgress
}

interface ExpertSessionListProps {
  sessions: ExpertSession[]
}

export function ExpertSessionList({ sessions }: ExpertSessionListProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Play className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Expert Sessions Available</h3>
              <p className="text-muted-foreground">
                Expert sessions will be available soon. Check back later!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Available Sessions</h2>
        <Badge variant="outline">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
        </Badge>
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <ExpertSessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  )
}

interface ExpertSessionCardProps {
  session: ExpertSession
}

function ExpertSessionCard({ session }: ExpertSessionCardProps) {
  const { student_progress } = session
  const isCompleted = student_progress.is_completed
  const completionPercentage = student_progress.completion_percentage

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Card className={`transition-all ${isCompleted ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className={`text-xl ${isCompleted ? 'text-gray-600' : ''}`}>
              {session.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {session.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <Badge variant="default" className="bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : completionPercentage > 0 ? (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {completionPercentage}% watched
              </Badge>
            ) : (
              <Badge variant="outline">
                <Play className="h-3 w-3 mr-1" />
                Not started
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {completionPercentage > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Session Details */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(session.video_duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Added {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Watch Progress Info */}
        {student_progress.watch_time_seconds > 0 && (
          <div className="text-sm text-muted-foreground">
            Watched: {formatDuration(student_progress.watch_time_seconds)} of {formatDuration(session.video_duration)}
            {isCompleted && student_progress.completed_at && (
              <span className="block mt-1">
                Completed {formatDistanceToNow(new Date(student_progress.completed_at), { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {isCompleted ? (
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline" 
                disabled
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Session Completed
              </Button>
              <p className="text-xs text-center text-gray-500">
                Completed sessions cannot be re-watched
              </p>
            </div>
          ) : (
            <Link href={`/app/job-readiness/expert-sessions/${session.id}`}>
              <Button className="w-full" variant="default">
                <Play className="h-4 w-4 mr-2" />
                {completionPercentage > 0 ? "Continue Watching" : "Start Watching"}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 