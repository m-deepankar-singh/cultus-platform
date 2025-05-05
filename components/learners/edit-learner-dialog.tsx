"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { Learner } from "./learners-table"

// Form schema for editing a learner
const editLearnerSchema = z.object({
  full_name: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone_number: z.string().optional(),
  client_id: z.string().uuid(),
  is_active: z.boolean().default(true),
})

type EditLearnerFormValues = z.infer<typeof editLearnerSchema>

interface EditLearnerDialogProps {
  isOpen: boolean
  onClose: () => void
  learner: Learner
  clients: { id: string; name: string }[]
  onLearnerUpdated: () => void
}

export function EditLearnerDialog({
  isOpen,
  onClose,
  learner,
  clients,
  onLearnerUpdated,
}: EditLearnerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  // Default form values from the current learner data
  const defaultValues: Partial<EditLearnerFormValues> = {
    full_name: learner.full_name,
    email: learner.email || "",
    phone_number: learner.phone_number || "",
    client_id: learner.client_id,
    is_active: learner.is_active,
  }
  
  const form = useForm<EditLearnerFormValues>({
    resolver: zodResolver(editLearnerSchema),
    defaultValues,
  })
  
  async function onSubmit(data: EditLearnerFormValues) {
    setIsSubmitting(true)
    
    try {
      // Exclude email from the payload since it cannot be changed
      const { email, ...updateData } = data;
      
      const response = await fetch(`/api/admin/learners/${learner.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update learner")
      }
      
      toast({
        title: "Learner updated successfully",
        description: `${data.full_name} has been updated.`,
      })
      
      onLearnerUpdated()
      onClose()
    } catch (error) {
      toast({
        title: "Failed to update learner",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Learner</DialogTitle>
          <DialogDescription>
            Update the learner's information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input 
                      placeholder="john.doe@example.com" 
                      {...field} 
                      disabled 
                    />
                  </FormControl>
                  <FormDescription className="text-yellow-600">
                    Email cannot be changed due to authentication requirements.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients
                        .filter(client => client.id && client.id.trim() !== '')
                        .map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <FormDescription>
                      {field.value ? "Learner is active" : "Learner is inactive"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 