"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Activity {
  id: string
  user: {
    name: string
    avatar: string
    initials: string
  }
  action: string
  target: string
  time: string
}

const activities: Activity[] = [
  {
    id: "1",
    user: {
      name: "Sarah Johnson",
      avatar: "/placeholder-user.jpg",
      initials: "SJ",
    },
    action: "completed",
    target: "Advanced JavaScript Module",
    time: "2 minutes ago",
  },
  {
    id: "2",
    user: {
      name: "Michael Chen",
      avatar: "/placeholder-user.jpg",
      initials: "MC",
    },
    action: "created",
    target: "React Fundamentals Assessment",
    time: "1 hour ago",
  },
  {
    id: "3",
    user: {
      name: "Emily Rodriguez",
      avatar: "/placeholder-user.jpg",
      initials: "ER",
    },
    action: "updated",
    target: "Data Science Course",
    time: "3 hours ago",
  },
  {
    id: "4",
    user: {
      name: "David Kim",
      avatar: "/placeholder-user.jpg",
      initials: "DK",
    },
    action: "enrolled in",
    target: "UX Design Principles",
    time: "5 hours ago",
  },
  {
    id: "5",
    user: {
      name: "Lisa Wang",
      avatar: "/placeholder-user.jpg",
      initials: "LW",
    },
    action: "published",
    target: "Cloud Computing Essentials",
    time: "Yesterday",
  },
]

export function RecentActivity() {
  return (
    <div className="space-y-8">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
            <AvatarFallback>{activity.user.initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">
              {activity.user.name} <span className="text-muted-foreground">{activity.action}</span> {activity.target}
            </p>
            <p className="text-xs text-muted-foreground">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
