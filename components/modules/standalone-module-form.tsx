"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"

// Define the base form schema for all module types
const baseModuleSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
})

// Schema for Course modules
const courseModuleSchema = baseModuleSchema.extend({
  video_url: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
})

// Schema for Assessment modules
const assessmentModuleSchema = baseModuleSchema.extend({
  time_limit_minutes: z.coerce.number().int().positive({ message: "Time limit must be a positive integer" }).optional(),
  pass_threshold: z.coerce.number().int().min(1).max(100, { message: "Pass threshold must be between 1 and 100" }).optional(),
})

// Union type for the form data based on module type
type ModuleFormType = 
  | (z.infer<typeof courseModuleSchema> & { type: "Course" })
  | (z.infer<typeof assessmentModuleSchema> & { type: "Assessment" })

interface StandaloneModuleFormProps {
  type: "Course" | "Assessment"
}

export function StandaloneModuleForm({ type }: StandaloneModuleFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Select the appropriate form schema based on module type
  const formSchema = type === "Course" ? courseModuleSchema : assessmentModuleSchema
  
  // Create form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: type === "Course" 
      ? { name: "", description: "", video_url: "" } 
      : { name: "", description: "", time_limit_minutes: 60, pass_threshold: 70 },
  })
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    
    try {
      // Build the module configuration object based on type
      const configuration = type === "Course" 
        ? { video_url: (data as z.infer<typeof courseModuleSchema>).video_url || null }
        : { 
            time_limit_minutes: (data as z.infer<typeof assessmentModuleSchema>).time_limit_minutes || 60,
            pass_threshold: (data as z.infer<typeof assessmentModuleSchema>).pass_threshold || 70
          }
      
      // Prepare the module data for API
      const moduleData = {
        name: data.name,
        type,
        description: data.description || null,
        configuration,
      }
      
      // Submit to the standalone module creation API
      const response = await fetch("/api/admin/modules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(moduleData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create module")
      }
      
      const responseData = await response.json()
      
      toast({
        title: "Module created successfully",
        description: `Your new ${type.toLowerCase()} module has been created.`,
      })
      
      // Redirect to the module detail page
      router.push(`/modules/${responseData.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error creating module:", error)
      toast({
        variant: "destructive",
        title: "Error creating module",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Create {type} Module</CardTitle>
        <CardDescription>
          {type === "Course" 
            ? "Create a new course module with educational content and resources." 
            : "Create a new assessment module with questions and scoring."}
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter module name" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for your module.
                    </FormDescription>
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
                        placeholder="Enter a brief description of this module"
                        className="resize-none min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a brief overview of what this module covers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Type-specific fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{type} Configuration</h3>
              
              {type === "Course" && (
                <FormField
                  control={form.control}
                  name="video_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/video" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Link to the intro video for this course module.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {type === "Assessment" && (
                <>
                  <FormField
                    control={form.control}
                    name="time_limit_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Limit (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            placeholder="60" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The time limit for completing this assessment.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pass_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pass Threshold (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={100}
                            placeholder="70" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The minimum percentage score required to pass.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/modules")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Module
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 