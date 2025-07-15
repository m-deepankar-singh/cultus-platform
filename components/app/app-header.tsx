"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, Menu, LucideIcon, Briefcase, User, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { PerformantAnimatedCard } from "@/components/ui/performant-animated-card"
import { AnimatedButton } from "@/components/ui/animated-button"
import { OptimizedProgressRing } from "@/components/ui/optimized-progress-ring"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import gsap from "gsap"
import { useLogout } from "@/hooks/use-logout"
import { useCurrentUser } from "@/hooks/use-current-user"
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
  const { user, profile, isLoading } = useCurrentUser()
  
  useEffect(() => {
    setMounted(true)
    
    // Enhanced animations for all header elements
    gsap.fromTo(
      ".header-element",
      { y: -30, opacity: 0, scale: 0.9 },
      { 
        y: 0, 
        opacity: 1, 
        scale: 1,
        duration: 0.8, 
        ease: "power3.out", 
        stagger: 0.1,
        delay: 0.2
      }
    )
    
  }, [mounted])

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
    <PerformantAnimatedCard
      variant="glass"
      hoverEffect="glow"
      className="sticky top-0 z-50 w-full border-b-2 border-primary/20 backdrop-blur-xl bg-background/80 dark:bg-black/40 shadow-lg dark:shadow-primary/10"
      staggerIndex={0}
    >
      <div className="max-w-7xl mx-auto flex h-12 items-center justify-between px-6">
        {/* Left side - Mobile menu + Logo */}
        <div className="flex items-center gap-4">
          <div className="md:hidden header-element">
            <Sheet>
              <SheetTrigger asChild>
                <AnimatedButton 
                  variant="ghost" 
                  size="icon"
                  className="rounded-xl hover:bg-primary/10 transition-all duration-300"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </AnimatedButton>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-[280px] sm:w-[320px] bg-background/95 dark:bg-black/95 backdrop-blur-xl border-r-2 border-primary/20"
              >
                <div className="mt-8">
                  <PerformantAnimatedCard
                    variant="glass"
                    className="p-6 mb-6"
                  >
                    <h2 className="text-xl font-bold gradient-text mb-2">Navigation</h2>
                    <p className="text-sm text-muted-foreground">Choose your learning path</p>
                  </PerformantAnimatedCard>
                  
                  <nav className="space-y-3">
                    {routes.map((route, index) => (
                      <PerformantAnimatedCard
                        key={route.href}
                        variant="subtle"
                        hoverEffect="lift"
                        staggerIndex={index}
                        className={cn(
                          "transition-all duration-300",
                          route.active && "border-2 border-primary/50 bg-primary/10"
                        )}
                      >
                        <Link
                          href={route.href}
                          className="flex items-center gap-3 p-4 w-full"
                        >
                          <div className={cn(
                            "p-2 rounded-lg transition-all duration-300",
                            route.active 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            <route.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <span className={cn(
                              "font-medium transition-colors",
                              route.active ? "text-primary" : "text-foreground"
                            )}>
                              {route.label}
                            </span>
                          </div>
                          {route.active && (
                            <OptimizedProgressRing
                              value={100}
                              size={20}
                              color="primary"
                              showValue={false}
                            />
                          )}
                        </Link>
                      </PerformantAnimatedCard>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          <Link href="/app/dashboard" className="header-element">
            <Image
              src="/Cultus-white (1).png"
              alt="Cultus Platform"
              width={100}
              height={32}
              className="object-contain filter brightness-0 invert dark:filter-none"
              priority
            />
          </Link>
        </div>

        {/* Center - Navigation */}
        <nav className="hidden md:flex items-center gap-3 header-element absolute left-1/2 transform -translate-x-1/2">
          {routes.map((route, index) => (
            <div
              key={route.href}
              className="transition-all duration-300"
            >
              <Link
                href={route.href}
                className="flex items-center gap-2 px-3 py-1.5 font-medium transition-all duration-300 group"
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  route.active 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                )}>
                  <route.icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "transition-colors duration-300",
                  route.active 
                    ? "text-primary font-semibold" 
                    : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {route.label}
                </span>
                {route.active && (
                  <OptimizedProgressRing
                    value={100}
                    size={16}
                    color="primary"
                    showValue={false}
                    delay={300 + index * 100}
                  />
                )}
              </Link>
            </div>
          ))}
        </nav>
        
        {/* Right side - Theme toggle + User menu */}
        <div className="flex items-center gap-2 header-element">
          <PerformantAnimatedCard
            variant="glass"
            hoverEffect="glow"
            className="p-1 rounded-xl"
          >
            <ModeToggle />
          </PerformantAnimatedCard>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PerformantAnimatedCard
                variant="glass"
                hoverEffect="lift"
                className="p-2 rounded-full cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse"></div>
                </div>
              </PerformantAnimatedCard>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-background/95 dark:bg-black/95 backdrop-blur-xl border-2 border-primary/20 shadow-lg"
            >
              <PerformantAnimatedCard variant="subtle" className="m-1 p-3">
                <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {isLoading ? "Loading..." : profile?.fullName || user?.email || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">Student Portal</span>
                  </div>
                </DropdownMenuLabel>
              </PerformantAnimatedCard>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logout('student')}
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </PerformantAnimatedCard>
  )
}