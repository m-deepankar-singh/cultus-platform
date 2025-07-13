"use client"

import { useState, useEffect } from "react"
import { BookOpen, Moon, Sun, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useLogout } from "@/hooks/use-logout"

export function DashboardHeader() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { logout } = useLogout()

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


        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => logout('admin')}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  )
}
