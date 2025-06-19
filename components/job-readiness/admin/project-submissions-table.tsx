"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, FileText, Download, User, ExternalLink, RotateCcw, Star, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { JrDataTable } from "./shared/jr-data-table"
import { ProjectContentViewer } from "./project-content-viewer"
import { ProjectAIFeedbackDisplay } from "./project-ai-feedback-display"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  JrSubmissionsFilters,
  formatSubmissionDate,
} from "@/lib/api/job-readiness/submissions"

interface ProjectSubmissionsTableProps {
  projects: any[]
  isLoading?: boolean
  onViewContent: (submission: any) => void
  onViewDetails: (submission: any) => void
  onRegrade: (submission: any) => void
  onRefresh?: () => void
  filters: JrSubmissionsFilters
  onFiltersChange: (filters: JrSubmissionsFilters) => void
  products?: { id: string; name: string }[]
  clients?: { id: string; name: string }[]
}

export function ProjectSubmissionsTable({
  projects,
  isLoading = false,
  onViewDetails,
  onRegrade,
  filters,
  onFiltersChange,
  products = [],
}: ProjectSubmissionsTableProps) {
  // State for project content viewer
  const [contentViewerOpen, setContentViewerOpen] = React.useState(false)
  const [selectedContentSubmission, setSelectedContentSubmission] = React.useState<any>(null)
  
  // State for AI feedback modal
  const [aiFeedbackOpen, setAIFeedbackOpen] = React.useState(false)
  const [selectedAIFeedbackSubmission, setSelectedAIFeedbackSubmission] = React.useState<any>(null)

  // Handlers for new components
  const handleViewContent = (submission: any) => {
    setSelectedContentSubmission(submission)
    setContentViewerOpen(true)
  }

  const handleRegrade = (submission: any) => {
    onRegrade(submission)
  }
  
  const handleViewAIFeedback = (submission: any) => {
    setSelectedAIFeedbackSubmission(submission)
    setAIFeedbackOpen(true)
  }
  
  const formatStudentName = (student?: { first_name: string; last_name: string; full_name: string; email: string }) => {
    if (!student) return "Unknown Student"
    return student.full_name || `${student.first_name} ${student.last_name}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return { variant: "secondary", color: "text-gray-600", icon: <FileText className="h-3 w-3" /> }
      case 'submitted':
        return { variant: "default", color: "text-blue-600", icon: <FileText className="h-3 w-3" /> }
      case 'graded':
        return { variant: "default", color: "text-green-600", icon: <Star className="h-3 w-3" /> }
      default:
        return { variant: "outline", color: "text-gray-600", icon: null }
    }
  }

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return { variant: "default", color: "text-green-600", bgColor: "bg-green-50" }
    } else if (score >= 50) {
      return { variant: "secondary", color: "text-yellow-600", bgColor: "bg-yellow-50" }
    } else {
      return { variant: "destructive", color: "text-red-600", bgColor: "bg-red-50" }
    }
  }

  const getSubmissionTypeDisplay = (submission: any) => {
    if (submission.submission_url) {
      return { type: "URL", icon: <ExternalLink className="h-3 w-3" />, color: "text-blue-600" }
    } else if (submission.submission_content) {
      return { type: "Text", icon: <FileText className="h-3 w-3" />, color: "text-green-600" }
    } else {
      return { type: "File", icon: <Download className="h-3 w-3" />, color: "text-purple-600" }
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const submission = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {formatStudentName(submission.student)}
            </div>
            <div className="text-sm text-muted-foreground">
              {submission.student?.email || "No email"}
            </div>
            {submission.student?.background_type && (
              <Badge variant="outline" className="text-xs">
                {submission.student.background_type} Background
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "project_details",
      header: "Project",
      cell: ({ row }) => {
        const submission = row.original
        return (
          <div className="max-w-xs">
            <div className="font-medium text-sm">
              {submission.project_title || `${submission.project_type} Project`}
            </div>
            <div className="text-xs text-muted-foreground">
              Type: {submission.project_type || "Unknown"}
            </div>
            <div className="text-xs text-muted-foreground">
              Background: {submission.background_type || "Unknown"}
            </div>
            {submission.task_count > 0 && (
              <div className="text-xs text-blue-600">
                {submission.task_count} tasks
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "submission_info",
      header: "Submission",
      cell: ({ row }) => {
        const submission = row.original
        const submissionType = getSubmissionTypeDisplay(submission)
        return (
          <div className="space-y-1">
            <div className={`flex items-center gap-1 text-sm ${submissionType.color}`}>
              {submissionType.icon}
              {submissionType.type}
            </div>
            {submission.content_size_category && (
              <Badge variant="outline" className="text-xs">
                {submission.content_size_category} content
              </Badge>
            )}
            {submission.content_truncated && (
              <div className="text-xs text-orange-600">
                Content truncated
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const badge = getStatusBadge(status)
        return (
          <div className="space-y-1">
            <Badge variant={badge.variant as any} className={`text-xs ${badge.color} flex items-center gap-1 w-fit`}>
              {badge.icon}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {formatSubmissionDate(row.original.created_at)}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => {
        const submission = row.original
        const score = submission.score
        
        if (score === null || score === undefined) {
          return (
            <div className="text-sm text-muted-foreground">
              Not graded
            </div>
          )
        }
        
        const badge = getScoreBadge(score)
        return (
          <div className="space-y-1">
            <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${badge.bgColor} ${badge.color}`}>
              {score}%
            </div>
            <div className="text-xs text-muted-foreground">
              {submission.passed ? "Passed" : "Failed"}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "ai_analysis",
      header: "AI Analysis",
      cell: ({ row }) => {
        const submission = row.original
        const hasFeedback = submission.feedback && submission.feedback.trim()
        
        if (!hasFeedback) {
          return (
            <div className="text-xs text-muted-foreground">
              No feedback
            </div>
          )
        }

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewAIFeedback(submission)}
            className="h-8 px-3 text-xs"
          >
            <Brain className="h-3 w-3 mr-1" />
            View Feedback
          </Button>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const submission = row.original
        const hasUrl = submission.has_url || !!submission.submission_url

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => handleViewContent(submission)}>
                <FileText className="mr-2 h-4 w-4" />
                View Project Content
              </DropdownMenuItem>
              
              {hasUrl && (
                <DropdownMenuItem onClick={() => window.open(submission.submission_url, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open URL
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => onViewDetails(submission)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              
              {submission.status === 'graded' && (
                <DropdownMenuItem onClick={() => handleRegrade(submission)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Re-grade Project
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(submission.id)}
              >
                <Download className="mr-2 h-4 w-4" />
                Copy Submission ID
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onViewDetails(submission)}>
                <User className="mr-2 h-4 w-4" />
                View Student Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const renderFilters = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      <div className="flex-1">
        <Input
          placeholder="Search students or projects..."
          value={filters.search || ""}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value, page: 1 })}
          className="max-w-sm"
        />
      </div>
      
      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value === "all" ? undefined : value, page: 1 })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="submitted">Submitted</SelectItem>
          <SelectItem value="graded">Graded</SelectItem>
        </SelectContent>
      </Select>
      
      {products.length > 0 && (
        <Select
          value={filters.productId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, productId: value === "all" ? undefined : value, page: 1 })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )

  return (
    <>
      <div className="space-y-4">
        {renderFilters()}
        <JrDataTable
          columns={columns}
          data={projects}
          isLoading={isLoading}
          hideSearch={true}
        />
      </div>

      {/* Project Content Viewer Dialog */}
      <ProjectContentViewer
        submission={selectedContentSubmission}
        open={contentViewerOpen}
        onOpenChange={setContentViewerOpen}
        onRegrade={handleRegrade}
      />

      {/* AI Feedback Modal */}
      <Dialog open={aiFeedbackOpen} onOpenChange={setAIFeedbackOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Feedback Analysis
            </DialogTitle>
            <DialogDescription>
              Detailed AI analysis and feedback for this project submission
            </DialogDescription>
          </DialogHeader>
          {selectedAIFeedbackSubmission?.feedback && (
            <ProjectAIFeedbackDisplay feedback={selectedAIFeedbackSubmission.feedback} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 