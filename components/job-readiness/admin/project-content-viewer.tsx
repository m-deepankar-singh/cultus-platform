"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { ProjectAIFeedbackDisplay } from "./project-ai-feedback-display"
import { 
  FileText, 
  Link as LinkIcon, 
  Download, 
  ExternalLink, 
  AlertTriangle, 
  User, 
  Calendar, 
  Tag, 
  Star,
  ChevronRight,
  CheckCircle,
  XCircle,
  File,
  Clipboard
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProjectContentViewerProps {
  submission: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegrade?: (submission: any) => void
}

export function ProjectContentViewer({
  submission,
  open,
  onOpenChange,
  onRegrade,
}: ProjectContentViewerProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = React.useState(false)

  if (!submission) return null

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'text-green-600 bg-green-50 border-green-200'
      case 'submitted': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSubmissionTypeIcon = (type: string) => {
    switch (type) {
      case 'text_input': return <FileText className="h-4 w-4" />
      case 'url_submission': return <LinkIcon className="h-4 w-4" />
      case 'file_upload': return <File className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleExportContent = async () => {
    try {
      setIsExporting(true)
      
      // Create downloadable content
      const content = {
        student: submission.student?.full_name,
        email: submission.student?.email,
        product: submission.product?.name,
        project_title: submission.project_title,
        project_type: submission.project_type,
        background_type: submission.background_type,
        submission_type: submission.submission_type,
        status: submission.status,
        score: submission.score,
        passed: submission.passed,
        feedback: submission.feedback,
        project_description: submission.project_description,
        submission_content: submission.submission_content,
        submission_url: submission.submission_url,
        tasks: submission.tasks,
        deliverables: submission.deliverables,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
      }

      const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-submission-${submission.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Content Exported",
        description: "Project submission data has been downloaded.",
      })
    } catch (error) {
      console.error("Failed to export content:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to Clipboard",
        description: `${label} has been copied to your clipboard.`,
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      })
    }
  }

  const renderContentSection = () => {
    switch (submission.submission_type) {
      case 'text_input':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submission Content
              </CardTitle>
              <CardDescription>
                Text-based project submission
                {submission.content_truncated && (
                  <Badge variant="outline" className="ml-2">
                    Content Truncated ({formatFileSize(submission.original_content_length || 0)})
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission.submission_content ? (
                <div className="space-y-4">
                  <ScrollArea className="h-64 w-full border rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                      {submission.submission_content}
                    </pre>
                  </ScrollArea>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyToClipboard(submission.submission_content, "Submission content")}
                  >
                    <Clipboard className="h-4 w-4 mr-2" />
                    Copy Content
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No content available for this submission.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )

      case 'url_submission':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                URL Submission
              </CardTitle>
              <CardDescription>
                External link or repository submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission.submission_url ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">Submitted URL:</span>
                    </div>
                    <a
                      href={submission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {submission.submission_url}
                    </a>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(submission.submission_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(submission.submission_url, "URL")}
                    >
                      <Clipboard className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                  </div>

                  {submission.submission_content && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2">Additional Description:</h4>
                        <ScrollArea className="h-32 w-full border rounded-lg p-3">
                          <p className="text-sm leading-relaxed">{submission.submission_content}</p>
                        </ScrollArea>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No URL provided for this submission.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )

      case 'file_upload':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <File className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Uploaded file submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission.file_path || submission.submission_content ? (
                <div className="space-y-4">
                  {submission.file_path && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <File className="h-4 w-4" />
                        <span className="text-sm font-medium">File Path:</span>
                      </div>
                      <p className="text-sm font-mono break-all">{submission.file_path}</p>
                    </div>
                  )}

                  {submission.submission_content && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">File Content Preview:</h4>
                      <ScrollArea className="h-48 w-full border rounded-lg p-3">
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap">
                          {submission.submission_content}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportContent}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Download Content'}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No file content available for this submission.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )

      default:
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unknown submission type: {submission.submission_type}
            </AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSubmissionTypeIcon(submission.submission_type)}
            Project Review: {submission.project_title || 'Untitled Project'}
          </DialogTitle>
          <DialogDescription>
            Review project submission details and content
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Details Section */}
          <div className="space-y-4">
            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Name:</span>
                  <p className="text-sm text-muted-foreground">{submission.student?.full_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <p className="text-sm text-muted-foreground">{submission.student?.email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Product:</span>
                  <p className="text-sm text-muted-foreground">{submission.product?.name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Project Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Project Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Type:</span>
                    <p className="text-sm text-muted-foreground capitalize">
                      {submission.project_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Background:</span>
                    <p className="text-sm text-muted-foreground capitalize">
                      {submission.background_type?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <div className="mt-1">
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status === 'graded' && submission.passed && <CheckCircle className="h-3 w-3 mr-1" />}
                      {submission.status === 'graded' && !submission.passed && <XCircle className="h-3 w-3 mr-1" />}
                      {submission.status}
                    </Badge>
                  </div>
                </div>

                {submission.score !== undefined && (
                  <div>
                    <span className="text-sm font-medium">Score:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`font-bold ${getScoreColor(submission.score)}`}>
                        {submission.score}%
                      </span>
                      {submission.passed !== undefined && (
                        <Badge variant={submission.passed ? "default" : "destructive"}>
                          {submission.passed ? "Pass" : "Fail"}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium">Submitted:</span>
                  <p className="text-sm text-muted-foreground">
                    {new Date(submission.created_at).toLocaleDateString()} at{' '}
                    {new Date(submission.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Project Description */}
            {submission.project_description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32 w-full">
                    <p className="text-sm leading-relaxed">{submission.project_description}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* AI Feedback */}
            {submission.feedback && (
              <ProjectAIFeedbackDisplay feedback={submission.feedback} />
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {onRegrade && (
                <Button onClick={() => onRegrade(submission)} className="w-full">
                  <Star className="h-4 w-4 mr-2" />
                  Re-grade Project
                </Button>
              )}
              
              <Button variant="outline" onClick={handleExportContent} className="w-full" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>
            </div>
          </div>

          {/* Content Section */}
          <div className="lg:col-span-2 space-y-4">
            {renderContentSection()}

            {/* Tasks and Deliverables */}
            {(submission.tasks || submission.deliverables) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.tasks && Array.isArray(submission.tasks) && submission.tasks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Project Tasks</CardTitle>
                      <CardDescription>Required tasks for this project</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {submission.tasks.map((task: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-2 border rounded">
                              <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <span className="text-sm">{typeof task === 'string' ? task : task.description}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {submission.deliverables && Array.isArray(submission.deliverables) && submission.deliverables.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Deliverables</CardTitle>
                      <CardDescription>Expected project deliverables</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {submission.deliverables.map((deliverable: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-2 border rounded">
                              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                              <span className="text-sm">{typeof deliverable === 'string' ? deliverable : deliverable.description}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}