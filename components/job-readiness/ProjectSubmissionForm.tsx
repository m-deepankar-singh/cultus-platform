'use client'

import { useState, useEffect } from 'react'
import { useSubmitProject } from '@/hooks/useJobReadinessMutations'
import { PerformantAnimatedCard } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, ArrowLeft, ExternalLink, Code, Briefcase } from 'lucide-react'
import gsap from 'gsap'

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
  const [mounted, setMounted] = useState(false)
  
  const submitProject = useSubmitProject()
  
  useEffect(() => {
    setMounted(true)
    
    // GSAP animation for submission form
    gsap.fromTo(
      ".submission-form-card",
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.6, 
        ease: "power2.out"
      }
    )
  }, [])

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
    <div className="space-y-8">
      {/* Project Details Section - Always Visible */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="lift"
        className="submission-form-card"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Project Details</h2>
            </div>
            <h3 className="text-xl font-medium">{project.title}</h3>
            <p className="text-muted-foreground">
              {project.description}
            </p>
          </div>

          {/* Tasks and Deliverables */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tasks */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                Tasks to Complete
              </h4>
              <ul className="space-y-2">
                {project.tasks.map((task, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-medium min-w-[1.5rem] text-center">
                      {index + 1}.
                    </span>
                    <span className="text-muted-foreground">{task}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deliverables */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                Expected Deliverables
              </h4>
              <ul className="space-y-2">
                {project.deliverables.map((deliverable, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-accent font-medium min-w-[1.5rem] text-center">
                      {index + 1}.
                    </span>
                    <span className="text-muted-foreground">{deliverable}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Submission Form Section */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="lift"
        className="submission-form-card"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              <h2 className="font-semibold text-lg">Submit Your Project</h2>
            </div>
            <p className="text-muted-foreground">
              Provide your submission based on the project requirements above
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GitIngest Instructions for Code Projects */}
            {isCodeProject && (
              <PerformantAnimatedCard
                variant="glass"
                className="border-blue-200/50 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/80 backdrop-blur-sm"
              >
                <Alert className="border-none bg-transparent">
                  <Code className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <div className="space-y-3">
                      <p><strong>For Code Projects:</strong> Use GitIngest to extract your code and paste it below</p>
                      <div className="space-y-1 text-sm">
                        <p>1. Go to <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-primary transition-colors">gitingest.com</a></p>
                        <p>2. Enter your GitHub repository URL</p>
                        <p>3. Copy the generated markdown with your code</p>
                        <p>4. Paste it in the text area below along with your project explanation</p>
                      </div>
                      <AnimatedButton variant="outline" size="sm" asChild className="mt-2">
                        <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open GitIngest
                        </a>
                      </AnimatedButton>
                    </div>
                  </AlertDescription>
                </Alert>
              </PerformantAnimatedCard>
            )}

            {/* Submission Content */}
            <div className="space-y-3">
              <Label htmlFor="submission-content" className="font-medium">
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
                className="min-h-[300px] font-mono text-sm glass-card"
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                Minimum 100 characters required. Current: <span className={submissionContent.length >= 100 ? "text-green-600" : "text-amber-600"}>{submissionContent.length}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <PerformantAnimatedCard
                variant="glass"
                className="border-red-200/50 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/80 backdrop-blur-sm"
              >
                <Alert className="border-none bg-transparent">
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              </PerformantAnimatedCard>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <AnimatedButton
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </AnimatedButton>
              <AnimatedButton 
                type="submit" 
                disabled={isSubmitting || submissionContent.trim().length < 100}
                className="bg-gradient-to-r from-primary to-accent"
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
              </AnimatedButton>
            </div>
          </form>
        </div>
      </PerformantAnimatedCard>
    </div>
  )
} 