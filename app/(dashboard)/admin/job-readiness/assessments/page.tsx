import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"
import Link from "next/link"

export default function JobReadinessAssessmentsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileQuestion className="h-8 w-8" />
            Assessment Configurations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage assessment configurations for tier determination in Job Readiness products.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/modules?type=Assessment">
            View All Assessments
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tier Determination Assessments</CardTitle>
          <CardDescription>
            Configure which assessments are used for initial tier determination and set score thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Assessment configurations managed via products</h3>
              <p className="text-muted-foreground mb-4">
                Assessment-to-product mappings and tier score ranges are configured in the Products section.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <Link href="/admin/job-readiness/products">
                    Configure in Products
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/modules?type=Assessment">
                    View All Assessments
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 