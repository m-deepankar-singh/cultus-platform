"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, GraduationCap, Award, Settings, Menu, LucideIcon, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnimatedButton } from "@/components/ui/animated-button"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import gsap from "gsap"
import { useLogout } from "@/hooks/use-logout"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Define interface for route items
interface RouteItem {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
}

export function AppHeader() {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { logout } = useLogout()
  
  useEffect(() => {
    setMounted(true)
    
    if (theme === "dark") {
      // Animate header on mount
      gsap.fromTo(
        ".header-content",
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.1 }
      )
    }
  }, [theme])

  const routes: RouteItem[] = [
    {
      href: "/app/dashboard",
      label: "My Learning",
      icon: Home,
      active: pathname === "/app/dashboard",
    },
    {
      href: "/app/job-readiness",
      label: "Job Readiness",
      icon: Briefcase,
      active: pathname.startsWith("/app/job-readiness"),
    },
  ]

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60",
      mounted && theme === "dark" && "bg-black/20 border-primary/10 dark-glow"
    )}>
      <div className="container flex h-14 items-center header-content">
        <div className="md:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              {mounted && theme === "dark" ? (
                <AnimatedButton variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </AnimatedButton>
              ) : (
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              )}
            </SheetTrigger>
            <SheetContent side="left" className={cn(
              "w-[240px] sm:w-[300px]",
              mounted && theme === "dark" && "glass-effect"
            )}>
              <nav className="flex flex-col gap-4 mt-8">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-300",
                      route.active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                      mounted && theme === "dark" && route.active && "dark-glow"
                    )}
                  >
                    <route.icon className="h-4 w-4" />
                    {route.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <Link href="/app/dashboard" className="flex items-center gap-2 mr-6 header-content">
          <span className={cn(
            "font-bold text-xl",
            mounted && theme === "dark" && "gradient-text"
          )}>EduLearn</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm header-content">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-1 font-medium transition-colors hover:text-foreground",
                route.active ? "text-foreground" : "text-muted-foreground",
                mounted && theme === "dark" && route.active && "animate-pulse-glow px-3 py-1 rounded-md"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 header-content">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {mounted && theme === "dark" ? (
                <AnimatedButton variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                </AnimatedButton>
              ) : (
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="User" />
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={mounted && theme === "dark" ? "glass-effect" : ""}>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/profile">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Help Center</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout('student')}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}