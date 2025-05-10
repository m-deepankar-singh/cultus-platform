# Bulk Upload Learners Implementation Plan

Based on the analysis of the existing codebase, here's a detailed implementation plan for the bulk learners upload feature.

## Overview
We'll implement a feature that allows admins and staff to upload multiple learners at once via an Excel file. The implementation will leverage existing components and patterns in the codebase.

## 1. Project Setup

- [ ] Install the xlsx package:
  ```bash
  pnpm add xlsx
  ```

## 2. Component Structure

We'll create the following new components:

- [ ] `components/learners/bulk-upload-dialog.tsx` - The main modal dialog for bulk upload
- [ ] `components/learners/bulk-upload-template.tsx` - Component to generate and download the Excel template
- [ ] `components/learners/bulk-upload-preview-table.tsx` - Component to display the parsed Excel data for review

## 3. API Endpoints

We'll create two new API endpoints:

- [ ] `app/api/admin/learners/bulk-upload-template/route.ts` - Endpoint to generate and download the Excel template
- [ ] `app/api/admin/learners/bulk-upload/route.ts` - Endpoint to handle the bulk upload of learners

## 4. Detailed Implementation Steps

### Step 1: Create the Bulk Upload Dialog Component

Create a new file `components/learners/bulk-upload-dialog.tsx`:

```tsx
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileUp, AlertCircle, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { read, utils, WorkBook } from "xlsx"
import { BulkUploadPreviewTable } from "./bulk-upload-preview-table"

interface BulkUploadDialogProps {
  onLearnersBulkUploaded: () => void
}

// Define the structure of learner data from Excel
interface LearnerUploadData {
  full_name: string
  email: string
  phone_number?: string
  client_id: string
  is_active: boolean
  // Track validation errors for display
  _errors?: Record<string, string>
}

export function BulkUploadDialog({ onLearnersBulkUploaded }: BulkUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [learners, setLearners] = useState<LearnerUploadData[]>([])
  const [hasValidationErrors, setHasValidationErrors] = useState(false)
  const { toast } = useToast()

  // Function to download template
  const downloadTemplate = async () => {
    try {
      const response = await fetch("/api/admin/learners/bulk-upload-template", {
        method: "GET",
      })
      
      if (!response.ok) {
        throw new Error("Failed to download template")
      }
      
      // Get the blob from the response
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = "learners_upload_template.xlsx"
      
      // Append to body, click the link, then clean up
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Template downloaded",
        description: "The template has been downloaded successfully.",
      })
    } catch (error) {
      console.error("Template download error:", error)
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download template",
      })
    }
  }

  // Function to handle file upload and parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Reset previous state
    setError(null)
    setIsUploading(true)
    setLearners([])
    setHasValidationErrors(false)
    
    try {
      // Check if it's an Excel file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error("Please upload a valid Excel file (.xlsx or .xls)")
      }
      
      // Read the file
      const data = await file.arrayBuffer()
      const workbook = read(data)
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON
      const jsonData = utils.sheet_to_json<any>(worksheet)
      
      if (jsonData.length === 0) {
        throw new Error("The Excel file is empty or has no valid data")
      }
      
      // Validate the structure (send to API for validation)
      const response = await fetch("/api/admin/learners/bulk-upload/parse-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ learners: jsonData }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to validate the Excel data")
      }
      
      // Check if any learners have validation errors
      const hasErrors = result.learners.some((learner: LearnerUploadData) => 
        learner._errors && Object.keys(learner._errors).length > 0
      )
      
      setLearners(result.learners)
      setHasValidationErrors(hasErrors)
      
      if (hasErrors) {
        toast({
          variant: "warning",
          title: "Validation issues found",
          description: "Some entries have validation issues. Please review before uploading.",
        })
      } else {
        toast({
          title: "File validated",
          description: `${result.learners.length} learners ready to be uploaded.`,
        })
      }
    } catch (error) {
      console.error("File upload error:", error)
      setError(error instanceof Error ? error.message : "Failed to process the Excel file")
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process the Excel file",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Function to submit the validated learners
  const handleSubmit = async () => {
    if (learners.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to upload",
        description: "Please upload an Excel file with learner data first.",
      })
      return
    }
    
    if (hasValidationErrors) {
      toast({
        variant: "destructive",
        title: "Cannot upload",
        description: "Please fix the validation errors before uploading.",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/admin/learners/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ learners }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload learners")
      }
      
      toast({
        title: "Upload successful",
        description: `Successfully added ${result.successCount} learners.`,
      })
      
      // Reset state and close dialog
      setLearners([])
      setOpen(false)
      onLearnersBulkUploaded()
    } catch (error) {
      console.error("Submission error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload learners",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Learners</DialogTitle>
          <DialogDescription>
            Upload multiple learners at once using an Excel file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Template download section */}
          <div className="flex items-center justify-between border p-4 rounded-md">
            <div>
              <h3 className="text-sm font-medium">Need a template?</h3>
              <p className="text-sm text-muted-foreground">
                Download our Excel template with all required fields.
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
          
          {/* File upload section */}
          <div className="border border-dashed rounded-md p-6">
            <div className="flex flex-col items-center gap-2">
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <h3 className="text-sm font-medium">Upload Excel File</h3>
              <p className="text-sm text-muted-foreground text-center">
                Drag & drop your Excel file here, or click to browse
              </p>
              <input
                type="file"
                className="hidden"
                id="excel-upload"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button 
                variant="secondary" 
                onClick={() => document.getElementById("excel-upload")?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Select File"}
              </Button>
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Preview table */}
          {learners.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Preview ({learners.length} learners)</h3>
              <BulkUploadPreviewTable learners={learners} />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || learners.length === 0 || hasValidationErrors}
          >
            {isSubmitting ? "Uploading..." : "Upload Learners"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 2: Create the Bulk Upload Preview Table Component

Create a new file `components/learners/bulk-upload-preview-table.tsx`:

```tsx
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LearnerUploadData {
  full_name: string
  email: string
  phone_number?: string
  client_id: string
  client_name?: string // Add this for display in the table
  is_active: boolean
  _errors?: Record<string, string>
}

interface BulkUploadPreviewTableProps {
  learners: LearnerUploadData[]
}

export function BulkUploadPreviewTable({ learners }: BulkUploadPreviewTableProps) {
  // Calculate if we need pagination (e.g., if more than 10 rows)
  const needsPagination = learners.length > 10
  const displayLearners = needsPagination ? learners.slice(0, 10) : learners
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Validation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayLearners.map((learner, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{learner.full_name}</TableCell>
              <TableCell>{learner.email}</TableCell>
              <TableCell>{learner.phone_number || "—"}</TableCell>
              <TableCell>{learner.client_name || "Unknown"}</TableCell>
              <TableCell>
                <Badge variant={learner.is_active ? "success" : "secondary"}>
                  {learner.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {learner._errors && Object.keys(learner._errors).length > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center text-destructive">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span>Error</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <ul className="list-disc pl-4">
                          {Object.entries(learner._errors).map(([field, error]) => (
                            <li key={field}>
                              <span className="font-medium">{field}:</span> {error}
                            </li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Valid
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {needsPagination && (
        <div className="px-4 py-2 text-sm text-muted-foreground">
          Showing 10 of {learners.length} entries. All entries will be uploaded.
        </div>
      )}
    </div>
  )
}
```

### Step 3: Update the Learners Header Component

Modify `components/learners/learners-header.tsx` to include the bulk upload button:

```tsx
"use client"

import { useEffect, useState } from "react"
import { AddLearnerDialog } from "./add-learner-dialog"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { useToast } from "@/components/ui/use-toast"

interface Client {
  id: string
  name: string
}

export function LearnersHeader() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/admin/clients")
        if (!response.ok) {
          throw new Error("Failed to fetch clients")
        }
        const data = await response.json()
        setClients(data)
      } catch (error) {
        console.error("Error fetching clients:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load clients. Some features may be limited."
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [toast])

  const handleLearnerAdded = () => {
    // This will be called after a learner is added successfully
    // We could emit an event or use a global state store to trigger a refresh
    // of the learners table, but for now we'll just rely on the Suspense boundary
    // to refetch the data when the page is navigated to again
    document.dispatchEvent(new CustomEvent('learnerAdded'))
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Learners</h1>
        <p className="text-muted-foreground">Manage learners and view their progress.</p>
      </div>
      <div className="flex items-center gap-2">
        <BulkUploadDialog onLearnersBulkUploaded={handleLearnerAdded} />
        <AddLearnerDialog 
          clients={clients} 
          onLearnerAdded={handleLearnerAdded} 
        />
      </div>
    </div>
  )
}
```

### Step 4: Create API Endpoint for Template Generation

Create a new file `app/api/admin/learners/bulk-upload-template/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { utils, write } from 'xlsx';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/learners/bulk-upload-template
 * 
 * Generates and returns an Excel template for bulk learner upload.
 * Only accessible by Admin and Staff roles.
 */
export async function GET(request: Request) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
      const status = sessionError?.message.includes('No active user session') ? 401 : 403;
      return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!role || !["Admin", "Staff"].includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Get client list for the template
    const supabase = await createClient();
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
      
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch clients for template' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Create workbook with sample data and instructions
    const wb = utils.book_new();
    
    // Create the main template sheet
    const templateData = [
      {
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone_number: '1234567890',
        client_id: clients[0]?.id || '',
        is_active: true
      },
      {
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone_number: '', // Example of optional field
        client_id: clients[0]?.id || '',
        is_active: true
      }
    ];
    
    const template = utils.json_to_sheet(templateData);
    utils.book_append_sheet(wb, template, 'Learners');
    
    // Add client reference sheet
    const clientsData = clients.map((client) => ({
      client_id: client.id,
      client_name: client.name
    }));
    
    const clientsSheet = utils.json_to_sheet(clientsData);
    utils.book_append_sheet(wb, clientsSheet, 'Clients Reference');
    
    // Add instructions sheet
    const instructionsData = [
      { field: 'Field', description: 'Description', required: 'Required', example: 'Example' },
      { field: 'full_name', description: 'Full name of the learner', required: 'Yes', example: 'John Doe' },
      { field: 'email', description: 'Email address of the learner', required: 'Yes', example: 'john.doe@example.com' },
      { field: 'phone_number', description: 'Phone number of the learner (no + prefix)', required: 'No', example: '1234567890' },
      { field: 'client_id', description: 'ID of the client (see Clients Reference sheet)', required: 'Yes', example: clients[0]?.id || 'abc123' },
      { field: 'is_active', description: 'Whether the learner is active (true/false)', required: 'Yes', example: 'true' }
    ];
    
    const instructionsSheet = utils.json_to_sheet(instructionsData);
    utils.book_append_sheet(wb, instructionsSheet, 'Instructions');
    
    // 4. Generate Excel file
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'buffer' });
    
    // 5. Return the Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="learners_upload_template.xlsx"'
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Step 5: Create API Endpoint for Excel Preview/Validation

Create a new file `app/api/admin/learners/bulk-upload/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { z } from 'zod';
import { sendLearnerWelcomeEmail } from '@/lib/email/service';

// Schema for validating each learner
const LearnerSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email format" }),
  phone_number: z.string()
    .optional()
    .nullable()
    .refine(val => !val || !val.includes('+'), { 
      message: "Phone number should not include the '+' prefix" 
    }),
  client_id: z.string().uuid({ message: "Invalid client ID format" }),
  is_active: z.union([
    z.boolean(),
    z.string().transform(val => val.toLowerCase() === 'true')
  ])
});

// Schema for the bulk upload request
const BulkUploadSchema = z.object({
  learners: z.array(z.any())
});

/**
 * POST /api/admin/learners/bulk-upload/parse-preview
 * 
 * Validates and previews the uploaded Excel data.
 * Returns the parsed data with validation errors if any.
 */
export async function POST(request: Request) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
      const status = sessionError?.message.includes('No active user session') ? 401 : 403;
      return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!role || !["Admin", "Staff"].includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate the request body
    const body = await request.json();
    const validation = BulkUploadSchema.safeParse(body);
    
    if (!validation.success) {
      return new NextResponse(JSON.stringify({ 
        error: "Validation error", 
        details: validation.error.format() 
      }), { status: 400 });
    }
    
    const { learners: uploadedLearners } = validation.data;
    
    // 3. Get client list for validation and display
    const supabase = await createClient();
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');
      
    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch clients for validation' }), {
        status: 500
      });
    }
    
    // Create a map of client IDs to names for quick lookup
    const clientMap = clients.reduce((map, client) => {
      map[client.id] = client.name;
      return map;
    }, {} as Record<string, string>);
    
    // 4. Process and validate each learner
    const processedLearners = uploadedLearners.map((learner: any) => {
      // Add client name for display if client_id is valid
      const clientName = learner.client_id && clientMap[learner.client_id];
      const processedLearner = {
        ...learner,
        client_name: clientName
      };
      
      // Validate against schema
      const validation = LearnerSchema.safeParse(learner);
      
      if (!validation.success) {
        // Extract and format validation errors
        const errors = validation.error.format();
        const formattedErrors: Record<string, string> = {};
        
        Object.entries(errors).forEach(([key, value]) => {
          if (key !== '_errors' && Array.isArray(value._errors) && value._errors.length > 0) {
            formattedErrors[key] = value._errors[0];
          }
        });
        
        // Add error if client_id exists but is not in our client list
        if (learner.client_id && !clientMap[learner.client_id]) {
          formattedErrors.client_id = "Client ID does not exist in the system";
        }
        
        return {
          ...processedLearner,
          _errors: formattedErrors
        };
      }
      
      // Add error if client_id exists but is not in our client list
      if (learner.client_id && !clientMap[learner.client_id]) {
        return {
          ...processedLearner,
          _errors: {
            client_id: "Client ID does not exist in the system"
          }
        };
      }
      
      // Check for duplicate emails within the batch
      const duplicateIndex = uploadedLearners.findIndex((l: any) => 
        l !== learner && l.email === learner.email
      );
      
      if (duplicateIndex !== -1) {
        return {
          ...processedLearner,
          _errors: {
            email: "Duplicate email found in the upload batch"
          }
        };
      }
      
      return processedLearner;
    });
    
    // 5. Return the processed data
    return NextResponse.json({ learners: processedLearners });
    
  } catch (error) {
    console.error('API Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500
    });
  }
}

/**
 * POST /api/admin/learners/bulk-upload
 * 
 * Handles the final submission of bulk learner data.
 * Creates accounts for all validated learners.
 */
export async function PUT(request: Request) {
  try {
    // 1. Authentication & Authorization
    const { user, profile, role, error: sessionError } = await getUserSessionAndRole();

    if (sessionError || !user || !profile) {
      const status = sessionError?.message.includes('No active user session') ? 401 : 403;
      return new NextResponse(JSON.stringify({ error: sessionError?.message || 'Unauthorized or profile missing' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!role || !["Admin", "Staff"].includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate the request body
    const body = await request.json();
    const { learners } = body;
    
    if (!Array.isArray(learners) || learners.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'No learners provided' }), {
        status: 400
      });
    }
    
    // 3. Set up clients
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // 4. Check for existing emails in the database
    const emails = learners.map(learner => learner.email);
    const { data: existingLearners, error: existingCheckError } = await supabase
      .from('students')
      .select('email')
      .in('email', emails);
      
    if (existingCheckError) {
      console.error('Error checking existing learners:', existingCheckError);
      return new NextResponse(JSON.stringify({ error: 'Failed to check for existing learners' }), {
        status: 500
      });
    }
    
    const existingEmails = new Set(existingLearners.map(student => student.email));
    
    // 5. Filter out learners with existing emails
    const newLearners = learners.filter(learner => !existingEmails.has(learner.email));
    
    if (newLearners.length === 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'All emails already exist in the system',
        existingCount: existingEmails.size
      }), { status: 400 });
    }
    
    // 6. Process each new learner
    const successfulLearners = [];
    const failedLearners = [];
    
    for (const learner of newLearners) {
      try {
        // Generate random password
        const generateRandomPassword = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
          let password = '';
          for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return password;
        };
        
        const randomPassword = generateRandomPassword();
        
        // Create auth user
        const { data: authUser, error: createAuthError } = await serviceClient.auth.admin.createUser({
          email: learner.email,
          password: randomPassword,
          email_confirm: true
        });
        
        if (createAuthError || !authUser.user) {
          throw new Error(createAuthError?.message || 'Failed to create auth user');
        }
        
        // Create student record
        const { data: newLearner, error: createError } = await supabase
          .from('students')
          .insert({
            id: authUser.user.id,
            full_name: learner.full_name,
            email: learner.email,
            phone_number: learner.phone_number,
            client_id: learner.client_id,
            is_active: learner.is_active,
            temporary_password: randomPassword
          })
          .select()
          .single();
          
        if (createError) {
          // If student creation fails, delete the auth user
          await serviceClient.auth.admin.deleteUser(authUser.user.id);
          throw new Error(createError.message || 'Failed to create learner record');
        }
        
        // Send welcome email
        try {
          await sendLearnerWelcomeEmail(
            learner.email, 
            randomPassword,
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
          );
        } catch (emailError) {
          console.error(`Error sending welcome email to ${learner.email}:`, emailError);
          // We continue even if email fails, but log it
        }
        
        // Add to successful learners
        successfulLearners.push(newLearner);
        
      } catch (error) {
        console.error(`Error processing learner ${learner.email}:`, error);
        failedLearners.push({
          email: learner.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // 7. Return the results
    return NextResponse.json({
      successCount: successfulLearners.length,
      failedCount: failedLearners.length,
      existingCount: existingEmails.size,
      failed: failedLearners
    });
    
  } catch (error) {
    console.error('API Error:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500
    });
  }
}
```

## 5. Testing Plan

1. **Unit Testing:**
   - Test the Excel parsing logic with valid and invalid files
   - Test the validation logic for learner data
   - Test the API endpoints with different scenarios

2. **Manual Testing:**
   - Test downloading the Excel template
   - Test uploading an Excel file with valid data
   - Test uploading an Excel file with invalid data (missing required fields, invalid email format, etc.)
   - Test the preview table display and validation errors
   - Test the final submission of valid learner data
   - Test the permission checks (only admin and staff should be able to access the feature)

## 6. Deployment

1. **Package Installation:**
   - Install the xlsx package
   - Ensure the package is included in the deployment

2. **Environment Configuration:**
   - Verify all required environment variables for email sending are configured
   - Test email sending for newly created learners

3. **Release Notes:**
   - Document the new bulk upload feature in the release notes
   - Include instructions on how to use the feature 