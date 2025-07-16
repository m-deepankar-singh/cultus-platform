'use client'

import { useState, useEffect } from 'react'
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectTasks } from './ProjectTasks'
import { Briefcase, RefreshCw, Play, Info, AlertTriangle, FileText, ExternalLink } from 'lucide-react'
import gsap from 'gsap'

interface Project {
  title: string
  description: string
  tasks: string[]
  deliverables: string[]
  submission_type: string
  status: string
}

interface ProjectDisplayProps {
  project?: Project
  message?: string
  onStartProject: () => void
  onRefreshProject: () => void
}

export function ProjectDisplay({ 
  project, 
  message, 
  onStartProject, 
  onRefreshProject 
}: ProjectDisplayProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    
    // GSAP animations for project display cards
    gsap.fromTo(
      ".project-display-card",
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        stagger: 0.15, 
        duration: 0.6, 
        ease: "power2.out",
        delay: 0.2
      }
    )
  }, [project])
  
  if (!project) {
    return (
      <PerformantAnimatedCard variant="glass" className="project-display-card">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No project available</p>
            <AnimatedButton onClick={onRefreshProject} variant="outline">
              Generate Project
            </AnimatedButton>
          </div>
        </div>
      </PerformantAnimatedCard>
    )
  }

  const isNewProject = project.status === 'new'
  const isCodeProject = project.title.toLowerCase().includes('code') || 
                       project.title.toLowerCase().includes('programming') ||
                       project.title.toLowerCase().includes('software') ||
                       project.description.toLowerCase().includes('code') ||
                       project.description.toLowerCase().includes('programming')

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="lift"
        staggerIndex={0}
        className="project-display-card"
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <Badge variant={isNewProject ? "default" : "secondary"}>
                  {isNewProject ? "New Project" : "Submitted"}
                </Badge>
              </div>
              <h2 className="text-2xl font-semibold">{project.title}</h2>
              <p className="text-base text-muted-foreground">
                {project.description}
              </p>
            </div>
            {isNewProject && (
              <AnimatedButton 
                onClick={onRefreshProject}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                New Project
              </AnimatedButton>
            )}
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Dynamic Project Warning */}
      {isNewProject && message && (
        <PerformantAnimatedCard
          variant="glass"
          hoverEffect="glow"
          staggerIndex={1}
          className="project-display-card border-amber-200/50 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/80 backdrop-blur-sm"
        >
          <Alert className="border-none bg-transparent">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Dynamic Project:</strong> {message}
            </AlertDescription>
          </Alert>
        </PerformantAnimatedCard>
      )}

      {/* Project Tasks */}
      <div className="project-display-card" style={{ '--stagger-index': 2 } as React.CSSProperties}>
        <ProjectTasks 
          tasks={project.tasks}
          deliverables={project.deliverables}
        />
      </div>

      {/* Submission Information */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="scale"
        staggerIndex={3}
        className="project-display-card border-blue-200/50 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/80 backdrop-blur-sm"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <FileText className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Submission Method</h3>
          </div>
          
          <div className="space-y-4 text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/50 dark:bg-black/50">Text Submission</Badge>
            </div>
            {isCodeProject ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">For Code Projects:</p>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• Use <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-primary transition-colors">GitIngest</a> to extract your code</li>
                  <li>• Copy the generated markdown with your code</li>
                  <li>• Paste it along with your project explanation</li>
                </ul>
                <AnimatedButton variant="outline" size="sm" asChild className="mt-2">
                  <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open GitIngest
                  </a>
                </AnimatedButton>
              </div>
            ) : (
              <p className="text-sm">
                Submit your work as detailed text including your approach, methodology, findings, and conclusions.
              </p>
            )}
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Action Buttons */}
      {isNewProject && (
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          staggerIndex={4}
          className="project-display-card"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">Ready to start?</h3>
              <p className="text-sm text-muted-foreground">
                Once you begin, this project will be locked and you can submit your work.
              </p>
            </div>
            <AnimatedButton 
              onClick={onStartProject}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent"
            >
              <Play className="h-4 w-4" />
              Start Project
            </AnimatedButton>
          </div>
        </PerformantAnimatedCard>
      )}

      {/* Project Guidelines */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="scale"
        staggerIndex={5}
        className="project-display-card border-green-200/50 bg-green-50/80 dark:border-green-800/50 dark:bg-green-950/80 backdrop-blur-sm"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Info className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Project Guidelines</h3>
          </div>
          
          <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
            <li>• Complete all tasks listed above to the best of your ability</li>
            <li>• Ensure all deliverables are included in your submission</li>
            <li>• For code projects, use GitIngest to include your code with explanations</li>
            <li>• For case studies, provide detailed analysis and recommendations</li>
            <li>• Minimum passing score is 80% - you can retry if you fail</li>
            <li>• Each retry gives you a fresh, new project to work on</li>
          </ul>
        </div>
      </PerformantAnimatedCard>
    </div>
  )
} 