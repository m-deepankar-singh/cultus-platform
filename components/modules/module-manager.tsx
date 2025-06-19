"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, FileText, Layers, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { AssignModuleModal } from "../products/assign-module-modal"
import { useCurrentUser } from "@/hooks/use-current-user"

interface Module {
  id: string
  name: string
  type: "Course" | "Assessment"
  created_at: string
  updated_at: string
  product_id: string
  configuration: Record<string, unknown>
}

interface ModuleManagerProps {
  productId: string
}

export function ModuleManager({ productId }: ModuleManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { role } = useCurrentUser()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  
  const isAdmin = role === 'Admin'

  useEffect(() => {
    fetchModules()
  }, [productId])

  const fetchModules = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/products/${productId}/modules`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch modules")
      }
      
      const data = await response.json()
      setModules(data)
    } catch (err) {
      console.error("Error fetching modules:", err)
      setError("Failed to load modules. Please try again.")
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load modules. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignModule = async (moduleId: string) => {
    if (!isAdmin) return
    
    try {
      const UNASSIGNED_MODULES_REPOSITORY = "3f9a1ea0-5942-4ef1-bdb6-183d5add4b52"
      
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: UNASSIGNED_MODULES_REPOSITORY })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to unassign module: ${response.status}`);
      }
      
      toast({
        title: "Module unassigned",
        description: "The module has been removed from this product."
      })
      
      fetchModules()
    } catch (err) {
      console.error("Error unassigning module:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to unassign module. Please try again."
      })
    }
  }

  const handleEditModule = (moduleId: string) => {
    router.push(`/modules/${moduleId}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Modules</h2>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Manage modules assigned to this product" 
              : "View modules assigned to this product"}
          </p>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setShowAssignModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Assign Modules
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchModules} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No modules assigned</h3>
            <p className="text-muted-foreground mt-2">
              {isAdmin 
                ? "Get started by assigning existing modules to this product."
                : "This product has no modules assigned to it yet."}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowAssignModal(true)} className="mt-4">
                Assign Modules
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y border rounded-md">
          {modules.map((module) => (
            <div key={module.id} className="flex items-center gap-2 p-4 hover:bg-muted/50">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                {module.type === "Course" ? (
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{module.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  Type: {module.type} • Last updated: {new Date(module.updated_at).toLocaleDateString()}
                </div>
              </div>

              {isAdmin && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditModule(module.id)}>
                    Edit Content
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleUnassignModule(module.id)}>
                    Unassign
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <AssignModuleModal
          open={showAssignModal}
          onOpenChange={setShowAssignModal}
          productId={productId}
          onAssigned={fetchModules}
        />
      )}
    </div>
  )
} 