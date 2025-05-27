"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, CheckCircle, XCircle, Clock, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { JrDataTable } from "./shared/jr-data-table"
import {
  JrSubmission,
  JrSubmissionsFilters,
  getSubmissionTypeLabel,
  getSubmissionTypeColor,
  getAiGradeStatusLabel,
  getAiGradeStatusColor,
  getManualReviewStatusLabel,
  getManualReviewStatusColor,
  formatSubmissionDate,
  requiresManualReview,
  isInterviewSubmission
} from "@/lib/api/job-readiness/submissions"

interface JrSubmissionsTableProps {
  submissions: JrSubmission[]
  isLoading?: boolean
  onReviewSubmission: (submission: JrSubmission) => void
  onViewDetails: (submission: JrSubmission) => void
  onRefresh?: () => void
  filters: JrSubmissionsFilters
  onFiltersChange: (filters: JrSubmissionsFilters) => void
  // Available options for filters
  products?: { id: string; name: string }[]
  clients?: { id: string; name: string }[]
}

export function JrSubmissionsTable({
  submissions,
  isLoading = false,
  onReviewSubmission,
  onViewDetails,
  onRefresh,
  filters,
  onFiltersChange,
  products = [],
  clients = [],
}: JrSubmissionsTableProps) {
  
  // Format student name display
  const formatStudentName = (student?: { first_name: string; last_name: string; email: string }) => {
    if (!student) return "Unknown Student"
    return `${student.first_name} ${student.last_name}`
  }

  const columns: ColumnDef<JrSubmission>[] = [
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const submission = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">
              {formatStudentName(submission.student)}
            </div>
            <div className="text-sm text-muted-foreground">
              {submission.student?.email || "No email"}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original.product
        return (
          <div className="max-w-xs">
            <div className="font-medium text-sm">
              {product?.name || "Unknown Product"}
            </div>
            {product?.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {product.description}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "submission_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("submission_type") as string
        return (
          <Badge variant="outline" className={`text-xs ${getSubmissionTypeColor(type)}`}>
            {getSubmissionTypeLabel(type)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "submission_date",
      header: "Submitted",
      cell: ({ row }) => {
        const date = row.getValue("submission_date") as string
        return (
          <div className="text-sm">
            {formatSubmissionDate(date)}
          </div>
        )
      },
    },
    {
      accessorKey: "ai_grade_status",
      header: "AI Grade",
      cell: ({ row }) => {
        const status = row.getValue("ai_grade_status") as string
        const score = row.original.score
        return (
          <div className="space-y-1">
            <Badge variant="outline" className={`text-xs ${getAiGradeStatusColor(status)}`}>
              {getAiGradeStatusLabel(status)}
            </Badge>
            {score !== undefined && (
              <div className="text-xs text-muted-foreground">
                Score: {score}%
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "manual_review_status",
      header: "Review Status",
      cell: ({ row }) => {
        const status = row.getValue("manual_review_status") as string
        const reviewDate = row.original.review_date
        return (
          <div className="space-y-1">
            <Badge variant="outline" className={`text-xs ${getManualReviewStatusColor(status)}`}>
              {getManualReviewStatusLabel(status)}
            </Badge>
            {reviewDate && (
              <div className="text-xs text-muted-foreground">
                {formatSubmissionDate(reviewDate)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const submission = row.original
        const needsReview = requiresManualReview(submission)
        const canReview = isInterviewSubmission(submission)

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewDetails(submission)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(submission.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Copy Submission ID
              </DropdownMenuItem>
              {canReview && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onReviewSubmission(submission)}
                    disabled={!needsReview}
                    className={needsReview ? "text-orange-600" : ""}
                  >
                    {needsReview ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Review Required
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Review Submission
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* Search */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search students..."
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="text-sm"
            />
          </div>

          {/* Submission Type Filter */}
          <Select
            value={filters.submissionType || "all"}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              submissionType: value === "all" ? undefined : value as "project" | "interview"
            })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project">📂 Projects</SelectItem>
              <SelectItem value="interview">🎥 Interviews</SelectItem>
            </SelectContent>
          </Select>

          {/* Review Status Filter */}
          <Select
            value={filters.reviewStatus || "all"}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              reviewStatus: value === "all" ? undefined : value as "pending" | "approved" | "rejected"
            })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">⏳ Pending Review</SelectItem>
              <SelectItem value="approved">✅ Approved</SelectItem>
              <SelectItem value="rejected">❌ Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Product Filter */}
          <Select
            value={filters.productId || "all"}
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              productId: value === "all" ? undefined : value 
            })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onFiltersChange({ 
              ...filters, 
              submissionType: "interview", 
              reviewStatus: "pending" 
            })}
          >
            <Filter className="h-4 w-4 mr-2" />
            Pending Reviews
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <JrDataTable
        columns={columns}
        data={submissions}
        searchKey="student"
        searchPlaceholder="Search students..."
        isLoading={isLoading}
        onRefresh={onRefresh}
        // Hide the built-in search since we have custom filters
        hideSearch={true}
      />
    </div>
  )
} 