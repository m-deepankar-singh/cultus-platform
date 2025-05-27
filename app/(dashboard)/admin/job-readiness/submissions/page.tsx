"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Video, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw 
} from "lucide-react"
import { JrSubmissionsTable } from "@/components/job-readiness/admin/jr-submissions-table"
import { JrManualReviewForm } from "@/components/job-readiness/admin/jr-manual-review-form"
import {
  JrSubmission,
  JrSubmissionsFilters,
  JrSubmissionsResponse,
  getJrSubmissions,
  requiresManualReview,
} from "@/lib/api/job-readiness/submissions"
import { getJrProducts } from "@/lib/api/job-readiness/products"
import { useToast } from "@/hooks/use-toast"

interface StatsCard {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  color: string
}

export default function SubmissionsPage() {
  const { toast } = useToast()
  
  // State management
  const [submissions, setSubmissions] = React.useState<JrSubmission[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState<JrSubmissionsFilters>({
    page: 1,
    pageSize: 50,
  })
  
  // Available options for filters
  const [products, setProducts] = React.useState<{ id: string; name: string }[]>([])
  
  // Review modal state
  const [selectedSubmission, setSelectedSubmission] = React.useState<JrSubmission | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false)

  // Load products for filter options
  React.useEffect(() => {
    const loadProducts = async () => {
      try {
                 const data = await getJrProducts()
         setProducts(data.map((p) => ({ id: p.id, name: p.name })))
      } catch (error) {
        console.error("Failed to load products:", error)
      }
    }
    
    loadProducts()
  }, [])

  // Load submissions
  const loadSubmissions = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data: JrSubmissionsResponse = await getJrSubmissions(filters)
      setSubmissions(data.submissions || [])
    } catch (error) {
      console.error("Failed to load submissions:", error)
      setError(error instanceof Error ? error.message : "Failed to load submissions")
      toast({
        title: "Error",
        description: "Failed to load submissions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, toast])

  // Load data on mount and filter changes
  React.useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  // Handle manual review
  const handleReviewSubmission = (submission: JrSubmission) => {
    setSelectedSubmission(submission)
    setIsReviewModalOpen(true)
  }

  // Handle view details (placeholder for now)
  const handleViewDetails = (submission: JrSubmission) => {
    toast({
      title: "View Details",
      description: `Opening details for submission ${submission.id}`,
    })
    // TODO: Implement detailed view modal or navigate to details page
  }

  // Handle review success
  const handleReviewSuccess = () => {
    setSelectedSubmission(null)
    loadSubmissions() // Refresh the data
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalSubmissions = submissions.length
    const projectSubmissions = submissions.filter(s => s.submission_type === "project").length
    const interviewSubmissions = submissions.filter(s => s.submission_type === "interview").length
    const pendingReviews = submissions.filter(s => requiresManualReview(s)).length
    const approvedSubmissions = submissions.filter(s => s.manual_review_status === "approved").length
    const rejectedSubmissions = submissions.filter(s => s.manual_review_status === "rejected").length

    const statsCards: StatsCard[] = [
      {
        title: "Total Submissions",
        value: totalSubmissions,
        description: `${projectSubmissions} projects, ${interviewSubmissions} interviews`,
        icon: <FileText className="h-4 w-4" />,
        color: "text-blue-600",
      },
      {
        title: "Pending Reviews",
        value: pendingReviews,
        description: "Interviews awaiting manual review",
        icon: <Clock className="h-4 w-4" />,
        color: "text-orange-600",
      },
      {
        title: "Approved",
        value: approvedSubmissions,
        description: "Successfully reviewed submissions",
        icon: <CheckCircle className="h-4 w-4" />,
        color: "text-green-600",
      },
      {
        title: "Rejected",
        value: rejectedSubmissions,
        description: "Submissions requiring improvement",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-red-600",
      },
    ]

    return statsCards
  }, [submissions])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interview & Project Submissions</h1>
          <p className="text-muted-foreground">
            Review and manage student submissions for Job Readiness products
          </p>
        </div>
        <Button onClick={loadSubmissions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={stat.color}>{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {(stats.find(s => s.title === "Pending Reviews")?.value || 0) > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
                             You have {stats.find(s => s.title === "Pending Reviews")?.value || 0} interview submissions requiring manual review.
            </span>
            <Button
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                submissionType: "interview", 
                reviewStatus: "pending" 
              }))}
            >
              Review Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            All student submissions for projects and interviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JrSubmissionsTable
            submissions={submissions}
            isLoading={isLoading}
            onReviewSubmission={handleReviewSubmission}
            onViewDetails={handleViewDetails}
            onRefresh={loadSubmissions}
            filters={filters}
            onFiltersChange={setFilters}
            products={products}
          />
        </CardContent>
      </Card>

      {/* Empty State */}
      {!isLoading && submissions.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Submissions Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {Object.keys(filters).length > 2 
                ? "No submissions match your current filters. Try adjusting your search criteria."
                : "No student submissions have been made yet. Submissions will appear here once students complete their projects or interviews."
              }
            </p>
            {Object.keys(filters).length > 2 && (
              <Button
                variant="outline"
                onClick={() => setFilters({ page: 1, pageSize: 50 })}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Review Modal */}
      <JrManualReviewForm
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        submission={selectedSubmission}
        onSuccess={handleReviewSuccess}
      />
    </div>
  )
} 