"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, GraduationCap, Award, Settings, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AppHeader() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/app/dashboard",
      label: "My Learning",
      icon: Home,
      active: pathname === "/app/dashboard",
    },
    {
      href: "/app/courses",
      label: "Courses",
      icon: BookOpen,
      active: pathname?.startsWith("/app/courses"),
    },
    {
      href: "/app/assessments",
      label: "Assessments",
      icon: Award,
      active: pathname?.startsWith("/app/assessments"),
    },
    {
      href: "/app/profile",
      label: "My Profile",
      icon: GraduationCap,
      active: pathname === "/app/profile",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="md:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
                      route.active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
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
        <Link href="/app/dashboard" className="flex items-center gap-2 mr-6">
          <span className="font-bold text-xl">EduLearn</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-1 font-medium transition-colors hover:text-foreground",
                route.active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt="User" />
                  <AvatarFallback>ST</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              <DropdownMenuItem asChild>
                <Link href="/auth/logout">Log out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}