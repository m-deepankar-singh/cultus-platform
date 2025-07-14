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
import { read, utils } from "xlsx"
import { BulkUploadQuestionPreviewTable } from "./bulk-upload-question-preview-table"
import { Progress } from "@/components/ui/progress"

interface BulkUploadQuestionDialogProps {
  onQuestionsBulkUploaded: () => void
}

// Define the structure of question data from Excel
interface QuestionUploadData {
  question_text: string
  question_type: 'MCQ' | 'MSQ'
  options: { id: string; text: string }[]
  correct_answer: string | { answers: string[] }
  topic?: string | null
  difficulty?: string | null
  _row_number?: number
  // Track validation errors for display
  _errors?: Record<string, string>
}

export function BulkUploadQuestionDialog({ onQuestionsBulkUploaded }: BulkUploadQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuestionUploadData[]>([])
  const [hasValidationErrors, setHasValidationErrors] = useState(false)
  const { toast } = useToast()

  // Reset the dialog state
  const resetDialog = () => {
    setError(null)
    setQuestions([])
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
      const response = await fetch("/api/admin/question-banks/bulk-upload-template", {
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
      a.download = "question_banks_upload_template.xlsx"
      
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
    setQuestions([])
    setHasValidationErrors(false)
    setUploadProgress(0)
    setFileName(file.name)
    setFileSize(formatFileSize(file.size))
    
    try {
      // Check if it's an Excel file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error("Please upload a valid Excel file (.xlsx or .xls)")
      }
      
      setUploadProgress(20)
      
      // Read the file
      const data = await file.arrayBuffer()
      const workbook = read(data)
      
      setUploadProgress(40)
      
      // Get the first sheet (should be the Questions sheet)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON
      const jsonData = utils.sheet_to_json<any>(worksheet)
      
      setUploadProgress(60)
      
      if (jsonData.length === 0) {
        throw new Error("The Excel file is empty or has no valid data")
      }
      
      setUploadProgress(80)
      
      // Validate the structure (send to API for validation)
      const response = await fetch("/api/admin/question-banks/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions: jsonData }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to validate the Excel data")
      }
      
      setUploadProgress(100)
      
      // Check if any questions have validation errors
      const hasErrors = result.questions.some((question: QuestionUploadData) => 
        question._errors && Object.keys(question._errors).length > 0
      )
      
      setQuestions(result.questions)
      setHasValidationErrors(hasErrors)
      
      if (hasErrors) {
        toast({
          title: "Validation issues found",
          description: "Some questions have validation issues. Please review before uploading.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "File validated",
          description: `${result.questions.length} questions ready to be uploaded.`,
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
      setUploadProgress(0)
    }
  }

  // Function to submit the validated questions
  const handleSubmit = async () => {
    if (questions.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to upload",
        description: "Please upload an Excel file with question data first.",
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
      const response = await fetch("/api/admin/question-banks/bulk-upload", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload questions")
      }
      
      const successMessage = result.failedCount > 0 
        ? `Successfully added ${result.successCount} questions. ${result.failedCount} failed.`
        : `Successfully added ${result.successCount} questions.`
      
      toast({
        title: "Upload completed",
        description: successMessage,
        variant: result.failedCount > 0 ? "destructive" : "default"
      })
      
      // Reset state and close dialog
      setQuestions([])
      setOpen(false)
      resetDialog()
      onQuestionsBulkUploaded()
    } catch (error) {
      console.error("Submission error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload questions",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to clear the current upload
  const handleClear = () => {
    resetDialog()
    // Reset file input
    const fileInput = document.getElementById("excel-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const validQuestionCount = questions.filter(q => !q._errors || Object.keys(q._errors).length === 0).length
  const errorQuestionCount = questions.length - validQuestionCount

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Questions</DialogTitle>
          <DialogDescription>
            Upload multiple questions at once using an Excel file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Template download section */}
          <div className="flex items-center justify-between border p-4 rounded-md">
            <div>
              <h3 className="text-sm font-medium">Need a template?</h3>
              <p className="text-sm text-muted-foreground">
                Download our Excel template with sample questions and instructions.
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
              
              {fileName && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">({fileSize})</span>
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {isUploading && (
                <div className="w-full max-w-xs">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    Processing... {uploadProgress}%
                  </p>
                </div>
              )}
              
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
                {isUploading ? "Processing..." : "Select File"}
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
          
          {/* Summary stats */}
          {questions.length > 0 && (
            <div className="flex gap-4 p-4 bg-muted rounded-md">
              <div className="text-sm">
                <span className="font-medium">Total:</span> {questions.length}
              </div>
              <div className="text-sm text-green-600">
                <span className="font-medium">Valid:</span> {validQuestionCount}
              </div>
              {errorQuestionCount > 0 && (
                <div className="text-sm text-red-600">
                  <span className="font-medium">Errors:</span> {errorQuestionCount}
                </div>
              )}
            </div>
          )}
          
          {/* Preview table */}
          {questions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">
                Preview ({questions.length} questions)
              </h3>
              <BulkUploadQuestionPreviewTable questions={questions} />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || questions.length === 0 || hasValidationErrors}
          >
            {isSubmitting ? "Uploading..." : `Upload ${validQuestionCount} Questions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}