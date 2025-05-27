"use client"

import Link from "next/link"
import { FileText, BookOpen, GraduationCap, Briefcase, Video, Lock, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useJobReadinessModuleGroups } from "@/hooks/useJobReadinessModuleGroups"

// Icon mapping for dynamic icon selection
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  FileText,
  BookOpen, 
  GraduationCap,
  Briefcase,
  Video
}

export function ModuleNavigation() {
  const { data: moduleGroups, isLoading } = useJobReadinessModuleGroups()
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-10 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!moduleGroups) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No Job Readiness modules available.</p>
      </div>
    )
  }

  const currentStars = moduleGroups.student.currentStars

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Program Modules</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moduleGroups.moduleGroups.map((moduleGroup) => {
          const isUnlocked = moduleGroup.isUnlocked
          const isCompleted = moduleGroup.isCompleted
          const isCurrent = currentStars === moduleGroup.requiredStars
          const IconComponent = iconMap[moduleGroup.icon] || FileText

          return (
            <Card
              key={moduleGroup.type}
              className={cn(
                "transition-all duration-200 hover:shadow-lg",
                isUnlocked ? "border-primary/50" : "border-gray-200 bg-gray-50/50 dark:bg-gray-950/50",
                isCurrent && "ring-2 ring-primary/20 shadow-lg",
                isCompleted && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isCompleted ? "bg-green-100 dark:bg-green-900/30" :
                      isUnlocked ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : isUnlocked ? (
                        <IconComponent className="h-6 w-6 text-primary" />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <CardTitle className={cn(
                        "text-lg",
                        !isUnlocked && "text-gray-400"
                      )}>
                        {moduleGroup.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={isCompleted ? "default" : isUnlocked ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {isCompleted ? "Completed" : 
                           isCurrent ? "Current" : 
                           isUnlocked ? "Available" : "Locked"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Star {moduleGroup.requiredStars + 1}
                        </span>
                        {moduleGroup.totalCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({moduleGroup.completedCount}/{moduleGroup.totalCount})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className={cn(
                  "mb-4",
                  !isUnlocked && "text-gray-400"
                )}>
                  {moduleGroup.description}
                  {moduleGroup.totalCount > 0 && (
                    <span className="block mt-1 text-xs font-medium">
                      {moduleGroup.totalCount} {moduleGroup.type.replace('_', ' ')} available
                    </span>
                  )}
                </CardDescription>
                
                {isUnlocked ? (
                  <Button asChild className="w-full">
                    <Link href={moduleGroup.href}>
                      {isCompleted ? "Review" : isCurrent ? "Start" : "Continue"}
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    <Lock className="h-4 w-4 mr-2" />
                    Requires {moduleGroup.requiredStars} {moduleGroup.requiredStars === 1 ? "star" : "stars"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 