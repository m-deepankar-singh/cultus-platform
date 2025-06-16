"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Common form dialog wrapper
interface JrFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function JrFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: JrFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// Tier score range component
interface TierScoreRangeProps {
  form: any
  tier: "bronze" | "silver" | "gold"
  label: string
  description?: string
}

export function TierScoreRange({ form, tier, label, description }: TierScoreRangeProps) {
  const minField = `configuration.${tier}_assessment_min_score`
  const maxField = `configuration.${tier}_assessment_max_score`

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium flex items-center gap-2">
          {label}
          <Badge variant="outline" className="text-xs">
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        </h4>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={minField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Score</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={maxField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Score</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

// Loading button component
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  children: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function LoadingButton({
  isLoading = false,
  children,
  variant = "default",
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button variant={variant} disabled={isLoading || disabled} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

// Form wrapper with submit handling
interface JrFormWrapperProps {
  form: any
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  children: React.ReactNode
}

export function JrFormWrapper({
  form,
  onSubmit,
  isLoading = false,
  submitText = "Save",
  cancelText = "Cancel",
  onCancel,
  children,
}: JrFormWrapperProps) {
  const { toast } = useToast()

  const handleSubmit = async (data: any) => {
    try {
      await onSubmit(data)
      toast({
        title: "Success",
        description: "Changes saved successfully.",
      })
    } catch (error) {
      console.error("Form submission error:", error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {children}
        <DialogFooter>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {cancelText}
            </Button>
          )}
          <LoadingButton type="submit" isLoading={isLoading}>
            {submitText}
          </LoadingButton>
        </DialogFooter>
      </form>
    </Form>
  )
}

// Common validation schemas
export const baseProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  description: z.string().optional(),
})

export const tierConfigurationSchema = z.object({
  bronze_assessment_min_score: z.number().min(0).max(100),
  bronze_assessment_max_score: z.number().min(0).max(100),
  silver_assessment_min_score: z.number().min(0).max(100),
  silver_assessment_max_score: z.number().min(0).max(100),
  gold_assessment_min_score: z.number().min(0).max(100),
  gold_assessment_max_score: z.number().min(0).max(100),
}).refine(
  (data) => {
    // Validate that min <= max for each tier
    return (
      data.bronze_assessment_min_score <= data.bronze_assessment_max_score &&
      data.silver_assessment_min_score <= data.silver_assessment_max_score &&
      data.gold_assessment_min_score <= data.gold_assessment_max_score
    )
  },
  {
    message: "Minimum score must be less than or equal to maximum score for each tier",
    path: ["configuration"],
  }
)

export const productFormSchema = baseProductSchema.extend({
  configuration: tierConfigurationSchema,
})

// New schemas for backgrounds
export const gradingCriterionSchema = z.object({
  weight: z.number().min(1, "Weight must be at least 1").max(100, "Weight cannot exceed 100"),
  criterion: z.string().min(1, "Criterion name is required"),
})

export const backgroundFormSchema = z.object({
  background_type: z.string().min(1, "Background type is required"),
  project_type: z.string().min(1, "Project type is required"),
  project_description_template: z.string().min(1, "Project description template is required"),
  grading_criteria: z.array(gradingCriterionSchema).min(1, "At least one grading criterion is required"),
  bronze_system_prompt: z.string().min(1, "Bronze system prompt is required"),
  bronze_input_prompt: z.string().min(1, "Bronze input prompt is required"),
  silver_system_prompt: z.string().min(1, "Silver system prompt is required"),
  silver_input_prompt: z.string().min(1, "Silver input prompt is required"),
  gold_system_prompt: z.string().min(1, "Gold system prompt is required"),
  gold_input_prompt: z.string().min(1, "Gold input prompt is required"),
}).refine(
  (data) => {
    // Validate that grading criteria weights sum to 100
    const totalWeight = data.grading_criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
    return Math.abs(totalWeight - 100) < 0.1 // Allow small floating point differences
  },
  {
    message: "Grading criteria weights must sum to 100%",
    path: ["grading_criteria"],
  }
)

// Grading Criteria Editor Component
interface GradingCriteriaEditorProps {
  form: any
  fieldName: string
}

export function GradingCriteriaEditor({ form, fieldName }: GradingCriteriaEditorProps) {
  const criteria = form.watch(fieldName) || []

  const addCriterion = () => {
    const currentCriteria = form.getValues(fieldName) || []
    form.setValue(fieldName, [
      ...currentCriteria,
      { weight: 0, criterion: "" }
    ])
  }

  const removeCriterion = (index: number) => {
    const currentCriteria = form.getValues(fieldName) || []
    form.setValue(fieldName, currentCriteria.filter((_: any, i: number) => i !== index))
  }

  const totalWeight = criteria.reduce((sum: number, criterion: any) => sum + (criterion.weight || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Grading Criteria</h4>
          <p className="text-sm text-muted-foreground">
            Define how projects will be evaluated. Total weight must equal 100%.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={Math.abs(totalWeight - 100) < 0.1 ? "default" : "destructive"}>
            Total: {totalWeight}%
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
            Add Criterion
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((_criterion: any, index: number) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name={`${fieldName}.${index}.criterion`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Criterion Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Code Quality"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name={`${fieldName}.${index}.weight`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Weight (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="25"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeCriterion(index)}
              className="mt-6"
              disabled={criteria.length <= 1}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      {criteria.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">No grading criteria defined</p>
          <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
            Add First Criterion
          </Button>
        </div>
      )}
    </div>
  )
}

// Tier Prompts Component
interface TierPromptsProps {
  form: any
  tier: "bronze" | "silver" | "gold"
  label: string
  description?: string
}

export function TierPrompts({ form, tier, label, description }: TierPromptsProps) {
  const systemPromptField = `${tier}_system_prompt`
  const inputPromptField = `${tier}_input_prompt`

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium flex items-center gap-2">
          {label}
          <Badge variant="outline" className="text-xs">
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        </h4>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      
      <div className="space-y-4">
        <FormField
          control={form.control}
          name={systemPromptField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="You are a project creator for..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={inputPromptField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Generate a project that..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

// New schemas for progress override
export const progressOverrideSchema = z.object({
  job_readiness_star_level: z.enum(["NONE", "ONE", "TWO", "THREE", "FOUR", "FIVE"]).nullable().optional(),
  job_readiness_tier: z.enum(["BRONZE", "SILVER", "GOLD"], {
    required_error: "Tier is required",
  }),
  reason: z.string().min(1, "Reason for override is required").max(500, "Reason must be less than 500 characters"),
})

// Schema for manual review
export const manualReviewSchema = z.object({
  status: z.enum(["approved", "rejected"], {
    required_error: "Review decision is required",
  }),
  admin_feedback: z.string().min(1, "Feedback is required").max(1000, "Feedback must be less than 1000 characters"),
})

// Progress Override Form Component
interface ProgressOverrideFormProps {
  form: any
  currentStarLevel?: string
  currentTier?: string
}

export function ProgressOverrideForm({ form, currentStarLevel, currentTier }: ProgressOverrideFormProps) {
  const starLevelOptions = [
    { value: "NONE", label: "☆ No Stars" },
    { value: "ONE", label: "⭐ Level 1" },
    { value: "TWO", label: "⭐⭐ Level 2" },
    { value: "THREE", label: "⭐⭐⭐ Level 3" },
    { value: "FOUR", label: "⭐⭐⭐⭐ Level 4" },
    { value: "FIVE", label: "⭐⭐⭐⭐⭐ Level 5" },
  ]

  const tierOptions = [
    { value: "BRONZE", label: "🥉 Bronze" },
    { value: "SILVER", label: "🥈 Silver" },
    { value: "GOLD", label: "🥇 Gold" },
  ]

  return (
    <div className="space-y-6">
      {/* Current Status Display */}
      {(currentStarLevel || currentTier) && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Status</h4>
          <div className="flex items-center gap-4">
            {currentStarLevel && (
              <Badge variant="outline" className="text-sm">
                Current Level: {starLevelOptions.find(opt => opt.value === currentStarLevel)?.label || currentStarLevel}
              </Badge>
            )}
            {currentTier && (
              <Badge variant="outline" className="text-sm">
                Current Tier: {tierOptions.find(opt => opt.value === currentTier)?.label || currentTier}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* New Progress Selection */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="job_readiness_star_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Star Level</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "NONE" ? null : value)} 
                defaultValue={field.value || "NONE"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select star level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {starLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="job_readiness_tier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Tier</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tierOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Reason for Override */}
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reason for Override</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explain why this progress override is necessary..."
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              This reason will be logged for audit purposes. Please be specific about why this manual override is needed.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

// Manual Review Form Component
interface ManualReviewFormProps {
  form: any
  submissionType?: string
  studentName?: string
  submissionDate?: string
}

export function ManualReviewForm({ 
  form, 
  submissionType = "interview",
  studentName,
  submissionDate 
}: ManualReviewFormProps) {
  const statusOptions = [
    { value: "approved", label: "✅ Approve", description: "Accept this submission" },
    { value: "rejected", label: "❌ Reject", description: "Reject this submission" },
  ]

  return (
    <div className="space-y-6">
      {/* Submission Info Display */}
      {(studentName || submissionDate) && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Submission Details</h4>
          <div className="space-y-1 text-sm">
            {studentName && (
              <div>
                <span className="font-medium">Student:</span> {studentName}
              </div>
            )}
            {submissionDate && (
              <div>
                <span className="font-medium">Submitted:</span> {submissionDate}
              </div>
            )}
            <div>
              <span className="font-medium">Type:</span> {submissionType === "interview" ? "🎥 Interview" : "📂 Project"}
            </div>
          </div>
        </div>
      )}

      {/* Review Decision */}
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Review Decision</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your decision" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="space-y-1">
                      <div>{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Admin Feedback */}
      <FormField
        control={form.control}
        name="admin_feedback"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Admin Feedback</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Provide detailed feedback for the student about this submission..."
                className="min-h-[120px]"
                {...field}
              />
            </FormControl>
            <FormDescription>
              This feedback will be visible to the student. Please be constructive and specific about your decision.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Review Guidelines */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Review Guidelines</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Ensure feedback is constructive and actionable</li>
          <li>• Consider the student's skill level and background</li>
          <li>• Provide specific examples when possible</li>
          <li>• Be consistent with grading standards</li>
        </ul>
      </div>
    </div>
  )
} 