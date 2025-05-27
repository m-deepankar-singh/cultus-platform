"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  JrFormDialog,
  JrFormWrapper,
  ProgressOverrideForm,
  progressOverrideSchema,
} from "./shared/jr-form-components"
import { 
  JrStudentProgress,
  OverrideProgressRequest,
  getStarLevelLabel,
  getTierLevelLabel
} from "@/lib/api/job-readiness/progress"

interface JrProgressOverrideFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentProgress?: JrStudentProgress | null
  onSubmit: (data: OverrideProgressRequest) => Promise<void>
  isLoading?: boolean
}

type FormData = z.infer<typeof progressOverrideSchema>

export function JrProgressOverrideForm({
  open,
  onOpenChange,
  studentProgress,
  onSubmit,
  isLoading = false,
}: JrProgressOverrideFormProps) {
  
  // Get default values
  const getDefaultValues = (): Partial<FormData> => {
    if (studentProgress) {
      return {
        job_readiness_star_level: studentProgress.job_readiness_star_level,
        job_readiness_tier: studentProgress.job_readiness_tier,
        reason: "",
      }
    }

    return {
      job_readiness_star_level: undefined,
      job_readiness_tier: undefined,
      reason: "",
    }
  }

  const form = useForm<FormData>({
    resolver: zodResolver(progressOverrideSchema),
    defaultValues: getDefaultValues(),
  })

  // Reset form when student changes or dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues())
    }
  }, [open, studentProgress])

  const handleSubmit = async (data: FormData) => {
    const overrideData: OverrideProgressRequest = {
      job_readiness_star_level: data.job_readiness_star_level,
      job_readiness_tier: data.job_readiness_tier,
      reason: data.reason,
    }

    await onSubmit(overrideData)

    // Close dialog on success
    onOpenChange(false)
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  // Format student name for display
  const getStudentDisplayName = () => {
    if (!studentProgress?.student) return "Unknown Student"
    const { first_name, last_name } = studentProgress.student
    return `${first_name} ${last_name}`
  }

  return (
    <JrFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Override Student Progress"
      description={`Manually adjust the Job Readiness progress for ${getStudentDisplayName()}. This action will be logged for audit purposes.`}
    >
      <JrFormWrapper
        form={form}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitText="Override Progress"
        onCancel={handleCancel}
      >
        <div className="space-y-6">
          {/* Student Information */}
          {studentProgress && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Student Information</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {getStudentDisplayName()}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {studentProgress.student?.email || "N/A"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Product:</span> {studentProgress.product?.name || "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Student ID:</span> {studentProgress.student_id}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Override Form */}
          <ProgressOverrideForm
            form={form}
            currentStarLevel={studentProgress?.job_readiness_star_level}
            currentTier={studentProgress?.job_readiness_tier}
          />

          {/* Warning Notice */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="text-yellow-600 text-sm">
                <strong>⚠️ Important:</strong> This will override the student's current progress and may affect their access to modules and assessments. The override reason will be logged for audit purposes.
              </div>
            </div>
          </div>
        </div>
      </JrFormWrapper>
    </JrFormDialog>
  )
} 