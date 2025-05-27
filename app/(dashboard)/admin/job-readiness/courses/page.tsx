import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export default function JobReadinessCoursesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Course Configurations
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure AI quiz settings for courses that are part of Job Readiness products.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/modules?type=Course">
            View All Courses
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Quiz Configuration</CardTitle>
          <CardDescription>
            Configure AI quiz settings for Job Readiness courses including tier-based difficulty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses configured for Job Readiness</h3>
              <p className="text-muted-foreground mb-4">
                Configure AI quiz settings for courses that will be part of Job Readiness products.
              </p>
              <Button asChild>
                <Link href="/admin/modules?type=Course">
                  View All Courses
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 