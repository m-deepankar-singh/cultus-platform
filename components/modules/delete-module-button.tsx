"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DeleteModuleButtonProps {
  id: string
  name: string
}

export function DeleteModuleButton({ id, name }: DeleteModuleButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/modules/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete module")
      }
      
      toast({
        title: "Module deleted",
        description: `${name} has been deleted successfully.`,
      })
      
      router.push("/modules")
      router.refresh()
    } catch (error) {
      console.error("Error deleting module:", error)
      toast({
        variant: "destructive",
        title: "Error deleting module",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
      setIsDeleting(false)
      setOpen(false)
    }
  }
  
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the module "{name}". This action cannot be undone.
            {id.startsWith("00000000") && (
              <p className="mt-2 text-yellow-600 font-medium">
                Warning: Deleting this system module may affect core functionality.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 