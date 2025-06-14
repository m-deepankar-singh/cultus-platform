"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

interface LearnerUploadData {
  full_name: string
  email: string
  phone_number?: string
  client_id: string
  client_name?: string // Add this for display in the table
  is_active: boolean
  job_readiness_background_type: string
  _errors?: Record<string, string>
}

interface BulkUploadPreviewTableProps {
  learners: LearnerUploadData[]
}

export function BulkUploadPreviewTable({ learners }: BulkUploadPreviewTableProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(learners.length / pageSize)
  
  // Calculate the learners to display based on current page
  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, learners.length)
  const displayLearners = learners.slice(startIndex, endIndex)
  
  // Get total count of learners with errors for display
  const totalErrorCount = learners.filter(
    learner => learner._errors && Object.keys(learner._errors).length > 0
  ).length
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Background</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Validation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayLearners.map((learner, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{learner.full_name}</TableCell>
              <TableCell>{learner.email}</TableCell>
              <TableCell>{learner.phone_number || "—"}</TableCell>
              <TableCell>{learner.client_name || "Unknown"}</TableCell>
              <TableCell>{learner.job_readiness_background_type || "Missing"}</TableCell>
              <TableCell>
                <Badge variant={learner.is_active ? "success" : "secondary"}>
                  {learner.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {learner._errors && Object.keys(learner._errors).length > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center text-destructive">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span>Error</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <ul className="list-disc pl-4">
                          {Object.entries(learner._errors).map(([field, error]) => (
                            <li key={field}>
                              <span className="font-medium">{field}:</span> {error}
                            </li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Valid
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          
          {/* Show empty rows if current page isn't full to maintain layout */}
          {displayLearners.length < pageSize && Array.from({ length: pageSize - displayLearners.length }).map((_, i) => (
            <TableRow key={`empty-${i}`}>
              <TableCell colSpan={7} className="h-10"></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {learners.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {learners.length} entries
            {totalErrorCount > 0 && (
              <span className="text-destructive ml-1">
                ({totalErrorCount} with errors)
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 