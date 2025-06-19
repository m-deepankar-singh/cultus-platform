"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, BookOpen, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ModuleCreateButton() {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<"Course" | "Assessment" | null>(null)
  const router = useRouter()
  
  const handleCreate = () => {
    if (!selectedType) return
    
    // Close the dialog
    setOpen(false)
    
    // Navigate to the module creation page with the type pre-selected
    router.push(`/modules/create?type=${selectedType.toLowerCase()}`)
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Module
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Module</DialogTitle>
          <DialogDescription>
            Select the type of module you want to create.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
          <Card 
            className={`cursor-pointer border-2 transition-all ${
              selectedType === "Course" ? "border-primary" : ""
            }`}
            onClick={() => setSelectedType("Course")}
          >
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center text-lg">
                <BookOpen className="mr-2 h-5 w-5" />
                Course Module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create a learning module with lessons, videos, and content for teaching concepts.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer border-2 transition-all ${
              selectedType === "Assessment" ? "border-primary" : ""
            }`}
            onClick={() => setSelectedType("Assessment")}
          >
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center text-lg">
                <FileText className="mr-2 h-5 w-5" />
                Assessment Module
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create a quiz or test module for evaluating knowledge and understanding.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            disabled={!selectedType}
            onClick={handleCreate}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 