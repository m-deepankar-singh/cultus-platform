'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare, Target } from 'lucide-react'

interface ProjectTasksProps {
  tasks: string[]
  deliverables: string[]
}

export function ProjectTasks({ tasks, deliverables }: ProjectTasksProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Tasks to Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks && tasks.length > 0 ? (
            <ul className="space-y-3">
              {tasks.map((task, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{task}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No specific tasks defined</p>
          )}
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Expected Deliverables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliverables && deliverables.length > 0 ? (
            <ul className="space-y-3">
              {deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-400 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{deliverable}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No specific deliverables defined</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 