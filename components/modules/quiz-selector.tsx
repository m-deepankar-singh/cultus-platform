"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Plus, Search, X, ChevronLeft, ChevronRight } from "lucide-react"
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
}: QuizSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [allQuestionsFromAPI, setAllQuestionsFromAPI] = useState<Question[]>([]) // Store ALL questions from API (for selection lookup)
  const [allAvailableQuestions, setAllAvailableQuestions] = useState<Question[]>([]) // Store current search/filter results
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]) // Store current page questions
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedQuestions.map(q => q.id)))
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10) // 10 questions per page
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  
  const { toast } = useToast()

  // Fetch questions when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchQuestions(1, "")
    }
  }, [isOpen])

  // Handle search with pagination reset
  useEffect(() => {
    if (isOpen) {
      // Debounce search to avoid too many API calls
      const timeoutId = setTimeout(() => {
        fetchQuestions(1, searchQuery)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, isOpen])

  // Initialize selected questions from props
  useEffect(() => {
    setSelected(new Set(selectedQuestions.map(q => q.id)))
  }, [selectedQuestions])

  const fetchQuestions = async (page: number = 1, search: string = "") => {
    try {
      setIsLoadingQuestions(true)

      // Fetch ALL course questions (with search if provided) - we'll paginate after filtering
      const queryParams = new URLSearchParams({
        type: 'course',
        page: '1',
        pageSize: '1000', // Get a large number to get all questions
      })

      // Add search parameter if provided
      if (search.trim()) {
        queryParams.append('search', search.trim())
      }

      const response = await fetch(`/api/admin/question-banks?${queryParams}`, {
        cache: 'no-store' // Disable caching
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching questions: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Handle the paginated response format
      const questionData = result.data || [];
      
      // Get IDs of questions already selected for filtering
      const selectedQuestionIds = new Set(selectedQuestions.map(q => q.id));
      
      // Client-side filtering to exclude questions already selected
      const allFilteredQuestions = questionData.filter((q: Question) => !selectedQuestionIds.has(q.id));
      
      // Store ALL questions from API (without any search filtering) for selection lookup
      // This only gets updated when we fetch without search (i.e., when dialog opens or search is cleared)
      if (!search.trim()) {
        setAllQuestionsFromAPI(allFilteredQuestions);
      }
      
      // Now do frontend pagination on the filtered results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedQuestions = allFilteredQuestions.slice(startIndex, endIndex);
      
      setAllAvailableQuestions(allFilteredQuestions) // Store current search/filter results for pagination
      setFilteredQuestions(paginatedQuestions) // Display only current page
      
      // Calculate pagination based on filtered results
      const filteredTotal = allFilteredQuestions.length;
      const filteredTotalPages = Math.ceil(filteredTotal / pageSize);
      
      setTotalQuestions(filteredTotal)
      setTotalPages(filteredTotalPages)
      setCurrentPage(page)
      
    } catch (error) {
      console.error("Error fetching questions:", error)
      toast({
        variant: "destructive",
        title: "Failed to load questions",
        description: error instanceof Error ? error.message : "Please try again later",
      })
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchQuestions(page, searchQuery)
    }
  }

  const handleOpenDialog = () => {
    setSelected(new Set(selectedQuestions.map(q => q.id)))
    setSearchQuery("")
    setCurrentPage(1)
    setIsOpen(true)
    
    // Fetch questions will be called by useEffect when isOpen changes
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
    // Find the full question objects for the selected IDs from ALL questions (not just current search results)
    const selectedQuestionObjects = allQuestionsFromAPI.filter(q => selected.has(q.id))
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
            <Button disabled={disabled} variant="outline" onClick={handleOpenDialog}>
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
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <div>
                    {isLoadingQuestions ? (
                      "Loading questions..."
                    ) : filteredQuestions.length > 0 ? (
                      <>
                        Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalQuestions || filteredQuestions.length)} of {totalQuestions || filteredQuestions.length} questions
                        {searchQuery ? ` matching "${searchQuery}"` : ""}
                      </>
                    ) : (
                      "No questions found"
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="text-xs">
                      Page {currentPage} of {totalPages}
                    </div>
                  )}
                </div>
                
                <ScrollArea className="h-[400px] rounded-md border">
                  {isLoadingQuestions ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading questions...
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {totalQuestions === 0 ? 
                        "No additional questions available in the question bank." : 
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
                              disabled={isLoadingQuestions}
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
              
              {/* Pagination Controls - Show when there are more questions than page size */}
              {filteredQuestions.length > 0 && totalQuestions > pageSize && (
                <div className="flex items-center justify-center space-x-2 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoadingQuestions}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoadingQuestions}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoadingQuestions}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
                <div className="mt-2 text-xs text-muted-foreground">
                  {selected.size} question{selected.size !== 1 ? 's' : ''} selected
                </div>
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
              handleOpenDialog();
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