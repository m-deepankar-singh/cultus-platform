"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw
} from "lucide-react"

interface InterviewVideoPlayerProps {
  submission: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onReviewSubmission?: (submission: any) => void
}

export function InterviewVideoPlayer({
  submission,
  open,
  onOpenChange,
  onReviewSubmission,
}: InterviewVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [videoError, setVideoError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [videoSrc, setVideoSrc] = React.useState<string | null>(null)

  const videoRef = React.useRef<HTMLVideoElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Get video URL with fallback to signed URL if needed
  const getVideoUrl = React.useCallback(async () => {
    if (!submission) return null
    
    console.log('🔍 Getting video URL for submission:', {
      submissionId: submission.id,
      video_url: submission.video_url,
      video_storage_path: submission.video_storage_path,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    })
    
    // Try the direct video_url first
    if (submission.video_url) {
      console.log('✅ Using direct video_url from database:', submission.video_url)
      return submission.video_url
    }
    
    // Fallback to constructing URL from storage path
    if (submission.video_storage_path) {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!baseUrl) {
        console.error('❌ NEXT_PUBLIC_SUPABASE_URL environment variable not found')
        return null
      }
      
      const constructedUrl = `${baseUrl}/storage/v1/object/public/interview_recordings/${submission.video_storage_path}`
      console.log('🔧 Constructed video URL from storage path:', {
        baseUrl,
        storagePath: submission.video_storage_path,
        constructedUrl
      })
      return constructedUrl
    }
    
    console.log('❌ No video URL or storage path available')
    return null
  }, [submission])

  // Load video URL when submission changes
  React.useEffect(() => {
    const loadVideo = async () => {
      if (!submission) return
      
      setIsLoading(true)
      setVideoError(null)
      
      try {
        const url = await getVideoUrl()
        if (url) {
          console.log('🎥 Loading video URL:', url)
          
          // Test if the URL is accessible before setting it
          try {
            const response = await fetch(url, { method: 'HEAD' })
            console.log('🔍 Video URL accessibility test:', {
              url,
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries())
            })
            
            if (!response.ok) {
              throw new Error(`Video URL returned ${response.status}: ${response.statusText}`)
            }
          } catch (fetchError) {
            console.error('❌ Video URL not accessible:', fetchError)
            setVideoError(`Video file not accessible: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`)
            setIsLoading(false)
            return
          }
          
          setVideoSrc(url)
        } else {
          setVideoError("No video URL available for this submission")
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error getting video URL:', error)
        setVideoError("Failed to load video URL")
        setIsLoading(false)
      }
    }
    
    loadVideo()
  }, [submission, getVideoUrl])

  // Format time helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get AI verdict badge styling
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'approved':
        return { variant: "default", color: "text-green-600", bgColor: "bg-green-50", icon: <CheckCircle className="h-4 w-4" /> }
      case 'rejected':
        return { variant: "destructive", color: "text-red-600", bgColor: "bg-red-50", icon: <XCircle className="h-4 w-4" /> }
      case 'needs_review':
        return { variant: "secondary", color: "text-orange-600", bgColor: "bg-orange-50", icon: <AlertTriangle className="h-4 w-4" /> }
      default:
        return { variant: "outline", color: "text-gray-600", bgColor: "bg-gray-50", icon: null }
    }
  }

  // Video event handlers
  const handlePlayPause = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const handleMuteToggle = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleFullscreenToggle = () => {
    if (!containerRef.current) return
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
    setIsLoading(false)
    setVideoError(null)
  }

  const handleVideoError = (e: any) => {
    console.error('🚨 Video element error event:', e)
    console.log('🚨 Video element error details:', {
      event: e,
      eventType: e?.type,
      target: e?.target,
      videoSrc: videoRef.current?.src,
      videoError: videoRef.current?.error,
      videoNetworkState: videoRef.current?.networkState,
      videoReadyState: videoRef.current?.readyState
    })
    
    const error = videoRef.current?.error
    let errorMessage = "Failed to load video"
    let debugInfo = ""
    
    if (error) {
      console.log('🔍 Video error object:', {
        code: error.code,
        message: error.message,
        MEDIA_ERR_ABORTED: error.MEDIA_ERR_ABORTED,
        MEDIA_ERR_NETWORK: error.MEDIA_ERR_NETWORK,
        MEDIA_ERR_DECODE: error.MEDIA_ERR_DECODE,
        MEDIA_ERR_SRC_NOT_SUPPORTED: error.MEDIA_ERR_SRC_NOT_SUPPORTED
      })
      
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = "Video loading was aborted"
          debugInfo = "Error code: MEDIA_ERR_ABORTED (1)"
          break
        case error.MEDIA_ERR_NETWORK:
          errorMessage = "Network error while loading video"
          debugInfo = "Error code: MEDIA_ERR_NETWORK (2) - Check internet connection"
          break
        case error.MEDIA_ERR_DECODE:
          errorMessage = "Video format not supported or corrupted"
          debugInfo = "Error code: MEDIA_ERR_DECODE (3) - .webm format issue"
          break
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Video source not supported"
          debugInfo = "Error code: MEDIA_ERR_SRC_NOT_SUPPORTED (4) - URL or format issue"
          break
        default:
          errorMessage = `Unknown video error occurred (code: ${error.code})`
          debugInfo = `Error code: ${error.code}, Message: ${error.message || 'No message'}`
      }
    } else {
      debugInfo = "No error object available from video element"
    }
    
    // Also check network state
    if (videoRef.current) {
      const networkState = videoRef.current.networkState
      const readyState = videoRef.current.readyState
      
      console.log('📊 Video element states:', {
        networkState,
        readyState,
        src: videoRef.current.src,
        currentSrc: videoRef.current.currentSrc
      })
      
      if (networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        debugInfo += " | Network: No source"
      } else if (networkState === HTMLMediaElement.NETWORK_EMPTY) {
        debugInfo += " | Network: Empty"
      } else if (networkState === HTMLMediaElement.NETWORK_IDLE) {
        debugInfo += " | Network: Idle"
      } else if (networkState === HTMLMediaElement.NETWORK_LOADING) {
        debugInfo += " | Network: Loading"
      }
    }
    
    setVideoError(`${errorMessage}${debugInfo ? ` (${debugInfo})` : ''}`)
    setIsLoading(false)
  }

  const handleRetryVideo = () => {
    if (videoRef.current) {
      setVideoError(null)
      setIsLoading(true)
      videoRef.current.load()
    }
  }

  // Fullscreen event listener
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Reset state when submission changes
  React.useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setVideoError(null)
    setIsLoading(true)
  }, [submission?.id])

  if (!submission) return null

  const analysisResult = submission.analysis_result || {}
  const verdictBadge = getVerdictBadge(submission.ai_verdict)
  const hasVideo = videoSrc || submission.video_storage_path

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Interview Review: {submission.student?.full_name || 'Unknown Student'}
          </DialogTitle>
          <DialogDescription>
            Review the interview video and analysis results
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            {/* Main Content: Video and Questions */}
            <ScrollArea className="xl:col-span-2 h-full pr-4">
              <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Interview</CardTitle>
                <CardDescription>
                      {submission.product?.name} - {duration > 0 ? formatTime(duration) : 'Loading...'} duration
                </CardDescription>
              </CardHeader>
              <CardContent>
                    <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden min-h-[300px] aspect-video">
                      {hasVideo && videoSrc ? (
                    <>
                      <video
                        ref={videoRef}
                            className="w-full h-full object-contain"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onError={handleVideoError}
                            src={videoSrc}
                        preload="metadata"
                            controls={false}
                            crossOrigin="anonymous"
                      />
                      
                      {/* Video Controls Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePlayPause}
                            disabled={isLoading || !!videoError}
                            className="text-white hover:bg-white/20"
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          
                          <div className="flex-1 flex items-center gap-2 text-white text-sm">
                            <span>{formatTime(currentTime)}</span>
                            <div className="flex-1 bg-white/30 rounded-full h-1">
                              <div 
                                className="bg-white rounded-full h-1 transition-all"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              />
                            </div>
                            <span>{formatTime(duration)}</span>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMuteToggle}
                            className="text-white hover:bg-white/20"
                          >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleFullscreenToggle}
                            className="text-white hover:bg-white/20"
                          >
                            <Maximize className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                        <div className="h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No video available for this submission</p>
                            {submission.video_storage_path && (
                              <p className="text-sm opacity-75 mt-2">Path: {submission.video_storage_path}</p>
                            )}
                      </div>
                    </div>
                  )}
                  
                  {/* Loading State */}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p>Loading video...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {videoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4">
                          <div className="text-center max-w-md">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                            <p className="mb-2 font-medium">Video Error</p>
                            <p className="text-sm opacity-75 mb-4">{videoError}</p>
                            <Button 
                              onClick={handleRetryVideo}
                              variant="outline" 
                              size="sm"
                              className="text-white border-white hover:bg-white hover:text-black"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry
                            </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Questions Used */}
            {submission.questions_used && Object.keys(submission.questions_used).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Interview Questions</CardTitle>
                  <CardDescription>
                    Questions asked during this interview session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                      {Object.entries(submission.questions_used).map(([index, question]: [string, any]) => (
                        <div key={index} className="flex gap-2 text-sm">
                            <span className="font-medium text-muted-foreground flex-shrink-0">Q{parseInt(index) + 1}:</span>
                            <span className="flex-1">{question.question_text || question.text || (typeof question === 'string' ? question : 'Question text not available')}</span>
                        </div>
                      ))}
                    </div>
                </CardContent>
              </Card>
            )}
          </div>
            </ScrollArea>

          {/* Analysis Results Section */}
            <div className="flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-2">
            {/* AI Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Verdict */}
                <div>
                  <label className="text-sm font-medium">AI Verdict</label>
                  <div className="mt-1">
                    {submission.ai_verdict ? (
                      <Badge variant={verdictBadge.variant as any} className={`${verdictBadge.color} ${verdictBadge.bgColor}`}>
                        {verdictBadge.icon}
                        <span className="ml-1">{submission.ai_verdict}</span>
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not analyzed</span>
                    )}
                  </div>
                </div>

                {/* Confidence Score */}
                {submission.confidence_score !== undefined && (
                  <div>
                    <label className="text-sm font-medium">Confidence Score</label>
                    <div className="mt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 rounded-full h-2 transition-all"
                            style={{ width: `${submission.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(submission.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Feedback */}
                {analysisResult.overall_feedback && (
                  <div>
                    <label className="text-sm font-medium">AI Feedback</label>
                    <ScrollArea className="mt-1 h-24 w-full border rounded p-2">
                      <p className="text-sm">{analysisResult.overall_feedback}</p>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Submission Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Student</label>
                  <p className="text-sm text-muted-foreground">{submission.student?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{submission.student?.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Product</label>
                  <p className="text-sm text-muted-foreground">{submission.product?.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Submitted</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(submission.created_at).toLocaleDateString()}
                  </p>
                </div>

                {submission.tier_when_submitted && (
                  <div>
                    <label className="text-sm font-medium">Tier</label>
                    <p className="text-sm text-muted-foreground">{submission.tier_when_submitted}</p>
                  </div>
                )}

                {submission.background_when_submitted && (
                  <div>
                    <label className="text-sm font-medium">Background</label>
                    <p className="text-sm text-muted-foreground">{submission.background_when_submitted}</p>
                  </div>
                )}

                      {/* Debug info for video URL */}
                      {videoSrc && (
                        <div>
                          <label className="text-sm font-medium">Video URL</label>
                          <p className="text-xs text-muted-foreground break-all">{videoSrc}</p>
                        </div>
                      )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              {submission.requires_manual_review && onReviewSubmission && (
                <Button 
                  onClick={() => onReviewSubmission(submission)} 
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Manual Review
                </Button>
              )}
              
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Analysis
              </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}