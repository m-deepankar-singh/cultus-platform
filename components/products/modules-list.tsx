"use client"

import { useState } from "react"
import { BookOpen, FileText, MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Module {
  id: string
  name: string
  type: "Course" | "Assessment"
  created_at: string
  updated_at: string
  product_id: string
  configuration: Record<string, unknown>
  description?: string
}

interface ModulesListProps {
  productId: string
  modules: Module[]
  onEdit: (module: Module) => void
  onRefresh: () => void
}

export function ModulesList({ modules, onEdit, onRefresh }: ModulesListProps) {
  const { toast } = useToast()
  const [deleteModule, setDeleteModule] = useState<Module | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteModule) return
    
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/modules/${deleteModule.id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete module")
      }
      
      toast({
        title: "Module deleted",
        description: "The module has been deleted successfully.",
      })
      
      onRefresh()
    } catch (error) {
      console.error("Error deleting module:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete module. Please try again.",
      })
    } finally {
      setIsDeleting(false)
      setDeleteModule(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="divide-y border rounded-md">
      {modules.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          No modules found
        </div>
      ) : (
        modules.map((module) => (
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
                {module.description || "No description"} • Updated {formatDate(module.updated_at)}
              </div>
            </div>

            <Badge className="mx-2">
              {module.type}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(module)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit module
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => setDeleteModule(module)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete module
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))
      )}
      
      <AlertDialog open={!!deleteModule} onOpenChange={(open) => !open && setDeleteModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module "{deleteModule?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
