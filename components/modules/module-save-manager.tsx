"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Save, AlertCircle, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface ValidationResult {
  isValid: boolean
  message: string
  field?: string
}

interface SaveStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
}

export interface ModuleComponent {
  id: string
  type: string
  data: any
  validate: () => ValidationResult
  save: () => Promise<any>
}

interface ModuleSaveManagerProps {
  moduleId: string
  moduleType: "Course" | "Assessment"
  components: ModuleComponent[]
  onComplete: () => void
}

export function ModuleSaveManager({ 
  moduleId, 
  moduleType, 
  components, 
  onComplete 
}: ModuleSaveManagerProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStep[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Validate all components before saving
  const validateAll = (): boolean => {
    const errors: string[] = []
    
    components.forEach(component => {
      const result = component.validate()
      if (!result.isValid) {
        errors.push(`${component.type}: ${result.message}`)
      }
    })
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  // Save all components in sequence
  const saveAll = async () => {
    if (!validateAll()) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Please fix the validation errors before saving.",
      })
      return
    }

    setIsSaving(true)
    setValidationErrors([])
    
    // Initialize save steps
    const steps: SaveStep[] = components.map(component => ({
      name: component.type,
      status: 'pending'
    }))
    setSaveStatus(steps)
    
    try {
      // Save each component in sequence
      for (let i = 0; i < components.length; i++) {
        const component = components[i]
        setCurrentStep(i)
        
        // Update progress and status
        setProgress(Math.round((i / components.length) * 100))
        setSaveStatus(prev => {
          const updated = [...prev]
          updated[i] = { ...updated[i], status: 'running' }
          return updated
        })
        
        try {
          // Save the component
          await component.save()
          
          // Update status to completed
          setSaveStatus(prev => {
            const updated = [...prev]
            updated[i] = { 
              ...updated[i], 
              status: 'completed',
              message: 'Saved successfully'
            }
            return updated
          })
        } catch (error) {
          console.error(`Error saving ${component.type}:`, error)
          
          // Update status to error
          setSaveStatus(prev => {
            const updated = [...prev]
            updated[i] = { 
              ...updated[i], 
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            }
            return updated
          })
          
          // Show error toast
          toast({
            variant: "destructive",
            title: `Error Saving ${component.type}`,
            description: error instanceof Error ? error.message : "Failed to save component",
          })
          
          // Stop the process on error
          throw error
        }
      }
      
      // All saved successfully
      setProgress(100)
      setCurrentStep(null)
      
      toast({
        title: "Module Saved Successfully",
        description: "All module components have been saved.",
      })
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh()
        onComplete()
      }, 1000)
      
    } catch (error) {
      // Main error handling is done in the component-specific catch blocks
      console.error("Module save process failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Save Manager</CardTitle>
        <CardDescription>
          Save all {moduleType} module components in the correct sequence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {isSaving && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              Saving {currentStep !== null && components[currentStep] ? components[currentStep].type : '...'}
            </p>
          </div>
        )}
        
        {saveStatus.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Save Process Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
            
            {showDetails && (
              <div className="space-y-2 border rounded-md p-3">
                {saveStatus.map((step, index) => (
                  <div key={index} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {step.status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                      {step.status === 'running' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                      {step.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {step.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      <span>{step.name}</span>
                    </div>
                    <Badge 
                      variant={
                        step.status === 'completed' ? 'success' : 
                        step.status === 'error' ? 'destructive' : 
                        step.status === 'running' ? 'outline' : 'secondary'
                      }
                    >
                      {step.status === 'pending' ? 'Pending' : 
                       step.status === 'running' ? 'In Progress' : 
                       step.status === 'completed' ? 'Completed' : 'Failed'}
                    </Badge>
                  </div>
                ))}
                
                {saveStatus.some(step => step.status === 'error') && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Save Process Failed</AlertTitle>
                    <AlertDescription>
                      One or more components failed to save. Please review the details and try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <Button
            onClick={saveAll}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save All Components'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 