"use client"

import { useEffect, useRef } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface NotificationCenterProps {
  onClose: () => void
}

interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  type: "all" | "products" | "system"
}

const notifications: Notification[] = [
  {
    id: "1",
    title: "New Product Published",
    description: "The course 'Advanced Data Science' has been published.",
    time: "Just now",
    read: false,
    type: "products",
  },
  {
    id: "2",
    title: "New User Registered",
    description: "John Doe has registered as a new user.",
    time: "2 hours ago",
    read: false,
    type: "system",
  },
  {
    id: "3",
    title: "Module Updated",
    description: "The module 'Introduction to Python' has been updated.",
    time: "Yesterday",
    read: true,
    type: "products",
  },
  {
    id: "4",
    title: "System Maintenance",
    description: "Scheduled maintenance will occur on Sunday at 2 AM.",
    time: "2 days ago",
    read: true,
    type: "system",
  },
  {
    id: "5",
    title: "New Assessment Added",
    description: "A new assessment has been added to 'Web Development Basics'.",
    time: "3 days ago",
    read: true,
    type: "products",
  },
]

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div
      ref={ref}
      className="absolute right-4 top-14 z-50 w-80 rounded-md border bg-background shadow-md md:right-6 md:w-96"
    >
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {unreadCount} new
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <Tabs defaultValue="all">
        <div className="border-b px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="h-[400px]">
          <TabsContent value="all" className="m-0">
            <NotificationList notifications={notifications} filter="all" />
          </TabsContent>
          <TabsContent value="products" className="m-0">
            <NotificationList notifications={notifications} filter="products" />
          </TabsContent>
          <TabsContent value="system" className="m-0">
            <NotificationList notifications={notifications} filter="system" />
          </TabsContent>
        </ScrollArea>

        <div className="flex items-center justify-between border-t p-4">
          <Button variant="outline" size="sm">
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          <Button variant="link" size="sm">
            View all notifications
          </Button>
        </div>
      </Tabs>
    </div>
  )
}

function NotificationList({
  notifications,
  filter,
}: {
  notifications: Notification[]
  filter: "all" | "products" | "system"
}) {
  const filteredNotifications = filter === "all" ? notifications : notifications.filter((n) => n.type === filter)

  if (filteredNotifications.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {filteredNotifications.map((notification) => (
        <div key={notification.id} className={`p-4 ${notification.read ? "" : "bg-muted/50"}`}>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-medium">{notification.title}</h3>
            <span className="text-xs text-muted-foreground">{notification.time}</span>
          </div>
          <p className="text-sm text-muted-foreground">{notification.description}</p>
        </div>
      ))}
    </div>
  )
}
