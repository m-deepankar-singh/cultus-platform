"use client"

import { useState, useEffect } from "react"
import { ModuleSaveManager } from "./module-save-manager"
import { createModuleComponentAdapters } from "./module-component-adapters"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ModuleSaveManagerWrapperProps {
  moduleId: string
  moduleType: "Course" | "Assessment"
  moduleData: {
    name: string
    description?: string
    type: string
    configuration: Record<string, any>
  }
}

export function ModuleSaveManagerWrapper({
  moduleId,
  moduleType,
  moduleData,
}: ModuleSaveManagerWrapperProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [components, setComponents] = useState<any[]>([])

  useEffect(() => {
    async function fetchComponentData() {
      setIsLoading(true)
      setError(null)

      try {
        let lessonsData = []
        let questionsData = []

        // Fetch module-specific data based on type
        if (moduleType === "Course") {
          // Fetch lessons for course modules
          const lessonsResponse = await fetch(`/api/admin/modules/${moduleId}/lessons`)
          
          if (!lessonsResponse.ok) {
            throw new Error("Failed to fetch lessons for this module")
          }
          
          lessonsData = await lessonsResponse.json()
        } else if (moduleType === "Assessment") {
          // Fetch questions for assessment modules
          const questionsResponse = await fetch(`/api/admin/modules/${moduleId}/assessment-questions`)
          
          if (!questionsResponse.ok) {
            throw new Error("Failed to fetch questions for this module")
          }
          
          questionsData = await questionsResponse.json()
        }

        // Prepare the full module data with fetched components
        const fullModuleData = {
          ...moduleData,
          lessons: lessonsData,
          questions: questionsData
        }

        // Create component adapters
        const componentAdapters = createModuleComponentAdapters(
          moduleId,
          moduleType,
          fullModuleData
        )

        setComponents(componentAdapters)
      } catch (err) {
        console.error("Error fetching module component data:", err)
        setError(err instanceof Error ? err.message : "Failed to load module data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchComponentData()
  }, [moduleId, moduleType, moduleData])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <ModuleSaveManager
      moduleId={moduleId}
      moduleType={moduleType}
      components={components}
      onComplete={() => window.location.reload()}
    />
  )
} 