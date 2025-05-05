"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TrashIcon } from "lucide-react"
import { useRouter } from "next/navigation"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteModuleButtonProps {
  moduleId: string
}

export function DeleteModuleButton({ moduleId }: DeleteModuleButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    if (confirmation !== "delete") {
      toast({
        variant: "destructive",
        title: "Confirmation required",
        description: 'Please type "delete" to confirm.',
      })
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete module")
      }

      toast({
        title: "Module deleted",
        description: "The module has been permanently deleted.",
      })

      // Close dialog and redirect to modules list
      setOpen(false)
      router.push("/modules")
    } catch (error) {
      console.error("Error deleting module:", error)
      toast({
        variant: "destructive",
        title: "Error deleting module",
        description: error instanceof Error ? error.message : "An error occurred while deleting the module.",
      })
    } finally {
      setIsDeleting(false)
      setConfirmation("")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <TrashIcon className="h-4 w-4 mr-2" />
          Delete Module
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the module and all its
            content including lessons, videos, quizzes, and assessment questions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="confirmation" className="text-sm font-medium">
            Please type <span className="font-bold">delete</span> to confirm
          </Label>
          <Input
            id="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="mt-2"
            placeholder="delete"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmation("")
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting || confirmation !== "delete"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Module"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 