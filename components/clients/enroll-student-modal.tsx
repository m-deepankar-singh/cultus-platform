"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Validation schema based on EnrollStudentSchema from the backend
const enrollStudentSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  full_name: z.string().min(1, { message: "Full name is required" }),
  send_invite: z.boolean().default(true),
})

type EnrollStudentFormValues = z.infer<typeof enrollStudentSchema>

interface EnrollStudentModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  clientId: string
  clientName: string
  onSuccess?: () => void
}

export function EnrollStudentModal({
  open,
  setOpen,
  clientId,
  clientName,
  onSuccess,
}: EnrollStudentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Form definition
  const form = useForm<EnrollStudentFormValues>({
    resolver: zodResolver(enrollStudentSchema),
    defaultValues: {
      email: "",
      full_name: "",
      send_invite: true,
    },
  })

  const onSubmit = async (values: EnrollStudentFormValues) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/staff/clients/${clientId}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`)
      }

      toast({
        title: "Student enrolled successfully",
        description: `${values.full_name} has been enrolled to ${clientName}.${
          values.send_invite ? " An invitation email has been sent." : ""
        }`,
      })

      // Reset form and close modal
      form.reset()
      setOpen(false)
      
      // Call success callback to refresh student list
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Failed to enroll student:", error)
      
      // Check for specific error cases
      if (error.message?.includes("already exists")) {
        toast({
          title: "Enrollment failed",
          description: "A student with this email already exists.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Enrollment failed",
          description: error.message || "Failed to enroll student. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enroll New Student</DialogTitle>
          <DialogDescription>
            Add a new student to {clientName}. The student will be able to access products assigned to this client.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Student full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="student@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="send_invite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send invitation email</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      If checked, the student will receive an email to set up their password.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enrolling..." : "Enroll Student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 