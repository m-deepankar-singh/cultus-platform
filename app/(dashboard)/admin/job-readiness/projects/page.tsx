import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layers } from "lucide-react"
import Link from "next/link"

export default function JobReadinessProjectsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Project Configurations
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of all configured AI project generation rules and settings.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/job-readiness/backgrounds">
            Configure Projects
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Project Generation Overview</CardTitle>
          <CardDescription>
            Review all configured project generation rules across different backgrounds and tiers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No project configurations found</h3>
              <p className="text-muted-foreground mb-4">
                Project configurations are managed through Background settings. Set up backgrounds first to see project rules here.
              </p>
              <Button asChild>
                <Link href="/admin/job-readiness/backgrounds">
                  Configure Backgrounds & Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 