"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, ShieldAlert } from "lucide-react"
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
import { useCurrentUser } from "@/hooks/use-current-user"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

interface StandaloneModuleFormProps {
  type: "Course" | "Assessment"
}

export function StandaloneModuleForm({ type }: StandaloneModuleFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { role, isLoading: isLoadingUser } = useCurrentUser()
  
  // Check if user is admin
  const isAdmin = role === 'Admin'
  
  // Select the appropriate form schema based on module type
  const formSchema = type === "Course" ? courseModuleSchema : assessmentModuleSchema
  
  // Create form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: type === "Course" 
      ? { name: "", description: "", video_url: "" } 
      : { name: "", description: "", time_limit_minutes: 60, pass_threshold: 70 },
  })
  
  // If not admin, redirect back to modules page
  useEffect(() => {
    if (!isLoadingUser && !isAdmin) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only administrators can create modules.",
      })
      router.push('/modules')
    }
  }, [isLoadingUser, isAdmin, router, toast])
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Double-check for admin role before submission
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only administrators can create modules.",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Build the module configuration object based on type
      const configuration = type === "Course" 
        ? { 
            video_url: (data as z.infer<typeof courseModuleSchema>).video_url || null,
            description: data.description || null
          }
        : { 
            time_limit_minutes: (data as z.infer<typeof assessmentModuleSchema>).time_limit_minutes || 60,
            pass_threshold: (data as z.infer<typeof assessmentModuleSchema>).pass_threshold || 70,
            description: data.description || null
          }
      
      // Prepare the module data for API
      const moduleData = {
        name: data.name,
        type,
        description: data.description || null, // We'll send this, but it will be extracted in the API
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
        // Handle empty or invalid JSON responses
        let errorMessage = "Failed to create module";
        try {
          // Try to parse the response as JSON, but handle errors if it's not valid JSON
          const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }
      
      // Handle potential empty response when fetching the successful response data
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error("Error parsing success response:", parseError);
        throw new Error("Received invalid response after creating module");
      }
      
      if (!responseData || !responseData.id) {
        throw new Error("Module was created but received invalid response data");
      }
      
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
  
  // Show loading state while checking user role
  if (isLoadingUser) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="flex justify-center items-center p-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-8">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Only administrators can create modules. You will be redirected to the modules page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
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
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${type}`
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 