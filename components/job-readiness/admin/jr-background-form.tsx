"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  JrFormDialog,
  JrFormWrapper,
  GradingCriteriaEditor,
  TierPrompts,
  backgroundFormSchema,
} from "./shared/jr-form-components"
import { 
  JrBackground, 
  CreateJrBackgroundRequest, 
  UpdateJrBackgroundRequest,
  BACKGROUND_TYPES,
  PROJECT_TYPES,
  getBackgroundTypeLabel,
  getProjectTypeLabel
} from "@/lib/api/job-readiness/backgrounds"

interface JrBackgroundFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  background?: JrBackground | null
  existingBackgrounds?: JrBackground[]
  onSubmit: (data: CreateJrBackgroundRequest | UpdateJrBackgroundRequest) => Promise<void>
  isLoading?: boolean
}

type FormData = z.infer<typeof backgroundFormSchema>

export function JrBackgroundForm({
  open,
  onOpenChange,
  background,
  existingBackgrounds = [],
  onSubmit,
  isLoading = false,
}: JrBackgroundFormProps) {
  const isEditing = !!background

  // Check if a combination already exists (excluding current background when editing)
  const isDuplicateCombination = (backgroundType: string, projectType: string) => {
    if (!backgroundType || !projectType) return false
    
    return existingBackgrounds.some(
      bg => bg.background_type === backgroundType && 
            bg.project_type === projectType &&
            (!isEditing || bg.id !== background?.id)
    )
  }

  // Get existing combinations for display
  const existingCombinations = existingBackgrounds.map(
    bg => `${getBackgroundTypeLabel(bg.background_type)} → ${getProjectTypeLabel(bg.project_type)}`
  )

  // Get default values
  const getDefaultValues = (): Partial<FormData> => {
    if (isEditing && background) {
      return {
        background_type: background.background_type,
        project_type: background.project_type,
        project_description_template: background.project_description_template,
        grading_criteria: background.grading_criteria,
        bronze_system_prompt: background.bronze_system_prompt,
        bronze_input_prompt: background.bronze_input_prompt,
        silver_system_prompt: background.silver_system_prompt,
        silver_input_prompt: background.silver_input_prompt,
        gold_system_prompt: background.gold_system_prompt,
        gold_input_prompt: background.gold_input_prompt,
      }
    }

    return {
      background_type: "",
      project_type: "",
      project_description_template: "",
      grading_criteria: [
        { weight: 40, criterion: "Code Quality" },
        { weight: 30, criterion: "Functionality" },
        { weight: 20, criterion: "Documentation" },
        { weight: 10, criterion: "Best Practices" },
      ],
      bronze_system_prompt: "",
      bronze_input_prompt: "",
      silver_system_prompt: "",
      silver_input_prompt: "",
      gold_system_prompt: "",
      gold_input_prompt: "",
    }
  }

  const form = useForm<FormData>({
    resolver: zodResolver(backgroundFormSchema),
    defaultValues: getDefaultValues(),
  })

  // Reset form when background changes or dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues())
    }
  }, [open, background])

  const handleSubmit = async (data: FormData) => {
    // Check for duplicate combination before submitting
    if (!isEditing && isDuplicateCombination(data.background_type, data.project_type)) {
      form.setError("project_type", {
        type: "manual",
        message: "This background and project type combination already exists. Please choose a different combination."
      })
      return
    }

    if (isEditing && background) {
      // Update request
      const updateData: UpdateJrBackgroundRequest = {
        id: background.id,
        ...data,
      }
      await onSubmit(updateData)
    } else {
      // Create request
      const createData: CreateJrBackgroundRequest = data
      await onSubmit(createData)
    }

    // Close dialog on success
    onOpenChange(false)
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <JrFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Background Configuration" : "Create Background Configuration"}
      description={
        isEditing
          ? "Update the AI project generation settings for this background type."
          : "Configure AI project generation settings for a specific student background."
      }
    >
      <JrFormWrapper
        form={form}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitText={isEditing ? "Update Configuration" : "Create Configuration"}
        onCancel={handleCancel}
      >
        <div className="space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="background_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Background Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select background type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BACKGROUND_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getBackgroundTypeLabel(type)}
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
                name="project_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getProjectTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="project_description_template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description Template</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the type of project that will be generated for this background..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Display existing combinations for reference */}
          {!isEditing && existingCombinations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Existing Combinations:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                {existingCombinations.map((combo, index) => (
                  <div key={index} className="pl-2 border-l-2 border-muted">
                    {combo}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Please choose a different combination to avoid duplicates.
              </p>
            </div>
          )}

          <Separator />

          {/* Grading Criteria */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Grading Criteria</h3>
            <GradingCriteriaEditor form={form} fieldName="grading_criteria" />
          </div>

          <Separator />

          {/* Tier Prompts */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">AI Generation Prompts by Tier</h3>
              <p className="text-sm text-muted-foreground">
                Configure the AI prompts for project generation at each tier level.
              </p>
            </div>

            <TierPrompts
              form={form}
              tier="bronze"
              label="Bronze Tier Prompts"
              description="Entry level projects for beginners"
            />

            <TierPrompts
              form={form}
              tier="silver"
              label="Silver Tier Prompts"
              description="Intermediate projects with moderate complexity"
            />

            <TierPrompts
              form={form}
              tier="gold"
              label="Gold Tier Prompts"
              description="Advanced projects for experienced learners"
            />
          </div>
        </div>
      </JrFormWrapper>
    </JrFormDialog>
  )
} 