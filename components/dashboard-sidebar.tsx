"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ChevronDown,
  Database,
  FileQuestion,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSidebar } from "@/components/sidebar-provider"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  submenu?: NavItem[]
  role?: string[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    role: ["admin", "staff", "viewer", "client_staff"],
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    role: ["admin", "staff"],
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Building2,
    role: ["admin", "staff"],
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    role: ["admin", "staff", "viewer", "client_staff"],
  },
  {
    title: "Modules",
    href: "/modules",
    icon: Layers,
    role: ["admin", "staff"],
  },
  {
    title: "Learners",
    href: "/learners",
    icon: GraduationCap,
    role: ["admin", "staff"],
  },
  {
    title: "Question Banks",
    href: "/question-banks",
    icon: FileQuestion,
    role: ["admin", "staff"],
  },
  {
    title: "Job Readiness",
    href: "/admin/job-readiness",
    icon: Briefcase,
    role: ["admin"],
    submenu: [
      {
        title: "Products",
        href: "/admin/job-readiness/products",
        icon: Package,
        role: ["admin"],
      },
      {
        title: "Backgrounds",
        href: "/admin/job-readiness/backgrounds",
        icon: Users,
        role: ["admin"],
      },
      {
        title: "Assessments",
        href: "/admin/job-readiness/assessments",
        icon: FileQuestion,
        role: ["admin"],
      },
      {
        title: "Courses",
        href: "/admin/job-readiness/courses",
        icon: BookOpen,
        role: ["admin"],
      },
      {
        title: "Expert Sessions",
        href: "/admin/job-readiness/expert-sessions",
        icon: GraduationCap,
        role: ["admin"],
      },
      {
        title: "Projects",
        href: "/admin/job-readiness/projects",
        icon: Layers,
        role: ["admin"],
      },
      {
        title: "Submissions Review",
        href: "/admin/job-readiness/submissions",
        icon: FileQuestion,
        role: ["admin"],
      },
      {
        title: "Student Progress",
        href: "/admin/job-readiness/progress",
        icon: BarChart3,
        role: ["admin"],
      },
      {
        title: "Promotion Exams",
        href: "/admin/job-readiness/promotion-exams",
        icon: GraduationCap,
        role: ["admin"],
      },
    ],
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    role: ["admin", "staff", "viewer", "client_staff"],
  },
  {
    title: "Security",
    href: "/admin/security",
    icon: Shield,
    role: ["admin"],
    submenu: [
      {
        title: "Dashboard",
        href: "/admin/security/dashboard",
        icon: BarChart3,
        role: ["admin"],
      },
      {
        title: "Event Log",
        href: "/admin/security/events",
        icon: FileQuestion,
        role: ["admin"],
      },
      {
        title: "Alerts",
        href: "/admin/security/alerts",
        icon: Shield,
        role: ["admin"],
      },
    ],
  },
  {
    title: "Cache Management",
    href: "/admin/cache",
    icon: Database,
    role: ["admin"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    role: ["admin"],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebar()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Mock user role - in a real app, this would come from auth
  const userRole = "admin"

  const toggleSubmenu = (title: string) => {
    setOpenSubmenu(openSubmenu === title ? null : title)
  }

  const filteredNavItems = navItems.filter((item) => !item.role || item.role.includes(userRole))

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Button variant="ghost" size="icon" className="ml-auto md:flex" onClick={() => setIsOpen(!isOpen)}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>
      {/* Wrap main nav in flex-1 container */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full py-2">
          <nav className="grid gap-1 px-2">
            {/* Filter out the settings item from the main list */}
            {filteredNavItems
              .filter((item) => item.href !== "/settings")
              .map((item, index) => (
                <div key={index}>
                  {item.submenu ? (
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start",
                          isOpen ? "px-4" : "px-2",
                          pathname.startsWith(item.href) && "bg-muted",
                        )}
                        onClick={() => toggleSubmenu(item.title)}
                      >
                        <item.icon className={cn("h-5 w-5", isOpen ? "mr-2" : "mx-auto")} />
                        {isOpen && (
                          <>
                            <span>{item.title}</span>
                            <ChevronDown
                              className={cn(
                                "ml-auto h-4 w-4 transition-transform",
                                openSubmenu === item.title && "rotate-180",
                              )}
                            />
                          </>
                        )}
                      </Button>
                      {isOpen && openSubmenu === item.title && (
                        <div className="ml-4 space-y-1">
                          {item.submenu
                            .filter((subitem) => !subitem.role || subitem.role.includes(userRole))
                            .map((subitem, subindex) => (
                              <Button
                                key={subindex}
                                variant="ghost"
                                asChild
                                className={cn("w-full justify-start px-4", pathname === subitem.href && "bg-muted")}
                              >
                                <Link href={subitem.href}>
                                  <subitem.icon className="mr-2 h-5 w-5" />
                                  <span>{subitem.title}</span>
                                </Link>
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      asChild
                      className={cn("w-full justify-start", isOpen ? "px-4" : "px-2", pathname === item.href && "bg-muted")}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("h-5 w-5", isOpen ? "mr-2" : "mx-auto")} />
                        {isOpen && <span>{item.title}</span>}
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Container for bottom items */}
      <div className="mt-auto border-t p-2">
        <nav className="grid gap-1">
          {/* Find and render the settings item */}
          {filteredNavItems
            .filter((item) => item.href === "/settings")
            .map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                asChild
                className={cn("w-full justify-start", isOpen ? "px-4" : "px-2", pathname === item.href && "bg-muted")}
              >
                <Link href={item.href}>
                  <item.icon className={cn("h-5 w-5", isOpen ? "mr-2" : "mx-auto")} />
                  {isOpen && <span>{item.title}</span>}
                </Link>
              </Button>
            ))}
        </nav>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn("hidden h-full border-r bg-background md:block", isOpen ? "w-64" : "w-16", "transition-all duration-300 ease-in-out")}>
        {SidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2 mt-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
