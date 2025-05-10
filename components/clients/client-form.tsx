"use client"

import { useState, useEffect } from "react"
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
import { FileUpload } from "@/components/ui/file-upload"
import { uploadClientLogo } from "@/lib/supabase/upload-helpers"

// Form schema for client creation/editing
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  contact_email: z.string().email({ message: "Invalid email address" }).optional().nullable(),
  address: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
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
    logo_url: string | null
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
      logo_url: client?.logo_url || "",
    },
  })

  // Effect to reset form when client prop changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: client?.name || "",
        contact_email: client?.contact_email || "",
        address: client?.address || "",
        logo_url: client?.logo_url || null, // Ensure logo_url is null if no logo
      })
    } else {
      // Optional: Reset form when dialog closes to clear state
      form.reset({
        name: "",
        contact_email: "",
        address: "",
        logo_url: null,
      })
    }
  }, [client, open, form])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      console.log('Submitting form with data:', data)
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
      form.reset() // Reset after successful submission
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

  // Handle logo upload
  const handleLogoUpload = async (file: File): Promise<string> => {
    try {
      // For existing clients, use their ID as the folder path
      const url = await uploadClientLogo(file, client?.id)
      console.log('Logo uploaded successfully, URL:', url)
      
      // Update the form with the new logo URL
      form.setValue("logo_url", url, { shouldValidate: true, shouldDirty: true })
      return url
    } catch (error) {
      console.error("Logo upload error:", error)
      throw error
    }
  }

  // Handle logo removal
  const handleLogoRemove = () => {
    console.log('Logo removed from form')
    form.setValue("logo_url", null, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        // Reset form explicitly when dialog is closed via 'x' or overlay click
        form.reset({
          name: "",
          contact_email: "",
          address: "",
          logo_url: null,
        })
      }
    }}>
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
            
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Logo</FormLabel>
                  <FormControl>
                    <FileUpload
                      currentImageUrl={field.value}
                      onFileUpload={handleLogoUpload}
                      onRemove={handleLogoRemove}
                      accept="image/*"
                      maxSizeMB={1}
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
                onClick={() => {
                  setOpen(false)
                  // Reset form when cancel button is clicked
                  form.reset({
                    name: "",
                    contact_email: "",
                    address: "",
                    logo_url: null,
                  })
                }}
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