"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, CheckCircle, XCircle, Clock, Play, Download, User, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useQuickVerdictMutation, useManualReviewMutation } from "@/hooks/useInterviewSubmissions"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { JrDataTable } from "./shared/jr-data-table"
import { InterviewVideoPlayer } from "./interview-video-player"
import { InterviewManualReviewEnhanced } from "./interview-manual-review-enhanced"
import {
  JrSubmission,
  JrSubmissionsFilters,
  formatSubmissionDate,
  requiresManualReview,
} from "@/lib/api/job-readiness/submissions"

// Quick Verdict Toggle Component
function QuickVerdictToggle({ 
  submission, 
  onVerdictChange 
}: { 
  submission: any
  onVerdictChange: (submissionId: string, verdict: 'approved' | 'rejected') => Promise<void>
}) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = React.useState(false)
  
  // Determine current verdict (admin override takes precedence over AI verdict)
  const currentVerdict = submission.admin_verdict_override || submission.ai_verdict
  const isApproved = currentVerdict === 'approved'
  const hasAdminOverride = !!submission.admin_verdict_override
  
  // Debug logging
  console.log('QuickVerdictToggle:', {
    submissionId: submission.id,
    aiVerdict: submission.ai_verdict,
    adminOverride: submission.admin_verdict_override,
    finalVerdict: submission.final_verdict,
    currentVerdict,
    isApproved,
    hasAdminOverride
  })
  
  const handleToggle = async (checked: boolean) => {
    const newVerdict = checked ? 'approved' : 'rejected'
    
    if (newVerdict === currentVerdict) return // No change needed
    
    setIsUpdating(true)
    try {
      await onVerdictChange(submission.id, newVerdict)
      toast({
        title: "Verdict Updated",
        description: `Interview ${newVerdict} successfully.`,
      })
    } catch (error) {
      console.error('Failed to update verdict:', error)
      toast({
        title: "Error",
        description: "Failed to update verdict. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md border">
        <Label htmlFor={`verdict-${submission.id}`} className="text-xs text-red-600 font-medium">
          Reject
        </Label>
        <Switch
          id={`verdict-${submission.id}`}
          checked={isApproved}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-400"
        />
        <Label htmlFor={`verdict-${submission.id}`} className="text-xs text-green-600 font-medium">
          Approve
        </Label>
      </div>
      {hasAdminOverride && (
        <Badge variant="outline" className="text-xs">
          Admin Override
        </Badge>
      )}
    </div>
  )
}

// AI Feedback Display Component
function AIFeedbackDisplay({ feedback }: { feedback: string | object }) {
  let parsedFeedback = null
  try {
    parsedFeedback = typeof feedback === 'string' ? JSON.parse(feedback) : feedback
  } catch (e) {
    return <div className="text-red-500">Error parsing AI feedback</div>
  }

  if (!parsedFeedback) {
    return <div className="text-muted-foreground">No AI feedback available</div>
  }

  const {
    communication_skills,
    technical_knowledge,
    problem_solving,
    confidence_and_presence,
    interview_engagement,
    areas_for_improvement,
    strengths,
    overall_assessment,
    final_verdict
  } = parsedFeedback

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      {overall_assessment && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Overall Assessment</h3>
          {overall_assessment.summary && (
            <div className="mb-3">
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Summary</h4>
              <p className="text-sm">{overall_assessment.summary}</p>
            </div>
          )}
          {overall_assessment.total_score && (
            <div className="mb-3">
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Total Score</h4>
              <div className="text-2xl font-bold">{overall_assessment.total_score}/100</div>
            </div>
          )}
        </div>
      )}

      {/* Final Verdict */}
      {final_verdict && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Final Verdict</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Decision</h4>
              <Badge variant={final_verdict.decision === 'APPROVED' ? 'default' : 'destructive'}>
                {final_verdict.decision}
              </Badge>
            </div>
            {final_verdict.confidence_level && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Confidence Level</h4>
                <p className="text-sm">{final_verdict.confidence_level}</p>
              </div>
            )}
          </div>
          {final_verdict.reasoning && (
            <div className="mt-3">
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Reasoning</h4>
              <p className="text-sm">{final_verdict.reasoning}</p>
            </div>
          )}
          {final_verdict.recommendation && (
            <div className="mt-3">
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Recommendation</h4>
              <p className="text-sm">{final_verdict.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* Skill Assessments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {communication_skills && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Communication Skills</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Overall Score:</span>
                <span className="font-medium">{communication_skills.overall_score}/10</span>
              </div>
              <p className="text-xs text-muted-foreground">{communication_skills.feedback}</p>
            </div>
          </div>
        )}

        {technical_knowledge && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Technical Knowledge</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Overall Score:</span>
                <span className="font-medium">{technical_knowledge.overall_score}/10</span>
              </div>
              <p className="text-xs text-muted-foreground">{technical_knowledge.feedback}</p>
            </div>
          </div>
        )}

        {problem_solving && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Problem Solving</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Overall Score:</span>
                <span className="font-medium">{problem_solving.overall_score}/10</span>
              </div>
              <p className="text-xs text-muted-foreground">{problem_solving.feedback}</p>
            </div>
          </div>
        )}

        {confidence_and_presence && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Confidence & Presence</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Overall Score:</span>
                <span className="font-medium">{confidence_and_presence.overall_score}/10</span>
              </div>
              <p className="text-xs text-muted-foreground">{confidence_and_presence.feedback}</p>
            </div>
          </div>
        )}
      </div>

      {/* Areas for Improvement */}
      {areas_for_improvement && areas_for_improvement.length > 0 && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Areas for Improvement</h3>
          <div className="space-y-3">
            {areas_for_improvement.map((area: any, index: number) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-sm">{area.area}</h4>
                  <Badge variant="outline" className="text-xs">
                    {area.priority} Priority
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{area.specific_feedback}</p>
                {area.examples && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Examples:</span> {area.examples}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold text-lg mb-3">Strengths</h3>
          <div className="space-y-3">
            {strengths.map((strength: any, index: number) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium text-sm mb-2">{strength.strength}</h4>
                <p className="text-xs text-muted-foreground mb-2">{strength.evidence}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Impact:</span> {strength.impact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface InterviewSubmissionsTableProps {
  interviews: any[] // Will be properly typed later
  isLoading?: boolean
  onReviewSubmission: (submission: any) => void
  onViewVideo: (submission: any) => void
  onViewDetails: (submission: any) => void
  onRefresh?: () => void
  filters: JrSubmissionsFilters
  onFiltersChange: (filters: JrSubmissionsFilters) => void
  products?: { id: string; name: string }[]
  clients?: { id: string; name: string }[]
}

export function InterviewSubmissionsTable({
  interviews,
  isLoading = false,
  onReviewSubmission,
  onViewVideo,
  onViewDetails,
  onRefresh,
  filters,
  onFiltersChange,
  products = [],
  clients = [],
}: InterviewSubmissionsTableProps) {
  const { toast } = useToast()
  
  // React Query mutations
  const quickVerdictMutation = useQuickVerdictMutation()
  const manualReviewMutation = useManualReviewMutation()

  // State for video player
  const [videoPlayerOpen, setVideoPlayerOpen] = React.useState(false)
  const [selectedVideoSubmission, setSelectedVideoSubmission] = React.useState<any>(null)
  
  // State for enhanced manual review
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [selectedReviewSubmission, setSelectedReviewSubmission] = React.useState<any>(null)
  
  // State for AI feedback modal
  const [aiFeedbackDialogOpen, setAiFeedbackDialogOpen] = React.useState(false)
  const [selectedAIFeedbackSubmission, setSelectedAIFeedbackSubmission] = React.useState<any>(null)

  // Handlers for new components
  const handleViewVideo = (submission: any) => {
    setSelectedVideoSubmission(submission)
    setVideoPlayerOpen(true)
  }

  const handleManualReview = (submission: any) => {
    setSelectedReviewSubmission(submission)
    setReviewDialogOpen(true)
  }
  
  const handleViewAIFeedback = (submission: any) => {
    setSelectedAIFeedbackSubmission(submission)
    setAiFeedbackDialogOpen(true)
  }

  // Quick verdict change handler using React Query
  const handleQuickVerdictChange = async (submissionId: string, verdict: 'approved' | 'rejected') => {
    try {
      await quickVerdictMutation.mutateAsync({ submissionId, verdict })
      
      toast({
        title: "Verdict Updated",
        description: `Interview submission ${verdict} successfully`,
        variant: "default",
      })
    } catch (error) {
      console.error('Failed to update verdict:', error)
      toast({
        title: "Error",
        description: "Failed to update verdict. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Format student name display
  const formatStudentName = (submission: any) => {
    return submission.student_name || "Unknown Student"
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: "secondary", color: "text-yellow-600", icon: <Clock className="h-3 w-3" /> }
      case 'analyzing':
        return { variant: "secondary", color: "text-blue-600", icon: <Clock className="h-3 w-3" /> }
      case 'analyzed':
        return { variant: "default", color: "text-green-600", icon: <CheckCircle className="h-3 w-3" /> }
      case 'error':
        return { variant: "destructive", color: "text-red-600", icon: <XCircle className="h-3 w-3" /> }
      default:
        return { variant: "outline", color: "text-gray-600", icon: null }
    }
  }

  // Get AI verdict badge styling
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'approved':
        return { variant: "default", color: "text-green-600", icon: <CheckCircle className="h-3 w-3" /> }
      case 'rejected':
        return { variant: "destructive", color: "text-red-600", icon: <XCircle className="h-3 w-3" /> }
      case 'needs_review':
        return { variant: "secondary", color: "text-orange-600", icon: <Clock className="h-3 w-3" /> }
      default:
        return { variant: "outline", color: "text-gray-600", icon: null }
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
              {formatStudentName(submission)}
            </div>
            <div className="text-sm text-muted-foreground">
              {submission.student_email || "No email"}
            </div>
            {submission.tier_when_submitted && (
              <Badge variant="outline" className="text-xs">
                {submission.tier_when_submitted} Tier
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => {
        const submission = row.original
        return (
          <div className="max-w-xs">
            <div className="font-medium text-sm">
              {submission.client_name || "No Client"}
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {submission.client_id || "N/A"}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "video_access",
      header: "Video",
      cell: ({ row }) => {
        const submission = row.original
        const hasVideo = submission.has_video || !!submission.video_storage_path
        return (
          <div className="flex items-center gap-2">
            {hasVideo ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewVideo(submission)}
                className="h-8 px-2"
              >
                <Play className="h-4 w-4 mr-1" />
                Watch
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">No video</span>
            )}
            {submission.video_duration && (
              <span className="text-xs text-muted-foreground">
                {Math.round(submission.video_duration / 60)}min
              </span>
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
      accessorKey: "ai_verdict",
      header: "AI Analysis",
      cell: ({ row }) => {
        const submission = row.original
        const verdict = submission.ai_verdict
        const confidence = submission.confidence_score
        
        return (
          <div className="space-y-2">
            {confidence !== undefined && (
              <div className="text-xs text-muted-foreground">
                Confidence: {Math.round(confidence * 100)}%
              </div>
            )}
            {submission.question_count > 0 && (
              <div className="text-xs text-muted-foreground">
                {submission.question_count} questions
              </div>
            )}
            {/* Quick Verdict Toggle - replaces the static badge */}
            {verdict && (
              <QuickVerdictToggle 
                submission={submission}
                onVerdictChange={handleQuickVerdictChange}
              />
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "ai_feedback",
      header: "AI Feedback",
      cell: ({ row }) => {
        const submission = row.original
        
        if (!submission.ai_feedback) {
          return (
            <div className="text-xs text-muted-foreground">
              No feedback available
            </div>
          )
        }

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewAIFeedback(submission)}
            className="h-8 text-xs flex items-center gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            View Feedback
          </Button>
        )
      },
    },
    {
      accessorKey: "manual_review",
      header: "Review Status",
      cell: ({ row }) => {
        const submission = row.original
        const needsReview = submission.requires_manual_review
        const hasOverride = submission.admin_verdict_override
        
        return (
          <div className="space-y-1">
            {needsReview ? (
              <Badge variant="secondary" className="text-xs text-orange-600 flex items-center gap-1 w-fit">
                <Clock className="h-3 w-3" />
                Needs Review
              </Badge>
            ) : hasOverride ? (
              <Badge variant="default" className="text-xs text-green-600 flex items-center gap-1 w-fit">
                <CheckCircle className="h-3 w-3" />
                Reviewed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Auto-processed
              </Badge>
            )}
            {submission.analyzed_at && (
              <div className="text-xs text-muted-foreground">
                {formatSubmissionDate(submission.analyzed_at)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const submission = row.original
        const needsReview = submission.requires_manual_review
        const hasVideo = submission.has_video || !!submission.video_storage_path

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Interview Actions</DropdownMenuLabel>
              
              {hasVideo && (
                <DropdownMenuItem onClick={() => handleViewVideo(submission)}>
                  <Play className="mr-2 h-4 w-4" />
                  Watch Video
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => onViewDetails(submission)}>
                <Eye className="mr-2 h-4 w-4" />
                View Analysis
              </DropdownMenuItem>
              
              {needsReview && (
                <DropdownMenuItem onClick={() => handleManualReview(submission)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Enhanced Review
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

  // Interview-specific filters
  const renderFilters = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      {/* Search */}
      <div className="flex-1">
        <Input
          placeholder="Search students..."
          value={filters.search || ""}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value, page: 1 })}
          className="max-w-sm"
        />
      </div>
      
      {/* Status Filter */}
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
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="analyzing">Analyzing</SelectItem>
          <SelectItem value="analyzed">Analyzed</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>
      
      {/* AI Verdict Filter */}
      <Select
        value={filters.aiVerdict || "all"}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, aiVerdict: value === "all" ? undefined : value, page: 1 })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="AI Verdict" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Verdicts</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="needs_review">Needs Review</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Client Filter */}
      {clients.length > 0 && (
        <Select
          value={filters.clientId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, clientId: value === "all" ? undefined : value, page: 1 })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
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
          data={interviews}
          isLoading={isLoading}
          hideSearch={true}
        />
      </div>

      {/* Video Player Dialog */}
      <InterviewVideoPlayer
        submission={selectedVideoSubmission}
        open={videoPlayerOpen}
        onOpenChange={setVideoPlayerOpen}
        onReviewSubmission={handleManualReview}
      />

      {/* Enhanced Manual Review Dialog */}
      <InterviewManualReviewEnhanced
        submission={selectedReviewSubmission}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onSuccess={() => {
          onRefresh?.()
          setReviewDialogOpen(false)
        }}
      />

      {/* AI Feedback Dialog */}
      <Dialog open={aiFeedbackDialogOpen} onOpenChange={setAiFeedbackDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Feedback: {selectedAIFeedbackSubmission?.student_name || 'Interview Submission'}
            </DialogTitle>
            <DialogDescription>
              Detailed AI analysis and feedback for this interview submission
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[70vh] pr-4">
            {selectedAIFeedbackSubmission?.ai_feedback && (
              <AIFeedbackDisplay feedback={selectedAIFeedbackSubmission.ai_feedback} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
} 