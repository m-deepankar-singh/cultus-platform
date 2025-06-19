"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Brain, 
  User, 
  MessageCircle,
  Shield,
  TrendingUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Enhanced schema for interview review
const interviewReviewSchema = z.object({
  admin_verdict_override: z.enum(["approved", "rejected", "needs_further_review"], {
    required_error: "Please select a verdict",
  }),
  override_reason: z.string().min(10, "Please provide a detailed reason for your decision (minimum 10 characters)"),
  confidence_in_decision: z.enum(["low", "medium", "high"], {
    required_error: "Please indicate your confidence level",
  }),
  additional_feedback: z.string().optional(),
})

type InterviewReviewFormData = z.infer<typeof interviewReviewSchema>

interface InterviewManualReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: any // Interview submission with AI analysis
  onSuccess?: () => void
}

export function InterviewManualReviewEnhanced({
  open,
  onOpenChange,
  submission,
  onSuccess,
}: InterviewManualReviewProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<InterviewReviewFormData>({
    resolver: zodResolver(interviewReviewSchema),
    defaultValues: {
      admin_verdict_override: undefined,
      override_reason: "",
      confidence_in_decision: undefined,
      additional_feedback: "",
    },
  })

  // Reset form when submission changes
  React.useEffect(() => {
    if (submission && open) {
      form.reset({
        admin_verdict_override: undefined,
        override_reason: "",
        confidence_in_decision: undefined,
        additional_feedback: "",
      })
    }
  }, [submission, open, form])

  const handleSubmit = async (data: InterviewReviewFormData) => {
    if (!submission) return

    try {
      setIsSubmitting(true)
      
      // API call to submit manual review
      const response = await fetch(`/api/admin/job-readiness/interviews/${submission.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_verdict_override: data.admin_verdict_override,
          override_reason: data.override_reason,
          confidence_in_decision: data.confidence_in_decision,
          additional_feedback: data.additional_feedback,
          original_ai_verdict: submission.ai_verdict,
          original_confidence_score: submission.confidence_score,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      toast({
        title: "Review Submitted",
        description: `Interview has been ${data.admin_verdict_override} with ${data.confidence_in_decision} confidence.`,
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

  const analysisResult = submission.analysis_result || {}
  const aiVerdict = submission.ai_verdict
  const confidenceScore = submission.confidence_score || 0
  
  // Helper functions
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200'
      case 'needs_review': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'needs_review': return <AlertTriangle className="h-4 w-4" />
      default: return null
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manual Review: {submission.student?.full_name || 'Interview Submission'}
          </DialogTitle>
          <DialogDescription>
            Review the AI analysis and provide your expert verdict on this interview submission
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Analysis Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis Results
                </CardTitle>
                <CardDescription>
                  Automated assessment of the interview performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Verdict */}
                <div>
                  <Label className="text-sm font-medium">AI Verdict</Label>
                  <div className={`mt-1 p-3 rounded-lg border ${getVerdictColor(aiVerdict)}`}>
                    <div className="flex items-center gap-2">
                      {getVerdictIcon(aiVerdict)}
                      <span className="font-medium capitalize">{aiVerdict || 'No verdict'}</span>
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                <div>
                  <Label className="text-sm font-medium">AI Confidence Score</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${getConfidenceColor(confidenceScore)}`}>
                        {Math.round(confidenceScore * 100)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {confidenceScore >= 0.8 ? 'High' : confidenceScore >= 0.6 ? 'Medium' : 'Low'} Confidence
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          confidenceScore >= 0.8 ? 'bg-green-500' : 
                          confidenceScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${confidenceScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* AI Feedback */}
                {analysisResult.overall_feedback && (
                  <div>
                    <Label className="text-sm font-medium">AI Feedback</Label>
                    <ScrollArea className="mt-1 h-32 w-full border rounded-lg p-3">
                      <p className="text-sm leading-relaxed">
                        {analysisResult.overall_feedback}
                      </p>
                    </ScrollArea>
                  </div>
                )}

                {/* Performance Metrics */}
                {analysisResult.metrics && (
                  <div>
                    <Label className="text-sm font-medium">Performance Metrics</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(analysisResult.metrics).map(([key, value]: [string, any]) => (
                        <div key={key} className="p-2 bg-muted rounded">
                          <div className="font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                          <div className="text-muted-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Submission Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">Student</Label>
                    <p className="text-muted-foreground">{submission.student?.full_name}</p>
                    <p className="text-muted-foreground text-xs">{submission.student?.email}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Product</Label>
                    <p className="text-muted-foreground">{submission.product?.name}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Submitted</Label>
                    <p className="text-muted-foreground">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Status</Label>
                    <p className="text-muted-foreground capitalize">{submission.status}</p>
                  </div>
                </div>

                {(submission.tier_when_submitted || submission.background_when_submitted) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {submission.tier_when_submitted && (
                        <div>
                          <Label className="font-medium">Tier</Label>
                          <p className="text-muted-foreground">{submission.tier_when_submitted}</p>
                        </div>
                      )}
                      {submission.background_when_submitted && (
                        <div>
                          <Label className="font-medium">Background</Label>
                          <p className="text-muted-foreground">{submission.background_when_submitted}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manual Review Form Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Your Review Decision
                </CardTitle>
                <CardDescription>
                  Provide your expert assessment and override the AI verdict if necessary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Verdict Override */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Your Verdict *</Label>
                    <RadioGroup
                      value={form.watch("admin_verdict_override")}
                      onValueChange={(value) => form.setValue("admin_verdict_override", value as any)}
                      className="grid grid-cols-1 gap-2"
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-green-200 bg-green-50">
                        <RadioGroupItem value="approved" id="approved" />
                        <label htmlFor="approved" className="flex items-center gap-2 text-green-700 font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-red-200 bg-red-50">
                        <RadioGroupItem value="rejected" id="rejected" />
                        <label htmlFor="rejected" className="flex items-center gap-2 text-red-700 font-medium">
                          <XCircle className="h-4 w-4" />
                          Reject
                        </label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-orange-200 bg-orange-50">
                        <RadioGroupItem value="needs_further_review" id="needs_further_review" />
                        <label htmlFor="needs_further_review" className="flex items-center gap-2 text-orange-700 font-medium">
                          <AlertTriangle className="h-4 w-4" />
                          Needs Further Review
                        </label>
                      </div>
                    </RadioGroup>
                    {form.formState.errors.admin_verdict_override && (
                      <p className="text-sm text-red-600">{form.formState.errors.admin_verdict_override.message}</p>
                    )}
                  </div>

                  {/* Override Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="override_reason" className="text-sm font-medium">
                      Reason for Decision *
                    </Label>
                    <Textarea
                      id="override_reason"
                      placeholder="Explain your reasoning for this decision. Consider the candidate's communication skills, technical knowledge, problem-solving approach, and overall interview performance..."
                      {...form.register("override_reason")}
                      className="min-h-[100px] resize-none"
                    />
                    {form.formState.errors.override_reason && (
                      <p className="text-sm text-red-600">{form.formState.errors.override_reason.message}</p>
                    )}
                  </div>

                  {/* Confidence Level */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Your Confidence Level *</Label>
                    <RadioGroup
                      value={form.watch("confidence_in_decision")}
                      onValueChange={(value) => form.setValue("confidence_in_decision", value as any)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="conf_low" />
                        <label htmlFor="conf_low" className="text-sm">Low</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="conf_medium" />
                        <label htmlFor="conf_medium" className="text-sm">Medium</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="conf_high" />
                        <label htmlFor="conf_high" className="text-sm">High</label>
                      </div>
                    </RadioGroup>
                    {form.formState.errors.confidence_in_decision && (
                      <p className="text-sm text-red-600">{form.formState.errors.confidence_in_decision.message}</p>
                    )}
                  </div>

                  {/* Additional Feedback */}
                  <div className="space-y-2">
                    <Label htmlFor="additional_feedback" className="text-sm font-medium">
                      Additional Feedback (Optional)
                    </Label>
                    <Textarea
                      id="additional_feedback"
                      placeholder="Any additional comments or suggestions for the student..."
                      {...form.register("additional_feedback")}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {/* AI vs Human Decision Alert */}
                  {form.watch("admin_verdict_override") && 
                   form.watch("admin_verdict_override") !== aiVerdict && (
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Notice:</strong> Your decision differs from the AI verdict ({aiVerdict}). 
                        Please ensure your reasoning is thorough and well-documented.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !form.formState.isValid}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}