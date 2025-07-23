'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseVideoThumbnailOptions {
  videoUrl: string
  timeStamp?: number // Default: 1 second
  quality?: number // Default: 0.8
  width?: number // Default: video width
  height?: number // Default: video height
}

interface VideoThumbnailState {
  thumbnailUrl: string | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

export function useVideoThumbnail({
  videoUrl,
  timeStamp = 1,
  quality = 0.8,
  width,
  height
}: UseVideoThumbnailOptions): VideoThumbnailState {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const generateThumbnail = useCallback(async () => {
    if (!videoUrl) return

    setIsLoading(true)
    setError(null)

    try {
      // Create video element if it doesn't exist
      if (!videoRef.current) {
        videoRef.current = document.createElement('video')
        videoRef.current.crossOrigin = 'anonymous'
      }

      // Create canvas if it doesn't exist
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      return new Promise<void>((resolve, reject) => {
        const handleSeeked = () => {
          try {
            // Set canvas dimensions
            const videoWidth = width || video.videoWidth
            const videoHeight = height || video.videoHeight
            
            canvas.width = videoWidth
            canvas.height = videoHeight

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

            // Convert canvas to blob and create URL
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob)
                  setThumbnailUrl(url)
                  resolve()
                } else {
                  reject(new Error('Failed to create thumbnail blob'))
                }
              },
              'image/jpeg',
              quality
            )
          } catch (err) {
            reject(err)
          }
        }

        const handleError = () => {
          reject(new Error('Failed to load video for thumbnail generation'))
        }

        const handleLoadedMetadata = () => {
          // Seek to the specified timestamp
          video.currentTime = Math.min(timeStamp, video.duration || timeStamp)
        }

        // Set up event listeners
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('error', handleError)
        video.addEventListener('loadedmetadata', handleLoadedMetadata)

        // Load the video
        video.src = videoUrl
        video.load()

        // Cleanup function
        const cleanup = () => {
          video.removeEventListener('seeked', handleSeeked)
          video.removeEventListener('error', handleError)
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        }

        // Set up cleanup timeout
        setTimeout(() => {
          cleanup()
          reject(new Error('Thumbnail generation timed out'))
        }, 10000) // 10 second timeout
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [videoUrl, timeStamp, quality, width, height])

  const retry = useCallback(() => {
    generateThumbnail()
  }, [generateThumbnail])

  // Generate thumbnail when video URL changes
  useEffect(() => {
    if (videoUrl) {
      generateThumbnail()
    }

    // Cleanup previous thumbnail URL
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl)
      }
    }
  }, [videoUrl, generateThumbnail])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl)
      }
    }
  }, [thumbnailUrl])

  return {
    thumbnailUrl,
    isLoading,
    error,
    retry
  }
}