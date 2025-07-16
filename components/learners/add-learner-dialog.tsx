"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

// Define form schema
const formSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone_number: z.string().optional(),
  client_id: z.string().uuid({ message: "Please select a client." }),
  is_active: z.boolean().default(true),
  job_readiness_background_type: z.enum([
    'ECONOMICS', 
    'COMPUTER_SCIENCE', 
    'MARKETING', 
    'DESIGN', 
    'HUMANITIES', 
    'BUSINESS_ADMINISTRATION', 
    'DATA_SCIENCE',
    'ENGINEERING',
    'HEALTHCARE',
    'OTHER'
  ], { message: "Please select a background type." }),
})

type FormValues = z.infer<typeof formSchema>

interface Client {
  id: string
  name: string
}

interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

interface AddLearnerDialogProps {
  clients: Client[]
  onLearnerAdded: () => void
}

export function AddLearnerDialog({ clients: initialClients, onLearnerAdded }: AddLearnerDialogProps) {
  const [open, setOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Add debugging log when clients prop changes
  useEffect(() => {
    console.log("AddLearnerDialog: Received clients prop:", { 
      type: typeof initialClients,
      isArray: Array.isArray(initialClients), 
      length: initialClients?.length,
      initialClients
    })
    
    // Update internal state with the prop if it's valid
    if (Array.isArray(initialClients) && initialClients.length > 0) {
      setClients(initialClients)
    }
  }, [initialClients])
  
  // Fetch clients when dialog is opened
  useEffect(() => {
    if (open && (!Array.isArray(clients) || clients.length === 0)) {
      fetchClients()
    }
  }, [open, clients])
  
  // Function to fetch clients directly in this component
  const fetchClients = async () => {
    setIsLoadingClients(true)
    try {
      console.log("AddLearnerDialog: Fetching clients directly")
      const response = await fetch("/api/admin/clients?pageSize=100")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.status}`)
      }
      
      const data = await response.json() as PaginatedResponse<Client>
      console.log("AddLearnerDialog: Fetched clients:", data)
      
      if (Array.isArray(data.data) && data.data.length > 0) {
        setClients(data.data)
      } else {
        toast({
          variant: "destructive",
          title: "Warning",
          description: "No clients available. Please add a client before adding learners."
        })
      }
    } catch (error) {
      console.error("AddLearnerDialog: Error fetching clients:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load clients. Please try again."
      })
    } finally {
      setIsLoadingClients(false)
    }
  }
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      is_active: true,
    },
  })

  // Clear email error when user types in email field
  const handleEmailChange = (value: string) => {
    if (emailError) {
      setEmailError(null)
    }
    form.setValue('email', value)
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/learners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      // Parse the response data
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to add learner")
      }
      
      // Get the temporary password from the response
      const password = data.temporary_password
      console.log("Temporary password received:", password)

      // Store the password and show success dialog
      setTempPassword(password)
      form.reset()
      setEmailError(null) // Clear any email errors on success
      setOpen(false)
      setSuccessOpen(true)
      
      // Also notify with a toast
      toast({
        title: "Learner added successfully",
        description: "Please note the temporary password in the dialog."
      })
      
      onLearnerAdded()
    } catch (error) {
      console.error("Error adding learner:", error)
      
      // Handle specific error cases
      let errorMessage = "Failed to add learner. Please try again."
      let errorTitle = "Error"
      
      if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes("learner with this email already exists")) {
          errorTitle = "Email Already Exists"
          errorMessage = "A learner with this email address already exists. Please use a different email address."
          // Set field-level error for better UX
          setEmailError("This email address is already in use")
          // Also set form error for the email field
          form.setError('email', {
            type: 'manual',
            message: 'This email address is already in use'
          })
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (isOpen) {
          // Clear email error when opening dialog
          setEmailError(null)
          if (!Array.isArray(clients) || clients.length === 0) {
            // Force fetch clients when opening the dialog if we don't have them
            fetchClients()
          }
        }
      }}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Learner
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Learner</DialogTitle>
          <DialogDescription>
            Create a new learner account. The learner will receive 
            an email with login instructions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                      placeholder="johndoe@example.com" 
                      type="email" 
                      {...field}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={emailError ? "border-destructive focus:border-destructive" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                  {emailError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <span className="text-xs">⚠️</span>
                      {emailError}
                    </p>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingClients ? (
                        <SelectItem value="loading" disabled>
                          Loading clients...
                        </SelectItem>
                      ) : Array.isArray(clients) && clients.length > 0 ? (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clients" disabled>
                          No clients available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="job_readiness_background_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select background type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ECONOMICS">Economics</SelectItem>
                      <SelectItem value="COMPUTER_SCIENCE">Computer Science</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="DESIGN">Design</SelectItem>
                      <SelectItem value="HUMANITIES">Humanities</SelectItem>
                      <SelectItem value="BUSINESS_ADMINISTRATION">Business Administration</SelectItem>
                      <SelectItem value="DATA_SCIENCE">Data Science</SelectItem>
                      <SelectItem value="ENGINEERING">Engineering</SelectItem>
                      <SelectItem value="HEALTHCARE">Healthcare</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
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
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Learner will be able to login immediately
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Learner"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Success Dialog to display the password */}
    <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-green-600">Learner Added Successfully</DialogTitle>
          <DialogDescription>
            The learner account has been created. Please save the temporary password to share with the learner.
          </DialogDescription>
        </DialogHeader>
        <div className="my-6 p-4 bg-muted rounded-md border">
          <div className="text-sm mb-2 font-medium">Temporary Password:</div>
          <div className="font-mono text-lg bg-background p-3 rounded border flex justify-between items-center">
            <code className="select-all">{tempPassword}</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                toast({
                  title: "Password copied",
                  description: "Password has been copied to clipboard",
                });
              }}
            >
              Copy
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={() => {
              setSuccessOpen(false);
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}