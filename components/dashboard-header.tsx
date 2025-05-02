"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, BookOpen, Moon, Search, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationCenter } from "@/components/notification-center"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

export function DashboardHeader() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // useEffect only runs on the client, so we only show the theme toggle after mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 dark:border-primary/20 dark:bg-background/95 dark:backdrop-blur-md">
      <div className="flex items-center gap-2 font-semibold">
        <BookOpen className="h-6 w-6" />
        <span>Upskill Admin</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="dark:hover:text-primary"
        >
          {mounted ? (
            theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
          ) : (
            <div className="h-5 w-5" /> // Renders an empty div during SSR
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative dark:hover:text-primary"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
          <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-600 dark:bg-primary"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-user.jpg" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/auth/logout" className="flex w-full">
                Log out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
    </header>
  )
}
