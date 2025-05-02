"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

// Common base schema for all module types
const baseModuleSchema = z.object({
  name: z.string().min(1, { message: "Module name is required" }),
  description: z.string().optional(),
});

// Schema for Course modules
const courseModuleSchema = baseModuleSchema;

// Schema for Assessment modules
const assessmentModuleSchema = baseModuleSchema.extend({
  time_limit_minutes: z.coerce.number().int().positive().optional(),
  score_per_question: z.coerce.number().int().positive().optional(),
});

// Combined type for both module types
type CourseFormData = z.infer<typeof courseModuleSchema>;
type AssessmentFormData = z.infer<typeof assessmentModuleSchema>;
type FormData = CourseFormData & AssessmentFormData;

interface Module {
  id: string
  name: string
  type: "Course" | "Assessment"
  created_at?: string
  updated_at?: string
  product_id: string
  configuration?: Record<string, unknown>
  description?: string
}

interface ModuleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  type: "Course" | "Assessment"
  module: Module | null
  onSaved: () => void
}

export function ModuleForm({ open, onOpenChange, productId, type, module, onSaved }: ModuleFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!module
  
  // Dynamically use the appropriate schema based on module type
  const formSchema = type === "Assessment" ? assessmentModuleSchema : courseModuleSchema;
  
  // Extract configuration values for the form
  const moduleConfig = module?.configuration || {};
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: module?.name || "",
      description: module?.description || "",
      time_limit_minutes: type === "Assessment" ? 
        (moduleConfig.time_limit_minutes as number) || 60 : undefined,
      score_per_question: type === "Assessment" ? 
        (moduleConfig.score_per_question as number) || 1 : undefined,
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Prepare the module data
      const moduleData = {
        name: data.name,
        type,
        product_id: productId,
        configuration: type === "Assessment"
          ? {
              time_limit_minutes: data.time_limit_minutes,
              score_per_question: data.score_per_question,
            }
          : {},
        description: data.description || null,
      }
      
      const url = isEditing
        ? `/api/admin/modules/${module.id}`
        : `/api/admin/products/${productId}/modules`
      
      const method = isEditing ? "PATCH" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(moduleData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save module")
      }
      
      toast({
        title: isEditing ? "Module updated" : "Module created",
        description: isEditing
          ? "The module has been updated successfully."
          : "The new module has been created successfully.",
      })
      
      onSaved()
      router.refresh()
    } catch (error) {
      console.error("Error saving module:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "An error occurred while saving the module. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit" : "Create"} {type} Module
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the ${type.toLowerCase()} module details.`
              : `Add a new ${type.toLowerCase()} module to this product.`}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter module name" {...field} />
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
                      placeholder="Describe this module"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {type === "Assessment" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="time_limit_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="score_per_question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score Per Question</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Update Module"
                  : "Create Module"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 