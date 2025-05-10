"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { UploadCloud, X, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<string>
  currentImageUrl?: string | null
  onRemove?: () => void
  accept?: string
  maxSizeMB?: number
  className?: string
  disabled?: boolean
}

export function FileUpload({
  onFileUpload,
  currentImageUrl,
  onRemove,
  accept = "image/*",
  maxSizeMB = 5,
  className,
  disabled = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const maxSizeBytes = maxSizeMB * 1024 * 1024 // Convert MB to bytes

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Clear previous errors
    setError(null)

    // Validate file size
    if (file.size > maxSizeBytes) {
      const errorMessage = `Maximum file size is ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
      setError(errorMessage)
      toast({
        title: "File too large",
        description: errorMessage,
        variant: "destructive"
      })
      return
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    
    setIsUploading(true)
    try {
      // Upload file
      const url = await onFileUpload(file)
      toast({
        title: "File uploaded",
        description: "File has been uploaded successfully"
      })
      
      // Update preview with the actual URL
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(url)
    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file. Please try again."
      setError(errorMessage)
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      })
      // Revert preview
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setError(null)
    if (onRemove) onRemove()
  }

  return (
    <div className={`space-y-2 ${className || ""} ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
      {previewUrl ? (
        <div className="relative group w-40 h-40 border rounded-md overflow-hidden">
          <Image 
            src={previewUrl} 
            alt="Uploaded file preview" 
            fill 
            style={{ objectFit: 'contain' }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleRemove}
              type="button"
              disabled={disabled || isUploading}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className={`w-40 h-40 border border-dashed rounded-md flex flex-col items-center justify-center p-4 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} relative`}>
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {disabled ? "Upload disabled" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {accept.replace('*', '')} (max {maxSizeMB}MB)
              </p>
              <input
                type="file"
                accept={accept}
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={disabled || isUploading}
              />
            </>
          )}
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
} 