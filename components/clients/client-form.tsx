"use client"

import { useState } from "react"
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
import { toast } from "@/components/ui/use-toast"
import { createClient, updateClient } from "@/app/actions/clientActions"

// Form schema for client creation/editing
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  contact_email: z.string().email({ message: "Invalid email address" }).optional().nullable(),
  address: z.string().optional().nullable(),
})

type FormData = z.infer<typeof formSchema>

interface ClientFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  client?: {
    id: string
    name: string
    contact_email: string | null
    address: string | null
    is_active: boolean
  }
  onSuccess?: () => void
}

export function ClientForm({ open, setOpen, client, onSuccess }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!client

  // Initialize form with existing client data or defaults
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name || "",
      contact_email: client?.contact_email || "",
      address: client?.address || "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      if (isEditing && client) {
        // Update existing client
        await updateClient(client.id, data)
        toast({
          title: "Client updated",
          description: `${data.name} has been updated successfully.`,
        })
      } else {
        // Create new client
        await createClient(data)
        toast({
          title: "Client created",
          description: `${data.name} has been created successfully.`,
        })
      }
      form.reset()
      setOpen(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} client. Please try again.`,
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Client" : "Add New Client"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update client information using the form below."
              : "Create a new client by filling out the form below."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="contact@example.com" 
                      type="email" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Client address" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update Client" : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 