 "use client"

import { OverallProgressDisplay } from "@/components/job-readiness/OverallProgressDisplay"

interface JobReadinessLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showProgress?: boolean
}

export function JobReadinessLayout({ 
  children, 
  title, 
  description, 
  showProgress = true 
}: JobReadinessLayoutProps) {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        {(title || description) && (
          <div className="text-center space-y-4">
            {title && (
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Progress Display */}
        {showProgress && <OverallProgressDisplay />}

        {/* Page Content */}
        {children}
      </div>
    </div>
  )
}