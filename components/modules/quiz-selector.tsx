"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface Question {
  id: string
  question_text: string
  question_type: "MCQ" | "MSQ"
  options: { id: string; text: string }[]
  correct_answer: string | { answers: string[] }
  topic?: string
  difficulty?: string
}

interface QuizSelectorProps {
  selectedQuestions: Question[]
  onChange: (questions: Question[]) => void
  disabled?: boolean
  lessonId?: string
}

export function QuizSelector({ 
  selectedQuestions = [], 
  onChange, 
  disabled = false,
  lessonId 
}: QuizSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedQuestions.map(q => q.id)))
  const { toast } = useToast()

  // Fetch questions when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchQuestions()
    }
  }, [isOpen])

  // Filter questions based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredQuestions(questions)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredQuestions(
        questions.filter(
          (q) => 
            q.question_text.toLowerCase().includes(query) || 
            q.topic?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, questions])

  // Initialize selected questions from props
  useEffect(() => {
    setSelected(new Set(selectedQuestions.map(q => q.id)))
  }, [selectedQuestions])

  const fetchQuestions = async () => {
    setIsLoading(true)
    try {
      // Fetch course questions specifically
      const response = await fetch(`/api/admin/question-banks?type=course`)
      
      if (!response.ok) {
        throw new Error(`Error fetching questions: ${response.status}`)
      }
      
      const data = await response.json()
      setQuestions(data)
      setFilteredQuestions(data)
    } catch (error) {
      console.error("Error fetching questions:", error)
      toast({
        variant: "destructive",
        title: "Failed to load questions",
        description: error instanceof Error ? error.message : "Please try again later",
      })
    } finally {
      setIsLoading(false)
    }
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

  const handleSaveSelection = () => {
    // Find the full question objects for the selected IDs
    const selectedQuestionObjects = questions.filter(q => selected.has(q.id))
    onChange(selectedQuestionObjects)
    setIsOpen(false)
  }

  const handleRemoveQuestion = (questionId: string) => {
    const updatedQuestions = selectedQuestions.filter(q => q.id !== questionId)
    onChange(updatedQuestions)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h3 className="text-lg font-medium">Quiz Questions</h3>
          <p className="text-sm text-muted-foreground">
            Select questions for this lesson's quiz
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button disabled={disabled} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add/Edit Quiz Questions
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Select Quiz Questions</DialogTitle>
              <DialogDescription>
                Choose questions from the question bank to include in this lesson's quiz.
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
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-4 rounded-sm" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {questions.length === 0 ? 
                      "No questions found in the question bank." : 
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
              <Button onClick={handleSaveSelection}>
                Save Selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Display selected questions */}
      {selectedQuestions.length > 0 ? (
        <div className="rounded-md border">
          <div className="p-4 border-b bg-muted/50">
            <h4 className="font-medium">Selected Questions ({selectedQuestions.length})</h4>
          </div>
          <ul className="divide-y">
            {selectedQuestions.map((question, index) => (
              <li key={question.id} className="p-3 flex justify-between items-center">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium w-6 text-center mt-0.5">
                    {index + 1}.
                  </span>
                  <div>
                    <p className="text-sm">{question.question_text}</p>
                    <div className="flex items-center mt-1 gap-2">
                      <Badge variant="outline" className="text-xs">
                        {question.question_type}
                      </Badge>
                      {question.topic && (
                        <span className="text-xs text-muted-foreground">
                          Topic: {question.topic}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveQuestion(question.id)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center">
          <div className="flex justify-center items-center mb-2">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <h4 className="text-sm font-medium mb-1">No Questions Selected</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Select questions from the question bank to include in the quiz
          </p>
          <Button 
            disabled={disabled} 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Questions
          </Button>
        </div>
      )}
    </div>
  )
} 