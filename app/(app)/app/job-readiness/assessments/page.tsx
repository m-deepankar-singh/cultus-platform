import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout'
import { AssessmentList } from '@/components/job-readiness/AssessmentList'
import { TierDisplay } from '@/components/job-readiness/TierDisplay'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Trophy } from 'lucide-react'

interface SearchParams {
  productId?: string
}

export default async function AssessmentsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  return (
    <JobReadinessLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Standard Assessments
            </h1>
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Complete tier-determining assessments to establish your skill level and unlock your learning path. 
            Your performance will determine your initial tier: Bronze, Silver, or Gold.
          </p>
        </div>

        {/* Tier Information */}
        <TierDisplay productId={resolvedSearchParams.productId} />

        {/* Assessment Information Card */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <GraduationCap className="h-5 w-5" />
              About These Assessments
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              These assessments are designed to evaluate your current skill level and place you in the appropriate tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-blue-800 dark:text-blue-200">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Assessment Features:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Tier-determining questions</li>
                  <li>• Multiple choice format</li>
                  <li>• Timed assessments</li>
                  <li>• Immediate results</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">What to Expect:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Questions tailored to your background</li>
                  <li>• 60-90 minute time limits</li>
                  <li>• Passing threshold: 60%</li>
                  <li>• Earn your first star upon completion</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment List */}
        <AssessmentList productId={resolvedSearchParams.productId} />
      </div>
    </JobReadinessLayout>
  )
} 