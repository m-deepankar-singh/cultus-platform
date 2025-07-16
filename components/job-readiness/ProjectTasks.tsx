'use client'

import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card'
import { CheckSquare, Target } from 'lucide-react'

interface ProjectTasksProps {
  tasks: string[]
  deliverables: string[]
}

export function ProjectTasks({ tasks, deliverables }: ProjectTasksProps) {
  return (
    <CardGrid columns={2} gap="lg">
      {/* Tasks */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="lift"
        staggerIndex={0}
        className="project-display-card"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Tasks to Complete</h3>
          </div>
          
          {tasks && tasks.length > 0 ? (
            <ul className="space-y-4">
              {tasks.map((task, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 dark:bg-primary/10 flex items-center justify-center text-sm font-medium text-primary mt-0.5 border border-primary/20">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{task}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No specific tasks defined</p>
          )}
        </div>
      </PerformantAnimatedCard>

      {/* Deliverables */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="lift"
        staggerIndex={1}
        className="project-display-card"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-lg">Expected Deliverables</h3>
          </div>
          
          {deliverables && deliverables.length > 0 ? (
            <ul className="space-y-4">
              {deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100/80 dark:bg-green-900/50 flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-400 mt-0.5 border border-green-200 dark:border-green-800">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{deliverable}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No specific deliverables defined</p>
          )}
        </div>
      </PerformantAnimatedCard>
    </CardGrid>
  )
} 