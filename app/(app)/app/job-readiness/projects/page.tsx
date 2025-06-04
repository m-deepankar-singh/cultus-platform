import { Metadata } from 'next'
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { ProjectInterface } from '@/components/job-readiness/ProjectInterface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Lightbulb, 
  Target, 
  RefreshCw, 
  FileText, 
  Trophy,
  Info
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Real-World Projects | Job Readiness',
  description: 'Complete AI-generated real-world projects tailored to your background and tier level',
}

export default function ProjectsPage() {
  return (
    <JobReadinessLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Real-World Projects</h1>
          <p className="text-muted-foreground">
            Complete AI-generated projects tailored to your background and demonstrate your skills in real-world scenarios.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Target className="h-5 w-5" />
                Dynamic Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Each project is uniquely generated based on your background and tier level for maximum relevance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <RefreshCw className="h-5 w-5" />
                Fresh Each Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Projects change on page refresh until you submit your work, giving you options to find the right fit.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Trophy className="h-5 w-5" />
                AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-green-700 dark:text-green-300">
                Receive detailed AI-powered feedback with strengths, improvements, and actionable recommendations.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
          <Lightbulb className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 dark:text-purple-200">
            <strong>Project Guidelines:</strong> You need a score of 80% or higher to pass. 
            Failed projects can be retried with a new project generation. Take your time to create quality work!
          </AlertDescription>
        </Alert>

        {/* Submission Types Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submission Information
            </CardTitle>
            <CardDescription>
              How to submit your project work
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Text Submissions</h4>
                <p className="text-sm text-muted-foreground">
                  Most projects accept detailed text responses. For coding projects, you can use 
                  <a href="https://gitingest.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">
                    GitIngest
                  </a>
                  to convert your code repositories into text format.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Content Requirements</h4>
                <p className="text-sm text-muted-foreground">
                  Submissions must be at least 100 characters long and should thoroughly address all project tasks and deliverables.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Project Interface */}
        <ProjectInterface />
      </div>
    </JobReadinessLayout>
  )
} 