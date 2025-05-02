"use client"

import { useState, useRef, ChangeEvent } from "react"
import { AlertCircle, CheckCircle, Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

interface VideoUploaderProps {
  onUploadComplete: (videoUrl: string, videoPath: string) => void
  currentVideoUrl?: string
  moduleId?: string
}

export function VideoUploader({ 
  onUploadComplete, 
  currentVideoUrl, 
  moduleId 
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>(currentVideoUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Simulated progress function (actual progress would require special upload handling)
  const simulateProgress = () => {
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 10
        // Cap at 90% until we get actual completion confirmation
        return newProgress < 90 ? newProgress : 90
      })
    }, 300)
    return interval
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setError(null);
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check file type
    if (!selectedFile.type.startsWith('video/')) {
      setError("Please select a valid video file")
      return
    }
    
    // Check file size (max 1GB)
    const MAX_SIZE = 1024 * 1024 * 1000 // 1GB
    if (selectedFile.size > MAX_SIZE) {
      setError(`File size exceeds the 1GB limit (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`)
      return
    }
    
    setFile(selectedFile)
    
    // Clear the current video URL when a new file is selected
    if (videoUrl) {
      setVideoUrl(undefined)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    
    setIsUploading(true)
    setError(null)
    
    // Start progress simulation
    const progressInterval = simulateProgress()
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Add module ID to metadata if available
      if (moduleId) {
        formData.append('moduleId', moduleId)
      }
      
      const response = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData,
      })
      
      clearInterval(progressInterval)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const data = await response.json()
      
      // Complete the progress bar
      setUploadProgress(100)
      
      // Set the video URL from the response
      setVideoUrl(data.publicUrl || data.fullPath)
      
      // Call the callback with the new video URL
      onUploadComplete(data.publicUrl || data.fullPath, data.path)
      
      toast({
        title: "Upload successful",
        description: "Video has been uploaded successfully",
      })
    } catch (err) {
      clearInterval(progressInterval)
      setUploadProgress(0)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : 'An unknown error occurred',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Don't clear the video URL if it's the original one and no file was uploaded
    if (videoUrl && videoUrl !== currentVideoUrl) {
      setVideoUrl(undefined)
      onUploadComplete('', '')
    }
  }

  const handleReplaceVideo = () => {
    setVideoUrl(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
    // Notify parent that video was removed
    onUploadComplete('', '')
  }

  return (
    <div className="space-y-4">
      {/* Video preview, when available */}
      {videoUrl && (
        <div className="rounded-md overflow-hidden border">
          <div className="relative">
            <video 
              src={videoUrl} 
              controls 
              className="w-full h-auto max-h-[400px]"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleReplaceVideo();
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Replace video</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* File selection and upload controls */}
      {!videoUrl && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload"
            />
            
            {!file && (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }}
                  >
                    Select video file
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  MP4 format recommended. Maximum file size: 1GB
                </p>
              </div>
            )}
            
            {file && !isUploading && (
              <div className="mt-2">
                <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                <p className="mt-1 text-sm font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)}MB
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleUpload();
                  }}>
                    Upload video
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemove();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            {isUploading && (
              <div className="mt-2">
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                <p className="mt-1 text-sm font-medium">Uploading...</p>
                <div className="mt-2 w-full">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
} 