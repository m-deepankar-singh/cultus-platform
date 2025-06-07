"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Video, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Monitor,
  FolderOpen
} from "lucide-react"
import { JrSubmissionsTable } from "@/components/job-readiness/admin/jr-submissions-table"
import { InterviewSubmissionsTable } from "@/components/job-readiness/admin/interview-submissions-table"
import { ProjectSubmissionsTable } from "@/components/job-readiness/admin/project-submissions-table"
import { JrManualReviewForm } from "@/components/job-readiness/admin/jr-manual-review-form"
import {
  JrSubmissionsFilters,
  JrSubmission,
  requiresManualReview,
} from "@/lib/api/job-readiness/submissions"
import { getJrProducts } from "@/lib/api/job-readiness/products"
import { useToast } from "@/hooks/use-toast"
import { useInterviewSubmissions, useRefreshInterviews } from "@/hooks/useInterviewSubmissions"
import { useProjectSubmissions, useRefreshProjects } from "@/hooks/useProjectSubmissions"

interface StatsCard {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  color: string
}

export default function SubmissionsPage() {
  const { toast } = useToast()
  
  // Tab state
  const [activeTab, setActiveTab] = React.useState<"interviews" | "projects">("interviews")
  
  // Filter state
  const [interviewFilters, setInterviewFilters] = React.useState<JrSubmissionsFilters>({
    page: 1,
    pageSize: 50,
    submissionType: "interview",
  })
  
  const [projectFilters, setProjectFilters] = React.useState<JrSubmissionsFilters>({
    page: 1,
    pageSize: 50,
    submissionType: "project",
  })
  
  // React Query hooks for data fetching
  const {
    data: interviewsData,
    isLoading: interviewsLoading,
    error: interviewsError,
    refetch: refetchInterviews
  } = useInterviewSubmissions(interviewFilters)
  
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useProjectSubmissions(projectFilters)
  
  // Extract submissions from React Query responses
  const interviews = interviewsData?.submissions || []
  const projects = projectsData?.submissions || []
  
  // Refresh hooks
  const refreshInterviews = useRefreshInterviews()
  const refreshProjects = useRefreshProjects()
  
  // Available options for filters
  const [products, setProducts] = React.useState<{ id: string; name: string }[]>([])
  const [clients, setClients] = React.useState<{ id: string; name: string }[]>([])
  
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

  // Load clients for filter options
  React.useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await fetch('/api/admin/clients')
        if (response.ok) {
          const result = await response.json()
          // Handle paginated response structure
          const clientsData = result.data || result
          if (Array.isArray(clientsData)) {
            setClients(clientsData.map((c: any) => ({ id: c.id, name: c.name })))
          } else {
            console.error("Clients data is not an array:", clientsData)
          }
        }
      } catch (error) {
        console.error("Failed to load clients:", error)
      }
    }
    
    loadClients()
  }, [])

  // Error handling for React Query
  React.useEffect(() => {
    if (interviewsError) {
      toast({
        title: "Error",
        description: "Failed to load interview submissions. Please try again.",
        variant: "destructive",
      })
    }
  }, [interviewsError, toast])

  React.useEffect(() => {
    if (projectsError) {
      toast({
        title: "Error", 
        description: "Failed to load project submissions. Please try again.",
        variant: "destructive",
      })
    }
  }, [projectsError, toast])

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

  // Handle interview video viewing
  const handleViewVideo = (submission: any) => {
    toast({
      title: "View Video",
      description: `Opening video for submission ${submission.id}`,
    })
    // TODO: Implement video player modal
  }

  // Handle project content viewing
  const handleViewContent = (submission: any) => {
    toast({
      title: "View Content",
      description: `Opening content for submission ${submission.id}`,
    })
    // TODO: Implement content viewer modal
  }

  // Handle project re-grading
  const handleRegrade = (submission: any) => {
    toast({
      title: "Re-grade Project",
      description: `Re-grading submission ${submission.id}`,
    })
    // TODO: Implement re-grading functionality
  }

  // Handle review success
  const handleReviewSuccess = () => {
    setSelectedSubmission(null)
    // Refresh both interview and project data
    refreshInterviews()
    refreshProjects()
  }

  // Calculate statistics based on current tab
  const stats = React.useMemo(() => {
    const isInterviewTab = activeTab === "interviews"
    const currentSubmissions = isInterviewTab ? interviews : projects
    const totalSubmissions = currentSubmissions.length
    
    // Only count pending reviews for interviews
    const pendingReviews = isInterviewTab 
      ? currentSubmissions.filter(s => {
          try {
            return requiresManualReview(s)
          } catch {
            return false
          }
        }).length 
      : 0
    
    // Calculate approved/rejected based on submission type using any typing
    const currentItems = currentSubmissions as any[]
    const approvedSubmissions = currentItems.filter(s => {
      if (isInterviewTab) {
        return s.manual_review_status === "approved" || s.ai_verdict === "approved"
      } else {
        return s.passed === true
      }
    }).length
    
    const rejectedSubmissions = currentItems.filter(s => {
      if (isInterviewTab) {
        return s.manual_review_status === "rejected" || s.ai_verdict === "rejected"
      } else {
        return s.passed === false
      }
    }).length

    const statsCards: StatsCard[] = [
      {
        title: "Total Submissions",
        value: totalSubmissions,
        description: isInterviewTab ? "Interview submissions" : "Project submissions",
        icon: isInterviewTab ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />,
        color: "text-blue-600",
      },
      {
        title: "Pending Reviews",
        value: pendingReviews,
        description: isInterviewTab ? "Interviews awaiting manual review" : "No pending reviews for projects",
        icon: <Clock className="h-4 w-4" />,
        color: "text-orange-600",
      },
      {
        title: "Approved",
        value: approvedSubmissions,
        description: isInterviewTab ? "Approved by AI or admin" : "Projects that passed grading",
        icon: <CheckCircle className="h-4 w-4" />,
        color: "text-green-600",
      },
      {
        title: "Rejected",
        value: rejectedSubmissions,
        description: isInterviewTab ? "Rejected by AI or admin" : "Projects that failed grading",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-red-600",
      },
    ]

    return statsCards
  }, [activeTab, interviews, projects])

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
        <Button 
          onClick={() => {
            if (activeTab === "interviews") {
              refreshInterviews()
            } else {
              refreshProjects()
            }
          }} 
          variant="outline" 
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {(activeTab === "interviews" ? interviewsError?.message : projectsError?.message) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {activeTab === "interviews" ? interviewsError?.message : projectsError?.message}
          </AlertDescription>
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
      {activeTab === "interviews" && (stats.find(s => s.title === "Pending Reviews")?.value || 0) > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have {stats.find(s => s.title === "Pending Reviews")?.value || 0} interview submissions requiring manual review.
            </span>
            <Button
              size="sm"
              onClick={() => setInterviewFilters(prev => ({ 
                ...prev, 
                reviewStatus: "pending" 
              }))}
            >
              Review Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Submissions Interface */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "interviews" | "projects")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="interviews" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Interview Submissions
            {interviews.length > 0 && (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600">
                {interviews.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Project Submissions
            {projects.length > 0 && (
              <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                {projects.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Submissions</CardTitle>
              <CardDescription>
                Manage student interview submissions with video analysis and manual review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InterviewSubmissionsTable
                interviews={interviews}
                isLoading={interviewsLoading}
                onReviewSubmission={handleReviewSubmission}
                onViewVideo={handleViewVideo}
                onViewDetails={handleViewDetails}
                onRefresh={refreshInterviews}
                filters={interviewFilters}
                onFiltersChange={setInterviewFilters}
                clients={clients}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Submissions</CardTitle>
              <CardDescription>
                Review student project submissions with automatic grading and content analysis
              </CardDescription>
            </CardHeader>
                         <CardContent>
               <ProjectSubmissionsTable
                 projects={projects}
                 isLoading={projectsLoading}
                 onViewContent={handleViewContent}
                 onViewDetails={handleViewDetails}
                 onRegrade={handleRegrade}
                 onRefresh={refreshProjects}
                 filters={projectFilters}
                 onFiltersChange={setProjectFilters}
                 products={products}
               />
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty States are now handled within each tab content */}

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