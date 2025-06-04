import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { CourseList } from '@/components/job-readiness/CourseList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Play, Clock } from 'lucide-react'

export default function CoursesPage() {
  return (
    <JobReadinessLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Course Modules
            </h1>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Play className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Learn through comprehensive video content and AI-generated quizzes. 
            Complete courses to advance your skills and earn your second star.
          </p>
        </div>

        {/* Course Information Card */}
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <BookOpen className="h-5 w-5" />
              About Course Modules
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Structured learning modules with video content and interactive quizzes to build your skills.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-green-800 dark:text-green-200">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Course Features:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• High-quality video lessons</li>
                  <li>• AI-generated quizzes</li>
                  <li>• Progress tracking</li>
                  <li>• Self-paced learning</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What to Expect:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Interactive learning experience</li>
                  <li>• Tier-based difficulty</li>
                  <li>• Practical applications</li>
                  <li>• Immediate feedback</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course List */}
        <CourseList />
      </div>
    </JobReadinessLayout>
  )
} 
 