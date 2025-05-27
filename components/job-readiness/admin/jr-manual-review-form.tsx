"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { 
  JrFormDialog, 
  JrFormWrapper, 
  ManualReviewForm, 
  manualReviewSchema,
  LoadingButton 
} from "./shared/jr-form-components"
import {
  JrSubmission,
  formatSubmissionDate,
  getSubmissionTypeLabel,
  getAiGradeStatusLabel,
  getManualReviewStatusLabel,
  ManualReviewRequest,
  submitManualReview
} from "@/lib/api/job-readiness/submissions"
import { useToast } from "@/hooks/use-toast"

type ManualReviewFormData = z.infer<typeof manualReviewSchema>

interface JrManualReviewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: JrSubmission | null
  onSuccess?: () => void
}

export function JrManualReviewForm({
  open,
  onOpenChange,
  submission,
  onSuccess,
}: JrManualReviewFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<ManualReviewFormData>({
    resolver: zodResolver(manualReviewSchema),
    defaultValues: {
      status: undefined,
      admin_feedback: "",
    },
  })

  // Reset form when submission changes
  React.useEffect(() => {
    if (submission && open) {
      form.reset({
        status: undefined,
        admin_feedback: "",
      })
    }
  }, [submission, open, form])

  const handleSubmit = async (data: ManualReviewFormData) => {
    if (!submission) return

    try {
      setIsSubmitting(true)
      
      const reviewData: ManualReviewRequest = {
        status: data.status,
        admin_feedback: data.admin_feedback,
      }

      await submitManualReview(submission.id, reviewData)

      toast({
        title: "Review Submitted",
        description: `Interview submission has been ${data.status}.`,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to submit review:", error)
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  if (!submission) return null

  const studentName = submission.student 
    ? `${submission.student.first_name} ${submission.student.last_name}`
    : "Unknown Student"

  return (
    <JrFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manual Review - Interview Submission"
      description="Review and provide feedback on this student's interview submission."
    >
      <div className="space-y-6">
        {/* Submission Overview */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h4 className="text-sm font-medium">Submission Details</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Student:</span> {studentName}
            </div>
            <div>
              <span className="font-medium">Email:</span> {submission.student?.email || "N/A"}
            </div>
            <div>
              <span className="font-medium">Product:</span> {submission.product?.name || "Unknown"}
            </div>
            <div>
              <span className="font-medium">Submitted:</span> {formatSubmissionDate(submission.submission_date)}
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {getSubmissionTypeLabel(submission.submission_type)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              AI Status: {getAiGradeStatusLabel(submission.ai_grade_status)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Review: {getManualReviewStatusLabel(submission.manual_review_status)}
            </Badge>
          </div>

          {submission.score !== undefined && (
            <div className="text-sm">
              <span className="font-medium">AI Score:</span> {submission.score}%
            </div>
          )}
        </div>

        {/* Interview Specific Info */}
        {submission.interview_submission && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Interview Details</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <div>
                <span className="font-medium">Video Path:</span> {submission.interview_submission.video_storage_path}
              </div>
              {submission.interview_submission.feedback && (
                <div>
                  <span className="font-medium">AI Feedback:</span> {submission.interview_submission.feedback}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning for already reviewed submissions */}
        {submission.manual_review_status !== "pending" && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This submission has already been reviewed. Submitting a new review will override the previous decision.
              {submission.admin_feedback && (
                <div className="mt-2">
                  <strong>Previous feedback:</strong> {submission.admin_feedback}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Review Form */}
        <JrFormWrapper
          form={form}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          submitText="Submit Review"
          onCancel={handleCancel}
        >
          <ManualReviewForm
            form={form}
            submissionType={submission.submission_type}
            studentName={studentName}
            submissionDate={formatSubmissionDate(submission.submission_date)}
          />
        </JrFormWrapper>
      </div>
    </JrFormDialog>
  )
} 