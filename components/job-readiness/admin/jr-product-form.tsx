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
  JrFormDialog,
  JrFormWrapper,
  TierScoreRange,
  productFormSchema,
} from "./shared/jr-form-components"
import { JrProduct, CreateJrProductRequest, UpdateJrProductRequest } from "@/lib/api/job-readiness/products"

interface JrProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: JrProduct | null
  onSubmit: (data: CreateJrProductRequest | UpdateJrProductRequest) => Promise<void>
  isLoading?: boolean
}

type FormData = z.infer<typeof productFormSchema>

export function JrProductForm({
  open,
  onOpenChange,
  product,
  onSubmit,
  isLoading = false,
}: JrProductFormProps) {
  const isEditing = !!product

  // Get default values
  const getDefaultValues = (): Partial<FormData> => {
    if (isEditing && product) {
      const config = product.job_readiness_products[0]
      return {
        name: product.name,
        description: product.description || "",
        configuration: config ? {
          bronze_assessment_min_score: config.bronze_assessment_min_score,
          bronze_assessment_max_score: config.bronze_assessment_max_score,
          silver_assessment_min_score: config.silver_assessment_min_score,
          silver_assessment_max_score: config.silver_assessment_max_score,
          gold_assessment_min_score: config.gold_assessment_min_score,
          gold_assessment_max_score: config.gold_assessment_max_score,
        } : {
          bronze_assessment_min_score: 0,
          bronze_assessment_max_score: 65,
          silver_assessment_min_score: 66,
          silver_assessment_max_score: 85,
          gold_assessment_min_score: 86,
          gold_assessment_max_score: 100,
        }
      }
    }

    return {
      name: "",
      description: "",
      configuration: {
        bronze_assessment_min_score: 0,
        bronze_assessment_max_score: 65,
        silver_assessment_min_score: 66,
        silver_assessment_max_score: 85,
        gold_assessment_min_score: 86,
        gold_assessment_max_score: 100,
      },
    }
  }

  const form = useForm<FormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(),
  })

  // Reset form when product changes or dialog opens/closes
  React.useEffect(() => {
    if (open) {
      form.reset(getDefaultValues())
    }
  }, [open, product])

  const handleSubmit = async (data: FormData) => {
    if (isEditing && product) {
      // Update request
      const updateData: UpdateJrProductRequest = {
        id: product.id,
        name: data.name,
        description: data.description || undefined,
        configuration: data.configuration,
      }
      await onSubmit(updateData)
    } else {
      // Create request
      const createData: CreateJrProductRequest = {
        name: data.name,
        description: data.description || undefined,
        configuration: data.configuration,
      }
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
      title={isEditing ? "Edit Job Readiness Product" : "Create Job Readiness Product"}
      description={
        isEditing
          ? "Update the product details and tier score ranges."
          : "Create a new Job Readiness product with tier score configurations."
      }
    >
      <JrFormWrapper
        form={form}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitText={isEditing ? "Update Product" : "Create Product"}
        onCancel={handleCancel}
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Full Stack Development Career Path"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the Job Readiness program..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Tier Configuration */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Tier Score Ranges</h3>
              <p className="text-sm text-muted-foreground">
                Define the assessment score ranges for each tier. Students will be assigned to tiers based on their assessment performance.
              </p>
            </div>

            <TierScoreRange
              form={form}
              tier="bronze"
              label="Bronze Tier"
              description="Entry level tier for students starting their journey"
            />

            <TierScoreRange
              form={form}
              tier="silver"
              label="Silver Tier"
              description="Intermediate tier for students with some experience"
            />

            <TierScoreRange
              form={form}
              tier="gold"
              label="Gold Tier"
              description="Advanced tier for experienced students"
            />
          </div>
        </div>
      </JrFormWrapper>
    </JrFormDialog>
  )
} 