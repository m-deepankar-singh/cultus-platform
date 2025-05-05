"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronUp, ChevronDown, Pencil, Trash, Grip, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LessonForm } from "@/components/modules/lesson-form"

interface Lesson {
  id: string
  title: string
  description: string | null
  video_url: string | null
  sequence: number
  module_id: string
  has_quiz: boolean
  quiz_questions?: any[]
}

interface LessonManagerProps {
  moduleId: string
}

export function LessonManager({ moduleId }: LessonManagerProps) {
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [openDeleteAlert, setOpenDeleteAlert] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    title: "",
    description: "",
    video_url: "",
    module_id: moduleId,
  })
  
  // Fetch lessons on component mount
  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/modules/${moduleId}/lessons`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("API Error response:", errorData)
          throw new Error(errorData.error || "Failed to fetch lessons")
        }
        
        const data = await response.json()
        console.log("Fetched lessons:", data)
        // Sort by sequence
        const sortedLessons = Array.isArray(data) 
          ? data.sort((a: Lesson, b: Lesson) => a.sequence - b.sequence)
          : []
        setLessons(sortedLessons)
      } catch (error) {
        console.error("Error fetching lessons:", error)
        toast({
          variant: "destructive",
          title: "Error loading lessons",
          description: error instanceof Error ? error.message : "Could not load module lessons. Please try again.",
        })
        setLessons([]) // Set empty array on error
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchLessons()
  }, [moduleId, toast])
  
  // Move lesson up in sequence
  const moveUp = (index: number) => {
    if (index <= 0) return
    
    const newLessons = [...lessons]
    const temp = newLessons[index]
    newLessons[index] = newLessons[index - 1]
    newLessons[index - 1] = temp
    
    // Update sequence numbers
    newLessons.forEach((lesson, idx) => {
      lesson.sequence = idx + 1
    })
    
    setLessons(newLessons)
    setSaveSuccess(false)
  }
  
  // Move lesson down in sequence
  const moveDown = (index: number) => {
    if (index >= lessons.length - 1) return
    
    const newLessons = [...lessons]
    const temp = newLessons[index]
    newLessons[index] = newLessons[index + 1]
    newLessons[index + 1] = temp
    
    // Update sequence numbers
    newLessons.forEach((lesson, idx) => {
      lesson.sequence = idx + 1
    })
    
    setLessons(newLessons)
    setSaveSuccess(false)
  }
  
  // Save lesson order changes
  const saveOrder = async () => {
    setIsSaving(true)
    
    try {
      // Prepare the data with updated sequence numbers
      const updatedLessons = lessons.map((lesson, index) => ({
        id: lesson.id,
        sequence: index + 1
      }))
      
      console.log("Saving lesson order:", updatedLessons)
      
      // Validate data before sending
      if (updatedLessons.length === 0) {
        toast({
          variant: "destructive",
          title: "Error saving order",
          description: "No lessons to reorder",
        })
        setIsSaving(false)
        return
      }
      
      // Make API call to update lesson order
      const response = await fetch(`/api/admin/modules/${moduleId}/lessons/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessons: updatedLessons }),
      })
      
      // Check if response has content before trying to parse it as JSON
      const contentType = response.headers.get("content-type")
      let data = null
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json()
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError)
          throw new Error(`Failed to parse server response: ${response.status} ${response.statusText}`)
        }
      }
      
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || 
          (data?.details ? `${data.error}: ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}` : 
          `Failed to update lesson order: ${response.status} ${response.statusText}`)
        throw new Error(errorMessage)
      }
      
      console.log("Order update successful:", data)
      
      toast({
        title: "Success",
        description: "Lesson order has been updated",
      })
      
      setSaveSuccess(true)
      router.refresh()
      
    } catch (error) {
      console.error("Error updating lesson order:", error)
      toast({
        variant: "destructive",
        title: "Error saving order",
        description: error instanceof Error ? error.message : "Failed to save lesson order. Please try again.",
      })
      setSaveSuccess(false)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Create new lesson
  const createLesson = async () => {
    // Use newLesson state which is now populated by our form component
    if (!newLesson.title) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Please provide a title for the lesson",
      })
      return
    }
    
    setIsSaving(true)
    
    try {
      // Prepare the lesson data, including quiz questions if has_quiz is true
      const lessonData = {
        ...newLesson,
        quiz_questions: newLesson.has_quiz && newLesson.quiz_questions ? newLesson.quiz_questions : []
      }
      
      const response = await fetch(`/api/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lessonData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error response:", errorData)
        throw new Error(errorData.error || "Failed to create lesson")
      }
      
      const data = await response.json()
      
      setLessons([...lessons, data])
      
      // Reset the form
      setNewLesson({
        title: "",
        description: "",
        video_url: "",
        module_id: moduleId,
      })
      
      toast({
        title: "Success",
        description: "New lesson has been created",
      })
      
      // Refresh the page to show updated lessons
      router.refresh()
    } catch (error) {
      console.error("Error creating lesson:", error)
      toast({
        variant: "destructive",
        title: "Error creating lesson",
        description: error instanceof Error ? error.message : "Failed to create lesson",
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Update existing lesson
  const handleEditSubmit = async (values: any) => {
    try {
      if (!editingLesson?.id) {
        throw new Error("No lesson ID found for editing")
      }
      
      // Prepare the updated lesson data, including quiz questions if has_quiz is true
      const updateData = {
        ...values,
        quiz_questions: values.has_quiz && values.quiz_questions ? values.quiz_questions : []
      }
      
      const response = await fetch(`/api/admin/modules/${moduleId}/lessons/${editingLesson.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error response:", errorData)
        throw new Error(errorData.error || "Failed to update lesson")
      }
      
      const updatedLesson = await response.json()
      
      // Update the lessons array with the updated lesson
      setLessons(
        lessons.map((lesson) => (lesson.id === updatedLesson.id ? updatedLesson : lesson))
      )
      
      // Close the dialog and reset state
      setEditingLesson(null)
      
      toast({
        title: "Success",
        description: "Lesson has been updated",
      })
      
      router.refresh()
    } catch (error) {
      console.error("Error updating lesson:", error)
      toast({
        variant: "destructive",
        title: "Error updating lesson",
        description: error instanceof Error ? error.message : "Failed to update lesson",
      })
    }
  }
  
  // Delete lesson
  const deleteLesson = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/modules/${moduleId}/lessons/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete lesson")
      }
      
      // Remove from local state
      setLessons(lessons.filter(lesson => lesson.id !== id))
      
      // Reset sequence numbers
      const updatedLessons = lessons
        .filter(lesson => lesson.id !== id)
        .map((lesson, index) => ({
          ...lesson,
          sequence: index + 1
        }))
        
      setLessons(updatedLessons)
      
      // Close alert
      setOpenDeleteAlert(null)
      
      toast({
        title: "Lesson deleted",
        description: "Lesson has been removed from the module",
      })
      
      router.refresh()
    } catch (error) {
      console.error("Error deleting lesson:", error)
      toast({
        variant: "destructive",
        title: "Error deleting lesson",
        description: "Failed to delete lesson. Please try again.",
      })
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 ml-auto"> 
          {lessons.length > 0 && !saveSuccess && (
            <Button 
              variant="outline" 
              onClick={saveOrder}
              disabled={isSaving}
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Order
                </>
              )}
            </Button>
          )}
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lesson
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Lesson</DialogTitle>
                <DialogDescription>
                  Add a new lesson to this module. Provide a title, description, and optional video.
                </DialogDescription>
              </DialogHeader>
              
              <LessonForm
                moduleId={moduleId}
                onSubmit={async (values) => {
                  setNewLesson(values)
                  await createLesson()
                  return Promise.resolve()
                }}
                onCancel={() => {
                  const closeButton = document.querySelector('[data-id="close-dialog"]') as HTMLButtonElement
                  if (closeButton) closeButton.click()
                }}
                isSubmitting={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-[250px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-[90%] mb-2" />
                <Skeleton className="h-4 w-[75%]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            <p className="text-muted-foreground mb-4 text-center">
              No lessons have been added to this module yet.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Add New Lesson</DialogTitle>
                  <DialogDescription>
                    Create a new lesson for this course module
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first-title">Lesson Title</Label>
                    <Input
                      id="first-title"
                      value={newLesson.title}
                      onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                      placeholder="Enter lesson title"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="first-description">
                      Description <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="first-description"
                      value={newLesson.description || ""}
                      onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                      placeholder="Enter lesson description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="first-videoUrl">
                      Video URL <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="first-videoUrl"
                      value={newLesson.video_url || ""}
                      onChange={(e) => setNewLesson({ ...newLesson, video_url: e.target.value })}
                      placeholder="https://example.com/video"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={createLesson}>Create Lesson</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Order</TableHead>
                <TableHead>Lesson Details</TableHead>
                <TableHead className="w-[150px]">Content</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson, index) => (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold">{index + 1}</span>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveDown(index)}
                          disabled={index === lessons.length - 1}
                          className="h-6 w-6"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-semibold">{lesson.title}</div>
                      {lesson.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {lesson.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {lesson.video_url && (
                        <Badge variant="outline">Video</Badge>
                      )}
                      {lesson.has_quiz && (
                        <Badge>Quiz</Badge>
                      )}
                      {!lesson.video_url && !lesson.has_quiz && (
                        <Badge variant="destructive">Missing Content</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingLesson(lesson)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog open={openDeleteAlert === lesson.id} onOpenChange={open => !open && setOpenDeleteAlert(null)}>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setOpenDeleteAlert(lesson.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the lesson "{lesson.title}" and any associated content.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteLesson(lesson.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Edit Lesson Dialog */}
      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>
              Make changes to this lesson. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          {editingLesson && (
            <LessonForm
              moduleId={moduleId}
              lesson={editingLesson}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingLesson(null)}
              isSubmitting={isSaving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 