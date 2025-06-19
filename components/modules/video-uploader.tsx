"use client"

import { useState, useRef, ChangeEvent } from "react"
import { AlertCircle, CheckCircle, Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useDirectUpload } from "@/hooks/useDirectUpload"

interface VideoUploaderProps {
  onUploadComplete: (videoUrl: string, videoPath: string) => void
  currentVideoUrl?: string
  moduleId?: string
}



export function VideoUploader({ 
  onUploadComplete, 
  currentVideoUrl, 
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | undefined>(currentVideoUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Direct upload hook for lesson videos
  const { uploadFile, uploading: isUploading } = useDirectUpload({
    uploadType: 'lessonVideos',
    onProgress: (progress) => {
      setUploadProgress(progress.percentage);
    },
    onSuccess: (result) => {
      setVideoUrl(result.publicUrl);
      onUploadComplete(result.publicUrl, result.key);
      
      toast({
        title: "Upload successful",
        description: "Video has been uploaded successfully",
      });
    },
    onError: (errorMessage) => {
      setError(errorMessage);
      setUploadProgress(0);
      
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: errorMessage,
      });
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setError(null);
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check file type - restrict to MP4 and WebM for S3 compatibility
    if (!selectedFile.type.startsWith('video/') || 
        (!selectedFile.type.includes('mp4') && !selectedFile.type.includes('webm'))) {
      setError("Please select a valid MP4 or WebM video file")
      return
    }
    
    // Check file size (max 500MB for S3 upload)
    const MAX_SIZE = 500 * 1024 * 1024 // 500MB
    if (selectedFile.size > MAX_SIZE) {
      setError(`File size exceeds the 500MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`)
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
    
    setError(null)
    setUploadProgress(0)
    
    try {
      // Upload file directly to R2 using the hook
      await uploadFile(file, {
        moduleId: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for module ID
      });
    } catch (err) {
      // Error handling is done in the hook's onError callback
      console.error('Upload error:', err);
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
              accept="video/mp4,video/webm"
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
                  MP4 or WebM format recommended. Maximum file size: 500MB
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