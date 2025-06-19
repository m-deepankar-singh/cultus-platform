'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectTasks } from './ProjectTasks'
import { Briefcase, RefreshCw, Play, Info, AlertTriangle, FileText, ExternalLink } from 'lucide-react'

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
  if (!project) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No project available</p>
            <Button onClick={onRefreshProject} variant="outline">
              Generate Project
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isNewProject = project.status === 'new'
  const isCodeProject = project.title.toLowerCase().includes('code') || 
                       project.title.toLowerCase().includes('programming') ||
                       project.title.toLowerCase().includes('software') ||
                       project.description.toLowerCase().includes('code') ||
                       project.description.toLowerCase().includes('programming')

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <Badge variant={isNewProject ? "default" : "secondary"}>
                  {isNewProject ? "New Project" : "Submitted"}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{project.title}</CardTitle>
              <CardDescription className="text-base">
                {project.description}
              </CardDescription>
            </div>
            {isNewProject && (
              <Button 
                onClick={onRefreshProject}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Dynamic Project Warning */}
      {isNewProject && message && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Dynamic Project:</strong> {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Project Tasks */}
      <ProjectTasks 
        tasks={project.tasks}
        deliverables={project.deliverables}
      />

      {/* Submission Information */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <FileText className="h-5 w-5" />
            Submission Method
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 dark:text-blue-300">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/50">Text Submission</Badge>
            </div>
            {isCodeProject ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">For Code Projects:</p>
                <ul className="space-y-1 text-sm ml-4">
                  <li>• Use <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">GitIngest</a> to extract your code</li>
                  <li>• Copy the generated markdown with your code</li>
                  <li>• Paste it along with your project explanation</li>
                </ul>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open GitIngest
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm">
                Submit your work as detailed text including your approach, methodology, findings, and conclusions.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isNewProject && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">Ready to start?</h3>
                <p className="text-sm text-muted-foreground">
                  Once you begin, this project will be locked and you can submit your work.
                </p>
              </div>
              <Button 
                onClick={onStartProject}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Guidelines */}
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Info className="h-5 w-5" />
            Project Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700 dark:text-green-300">
          <ul className="space-y-2 text-sm">
            <li>• Complete all tasks listed above to the best of your ability</li>
            <li>• Ensure all deliverables are included in your submission</li>
            <li>• For code projects, use GitIngest to include your code with explanations</li>
            <li>• For case studies, provide detailed analysis and recommendations</li>
            <li>• Minimum passing score is 80% - you can retry if you fail</li>
            <li>• Each retry gives you a fresh, new project to work on</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 