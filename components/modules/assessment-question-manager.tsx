"use client"

import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Plus, Search, Trash, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Question interface to match assessment questions
interface Question {
  id: string
  question_text: string
  question_type: "MCQ" | "MSQ"
  options: { id: string; text: string }[]
  correct_answer: string | { answers: string[] }
  topic?: string
  difficulty?: string
  sequence?: number
}

interface AssessmentQuestionManagerProps {
  moduleId: string
  readOnly?: boolean
}

export function AssessmentQuestionManager({ 
  moduleId, 
  readOnly = false 
}: AssessmentQuestionManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const [, setError] = useState<string | null>(null)

  // Fetch selected questions on mount
  useEffect(() => {
    fetchSelectedQuestions()
  }, [moduleId])

  // Filter available questions based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredQuestions(availableQuestions)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredQuestions(
        availableQuestions.filter(
          (q) => 
            q.question_text.toLowerCase().includes(query) || 
            q.topic?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, availableQuestions])

  // Initialize selected questions from loaded questions
  useEffect(() => {
    setSelectedQuestions(
      [...questions].sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    )
  }, [questions])

  const fetchSelectedQuestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/modules/${moduleId}/assessment-questions`)
      
      if (!response.ok) {
        throw new Error(`Error fetching questions: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Add debug log to see data structure
      console.log('Received questions data:', data)
      
      // Extract questions from the response - API returns { questions: [...], configuration: {...} }
      const questionsArray = data.questions || []
      
      // Ensure each question has a sequence property
      const questionsWithSequence = questionsArray.map((q: Question, index: number) => ({
        ...q,
        sequence: q.sequence ?? index + 1
      }))
      
      setQuestions(questionsWithSequence)
    } catch (error) {
      console.error("Error fetching assessment questions:", error)
      toast({
        variant: "destructive",
        title: "Failed to load assessment questions",
        description: error instanceof Error ? error.message : "Please try again later",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableQuestions = async () => {
    try {
      // Fetch all assessment questions
      const response = await fetch(`/api/admin/question-banks?type=assessment`)
      
      if (!response.ok) {
        throw new Error(`Error fetching questions: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Handle the new paginated response format
      const questionData = Array.isArray(result) ? result : result.data || [];
      
      // Filter out questions that are already selected
      const selectedIds = new Set(selectedQuestions.map(q => q.id))
      const available = questionData.filter((q: Question) => !selectedIds.has(q.id))
      
      setAvailableQuestions(available)
      setFilteredQuestions(available)
    } catch (error) {
      console.error("Error fetching available questions:", error)
      toast({
        variant: "destructive",
        title: "Failed to load question bank",
        description: error instanceof Error ? error.message : "Please try again later",
      })
    }
  }

  const handleOpenDialog = () => {
    setSelected(new Set())
    fetchAvailableQuestions()
    setIsOpen(true)
  }

  const handleToggleQuestion = (question: Question) => {
    const newSelected = new Set(selected)
    
    if (newSelected.has(question.id)) {
      newSelected.delete(question.id)
    } else {
      newSelected.add(question.id)
    }
    
    setSelected(newSelected)
  }

  const handleAddQuestions = () => {
    // Find the full question objects for the selected IDs
    const questionsToAdd = availableQuestions.filter(q => selected.has(q.id))
    
    // Assign sequence numbers to the new questions
    const startSequence = selectedQuestions.length > 0 
      ? Math.max(...selectedQuestions.map(q => q.sequence || 0)) + 1 
      : 1
    
    const newQuestions = questionsToAdd.map((q, index) => ({
      ...q,
      sequence: startSequence + index
    }))
    
    // Add the new questions to the selected list
    setSelectedQuestions([...selectedQuestions, ...newQuestions])
    
    // Close the dialog
    setIsOpen(false)
    
    // Show success message
    toast({
      title: "Questions added",
      description: `Added ${questionsToAdd.length} question${questionsToAdd.length !== 1 ? 's' : ''} to the assessment.`
    })
  }

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId))
    
    // Show notification
    toast({
      title: "Question removed",
      description: "The question has been removed from the assessment."
    })
  }

  const moveQuestionUp = (index: number) => {
    if (index <= 0) return
    
    const newQuestions = [...selectedQuestions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index - 1]
    newQuestions[index - 1] = temp
    
    // Update sequence numbers
    newQuestions.forEach((q, i) => {
      q.sequence = i + 1
    })
    
    setSelectedQuestions(newQuestions)
  }

  const moveQuestionDown = (index: number) => {
    if (index >= selectedQuestions.length - 1) return
    
    const newQuestions = [...selectedQuestions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index + 1]
    newQuestions[index + 1] = temp
    
    // Update sequence numbers
    newQuestions.forEach((q, i) => {
      q.sequence = i + 1
    })
    
    setSelectedQuestions(newQuestions)
  }

  const saveQuestions = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      console.log("saveQuestions called. Current selectedQuestions:", selectedQuestions); // Log entry point

      // Validate data before saving - USE selectedQuestions
      if (selectedQuestions.length === 0) {
        setError("No questions to save")
        setIsSaving(false)
        toast({
          variant: "destructive",
          title: "Error",
          description: "There are no questions to save for this assessment.", // Clarified message
        })
        console.log("Validation failed: No questions to save.");
        return 
      }
      
      // Check minimum number required - USE selectedQuestions
      if (selectedQuestions.length < 1) { // Changed minimum to 1 as per previous discussions, can be adjusted to 5 if needed
        setError(`Assessment should have at least 1 question. Found ${selectedQuestions.length}.`)
        setIsSaving(false)
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `Assessment should have at least 1 question. You have ${selectedQuestions.length}.`,
        })
        console.log(`Validation failed: Minimum 1 question required, found ${selectedQuestions.length}.`);
        return
      }
      
      // Update sequence numbers based on the current order in selectedQuestions
      const updatedQuestionsToSend = selectedQuestions.map((question, index) => ({
        id: question.id, // Only send essential data for linking/ordering
        sequence: index + 1 
        // Do not send full question object unless API expects it for update/creation
        // If API just links existing questions, only IDs and sequence are needed.
        // Assuming the PUT request to /assessment-questions primarily updates the *linkage and order*.
      }))
      
      console.log('Sending Q IDs & sequences to save:', updatedQuestionsToSend); // Updated log
      
      const response = await fetch(`/api/admin/modules/${moduleId}/assessment-questions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        // Send only the question IDs and their sequences
        body: JSON.stringify({ questions: updatedQuestionsToSend }), 
      })
      
      const contentType = response.headers.get("content-type")
      let responseData = null
      
      if (contentType && contentType.includes("application/json")) {
        try {
          responseData = await response.json()
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError)
          // If parsing fails but response was otherwise okay, it might be an empty success response
          if (response.ok) {
            toast({
              title: "Success",
              description: "Assessment questions have been saved.",
            });
            fetchSelectedQuestions(); // Refresh the list from the server
            setIsSaving(false);
            return;
          }
          throw new Error(`Failed to parse server response: ${response.status} ${response.statusText}`)
        }
      }
      
      if (!response.ok) {
        const errorMessage = responseData?.error || responseData?.message || `Failed to save questions: ${response.status} ${response.statusText}`
        console.error("Save error response:", responseData);
        throw new Error(errorMessage)
      }
      
      console.log('Received saved questions response:', responseData)
      
      // Assuming API returns the updated list of linked questions with their sequences
      // Or, simply re-fetch to ensure UI is consistent with DB state.
      fetchSelectedQuestions(); // Refresh the list from the server
      
      toast({
        title: "Success",
        description: "Assessment questions have been saved.", // Consistent success message
      })
      
    } catch (error) {
      console.error("Error saving questions:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      toast({
        variant: "destructive",
        title: "Error saving questions",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!readOnly && (
          <div className="flex items-center gap-2 ml-auto">
            <Button 
              variant="outline" 
              onClick={saveQuestions}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Questions
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Add Assessment Questions</DialogTitle>
                  <DialogDescription>
                    Select questions from the assessment bank to add to this module.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <ScrollArea className="h-[400px] rounded-md border">
                    {filteredQuestions.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {availableQuestions.length === 0 ? 
                          "No additional questions available in the assessment bank." : 
                          "No questions match your search."}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Select</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredQuestions.map((question) => (
                            <TableRow key={question.id} className={selected.has(question.id) ? "bg-muted/50" : ""}>
                              <TableCell>
                                <Checkbox
                                  checked={selected.has(question.id)}
                                  onCheckedChange={() => handleToggleQuestion(question)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{question.question_text}</div>
                                  {question.topic && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Topic: {question.topic}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {question.question_type}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    {selected.size} question{selected.size !== 1 ? 's' : ''} selected
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddQuestions}
                    disabled={selected.size === 0}
                  >
                    Add Selected Questions
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
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
      ) : selectedQuestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10">
            <p className="text-muted-foreground mb-4 text-center">
              No questions have been added to this assessment yet.
            </p>
            {!readOnly && (
              <Button variant="outline" onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assessment Questions
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Order</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedQuestions.map((question, index) => (
                <TableRow key={question.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold">{index + 1}</span>
                      {!readOnly && (
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestionUp(index)}
                            disabled={index === 0}
                            className="h-6 w-6"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestionDown(index)}
                            disabled={index === selectedQuestions.length - 1}
                            className="h-6 w-6"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-semibold">{question.question_text}</div>
                      {question.topic && (
                        <div className="text-xs text-muted-foreground">
                          Topic: {question.topic}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {question.question_type}
                    </Badge>
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive"
                        onClick={() => handleRemoveQuestion(question.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
} 