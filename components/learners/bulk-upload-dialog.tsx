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
import { Upload, FileUp, AlertCircle, Download, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { read, utils, WorkBook } from "xlsx"
import { BulkUploadPreviewTable } from "./bulk-upload-preview-table"
import { Progress } from "@/components/ui/progress"

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
  client_name?: string
  // Track validation errors for display
  _errors?: Record<string, string>
}

export function BulkUploadDialog({ onLearnersBulkUploaded }: BulkUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [learners, setLearners] = useState<LearnerUploadData[]>([])
  const [hasValidationErrors, setHasValidationErrors] = useState(false)
  const { toast } = useToast()

  // Reset the dialog state
  const resetDialog = () => {
    setError(null)
    setLearners([])
    setFileName(null)
    setFileSize(null)
    setUploadProgress(0)
    setHasValidationErrors(false)
  }

  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

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
    resetDialog()
    setIsUploading(true)
    setFileName(file.name)
    setFileSize(formatFileSize(file.size))
    
    try {
      // Check if it's an Excel file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error("Please upload a valid Excel file (.xlsx or .xls)")
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 200)
      
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
      const response = await fetch("/api/admin/learners/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ learners: jsonData }),
      })
      
      const result = await response.json()
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
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
          variant: "destructive",
          title: "Attention: Validation Issues Found",
          description: "Some entries have validation issues. Please review carefully before uploading.",
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

  // Remove the file and reset
  const handleRemoveFile = () => {
    resetDialog()
    const fileInput = document.getElementById("excel-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
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
    setUploadProgress(0)
    
    // Simulate progress for better UX during batch processing
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.floor(Math.random() * 5) + 1
      })
    }, 500)
    
    try {
      const response = await fetch("/api/admin/learners/bulk-upload", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ learners }),
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload learners")
      }
      
      toast({
        title: "Upload successful",
        description: `Successfully added ${result.successCount} learners.`,
      })
      
      // Reset state and close dialog
      resetDialog()
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
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && (isUploading || isSubmitting)) {
        // Prevent closing while uploading
        return
      }
      setOpen(newOpen)
      if (!newOpen) {
        // Reset when dialog is closed
        resetDialog()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
          
          {!fileName ? (
            /* File upload section - when no file selected */
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
          ) : (
            /* File upload section - when file selected */
            <div className="border rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-muted rounded">
                    <FileUp className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{fileSize}</p>
                  </div>
                </div>
                
                {/* Only show remove button if not uploading or submitting */}
                {!isUploading && !isSubmitting && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveFile}
                    className="text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Show progress bar during upload or submission */}
              {(isUploading || isSubmitting) && (
                <div className="mt-3">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isUploading 
                      ? "Validating data..." 
                      : `Processing ${learners.length} learners...`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
          
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading || isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isUploading || learners.length === 0 || hasValidationErrors}
          >
            {isSubmitting ? "Uploading..." : "Upload Learners"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 