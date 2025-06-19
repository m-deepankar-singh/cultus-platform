'use client'

import { useState } from 'react'
import { useSubmitProject } from '@/hooks/useJobReadinessMutations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, ArrowLeft, ExternalLink, Code } from 'lucide-react'

interface Project {
  title: string
  description: string
  tasks: string[]
  deliverables: string[]
  submission_type: string
}

interface ProjectSubmissionFormProps {
  project: Project
  productId: string
  onSubmissionComplete: (result: any) => void
  onCancel: () => void
}

export function ProjectSubmissionForm({ 
  project, 
  productId, 
  onSubmissionComplete, 
  onCancel 
}: ProjectSubmissionFormProps) {
  const [submissionContent, setSubmissionContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const submitProject = useSubmitProject()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate submission content
    if (!submissionContent.trim()) {
      setError('Please provide your submission content')
      return
    }
    
    if (submissionContent.trim().length < 100) {
      setError('Submission must be at least 100 characters long')
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await submitProject.mutateAsync({
        product_id: productId,
        project_title: project.title,
        project_description: project.description,
        tasks: project.tasks,
        deliverables: project.deliverables,
        submission_type: 'text_input',
        submission_content: submissionContent,
        submission_url: null
      })
      
      onSubmissionComplete(result)
    } catch (error: any) {
      setError(error.message || 'Failed to submit project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCodeProject = project.title.toLowerCase().includes('code') || 
                       project.title.toLowerCase().includes('programming') ||
                       project.title.toLowerCase().includes('software') ||
                       project.description.toLowerCase().includes('code') ||
                       project.description.toLowerCase().includes('programming')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Your Project
          </CardTitle>
          <CardDescription>
            {project.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GitIngest Instructions for Code Projects */}
            {isCodeProject && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <Code className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <div className="space-y-2">
                    <p><strong>For Code Projects:</strong> Use GitIngest to extract your code and paste it below</p>
                    <div className="space-y-1 text-sm">
                      <p>1. Go to <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">gitingest.com</a></p>
                      <p>2. Enter your GitHub repository URL</p>
                      <p>3. Copy the generated markdown with your code</p>
                      <p>4. Paste it in the text area below along with your project explanation</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="mt-2">
                      <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open GitIngest
                      </a>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Submission Content */}
            <div className="space-y-2">
              <Label htmlFor="submission-content">
                Your Submission
              </Label>
              <Textarea
                id="submission-content"
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder={isCodeProject 
                  ? "Paste your GitIngest markdown output here, followed by your project explanation, approach, and any additional documentation..."
                  : "Provide your detailed response to the project requirements. Include your approach, methodology, findings, and conclusions..."
                }
                className="min-h-[300px] font-mono text-sm"
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Minimum 100 characters required. Current: {submissionContent.length}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || submissionContent.trim().length < 100}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 