import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  BarChart3,
  BookOpen,
  Briefcase,
  FileQuestion,
  GraduationCap,
  Layers,
  Package,
  Users,
} from "lucide-react"

interface Section {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count: string;
  status?: string;
}

export default function JobReadinessOverviewPage() {
  const sections: Section[] = [
    {
      title: "Products",
      description: "Manage Job Readiness products and tier configurations",
      href: "/admin/job-readiness/products",
      icon: Package,
      count: "Active products",
    },
    {
      title: "Backgrounds",
      description: "Configure student backgrounds and project settings",
      href: "/admin/job-readiness/backgrounds",
      icon: Users,
      count: "Background types",
    },
    {
      title: "Assessments",
      description: "Manage assessment configurations for tier determination",
      href: "/admin/job-readiness/assessments",
      icon: FileQuestion,
      count: "Assessment configs",
    },
    {
      title: "Courses",
      description: "Configure AI quiz settings for JR courses",
      href: "/admin/job-readiness/courses",
      icon: BookOpen,
      count: "Course configs",
    },
    {
      title: "Expert Sessions",
      description: "Upload and manage expert session videos",
      href: "/admin/job-readiness/expert-sessions",
      icon: GraduationCap,
      count: "Active sessions",
    },
    {
      title: "Projects",
      description: "Overview of AI project generation configurations",
      href: "/admin/job-readiness/projects",
      icon: Layers,
      count: "Project configs",
    },
    {
      title: "Submissions Review",
      description: "Review student interview and project submissions",
      href: "/admin/job-readiness/submissions",
      icon: FileQuestion,
      count: "Pending reviews",
    },
    {
      title: "Student Progress",
      description: "Monitor and manage student progress in JR products",
      href: "/admin/job-readiness/progress",
      icon: BarChart3,
      count: "Active students",
    },
    {
      title: "Promotion Exams",
      description: "Configure promotion exam settings and view attempts",
      href: "/admin/job-readiness/promotion-exams",
      icon: GraduationCap,
      count: "Exam configs",
    },
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          Job Readiness Administration
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage all aspects of the Job Readiness product including configurations, student progress, and submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Card key={section.href} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <section.icon className="h-6 w-6 text-primary" />
                {section.status && (
                  <Badge variant="secondary">{section.status}</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{section.count}</span>
                <Button 
                  asChild 
                  variant={section.status ? "secondary" : "default"}
                  disabled={!!section.status}
                >
                  <Link href={section.href}>
                    {section.status ? "Coming Soon" : "Manage"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 