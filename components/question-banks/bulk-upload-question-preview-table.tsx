"use client"

import React, { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"

interface QuestionUploadData {
  question_text: string
  question_type: 'MCQ' | 'MSQ'
  options: { id: string; text: string }[]
  correct_answer: string | { answers: string[] }
  topic?: string | null
  difficulty?: string | null
  _row_number?: number
  _errors?: Record<string, string>
}

interface BulkUploadQuestionPreviewTableProps {
  questions: QuestionUploadData[]
}

export function BulkUploadQuestionPreviewTable({ questions }: BulkUploadQuestionPreviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  
  // Calculate if we need pagination (e.g., if more than 20 rows)
  const needsPagination = questions.length > 20
  const displayQuestions = needsPagination ? questions.slice(0, 20) : questions
  
  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }
  
  // Format correct answer for display
  const formatCorrectAnswer = (correctAnswer: string | { answers: string[] }, questionType: 'MCQ' | 'MSQ') => {
    if (questionType === 'MSQ' && typeof correctAnswer === 'object' && 'answers' in correctAnswer) {
      return correctAnswer.answers.join(', ')
    }
    return typeof correctAnswer === 'string' ? correctAnswer : JSON.stringify(correctAnswer)
  }
  
  // Format options for display
  const formatOptions = (options: { id: string; text: string }[]) => {
    return options.map(opt => `${opt.id}: ${opt.text}`).join(' | ')
  }
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="min-w-[300px]">Question</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayQuestions.map((question, index) => {
            const hasErrors = question._errors && Object.keys(question._errors).length > 0
            const isExpanded = expandedRows.has(index)
            
            return (
              <React.Fragment key={index}>
                <TableRow className={hasErrors ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell>
                    <Collapsible>
                      <CollapsibleTrigger 
                        onClick={() => toggleRowExpansion(index)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                    </Collapsible>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    <div className="max-w-[300px]">
                      <p className="truncate text-sm">
                        {question.question_text || "No question text"}
                      </p>
                      {question._row_number && (
                        <p className="text-xs text-muted-foreground">Row {question._row_number}</p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">
                      {question.question_type || "Unknown"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm">
                      {question.topic || "—"}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {question.difficulty ? (
                      <Badge 
                        variant="outline"
                        className={
                          question.difficulty === 'easy'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
                            : question.difficulty === 'medium'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                        }
                      >
                        {question.difficulty}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {hasErrors ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center text-destructive">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span className="text-sm">Error</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="list-disc pl-4 space-y-1">
                              {Object.entries(question._errors || {}).map(([field, error]) => (
                                <li key={`${index}-tooltip-${field}`} className="text-xs">
                                  <span className="font-medium">{field}:</span> {error}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Valid</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                
                {/* Expanded row content */}
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="p-4 bg-muted/50 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {/* Question Details */}
                              <div>
                                <h4 className="font-medium mb-2">Question Details</h4>
                                <div className="space-y-2">
                                  <div>
                                    <span className="font-medium">Full Text:</span>
                                    <p className="mt-1 text-muted-foreground break-words">
                                      {question.question_text || "No question text"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Type:</span>
                                    <span className="ml-2">{question.question_type || "Unknown"}</span>
                                  </div>
                                  {question.topic && (
                                    <div>
                                      <span className="font-medium">Topic:</span>
                                      <span className="ml-2">{question.topic}</span>
                                    </div>
                                  )}
                                  {question.difficulty && (
                                    <div>
                                      <span className="font-medium">Difficulty:</span>
                                      <span className="ml-2">{question.difficulty}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Options and Answers */}
                              <div>
                                <h4 className="font-medium mb-2">Options & Answers</h4>
                                <div className="space-y-2">
                                  <div>
                                    <span className="font-medium">Options:</span>
                                    {question.options && question.options.length > 0 ? (
                                      <ul className="mt-1 space-y-1">
                                        {question.options.map((option, optIndex) => (
                                          <li key={`${index}-option-${optIndex}`} className="text-muted-foreground">
                                            <span className="font-mono text-xs bg-muted px-1 rounded">
                                              {option.id}
                                            </span>
                                            {": "}
                                            {option.text}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="mt-1 text-muted-foreground">No options</p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-medium">Correct Answer:</span>
                                    <p className="mt-1 text-muted-foreground font-mono text-xs">
                                      {formatCorrectAnswer(question.correct_answer, question.question_type)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Validation Errors */}
                            {hasErrors && (
                              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
                                <h4 className="font-medium text-destructive mb-2">Validation Errors</h4>
                                <ul className="space-y-1">
                                  {Object.entries(question._errors || {}).map(([field, error]) => (
                                    <li key={`${index}-error-${field}`} className="text-sm">
                                      <span className="font-medium text-destructive">{field}:</span>
                                      <span className="ml-2 text-muted-foreground">{error}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
      
      {needsPagination && (
        <div className="px-4 py-2 text-sm text-muted-foreground border-t">
          Showing 20 of {questions.length} questions. All questions will be processed on upload.
        </div>
      )}
    </div>
  )
}