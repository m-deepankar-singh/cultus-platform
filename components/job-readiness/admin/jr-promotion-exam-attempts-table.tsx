"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, User, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { JrDataTable } from "./shared/jr-data-table"
import { formatDistanceToNow } from "date-fns"

export interface JrPromotionExamAttempt {
  id: string
  student_id: string
  product_id: string
  score: number | null
  passed: boolean | null
  timestamp_start: string
  timestamp_end: string | null
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  students?: {
    id: string
    email: string
    full_name?: string
  }
  products?: {
    id: string
    name: string
  }
}

interface JrPromotionExamAttemptsTableProps {
  attempts: JrPromotionExamAttempt[]
  isLoading?: boolean
  onViewDetails: (attempt: JrPromotionExamAttempt) => void
  onRefresh?: () => void
}

export function JrPromotionExamAttemptsTable({
  attempts,
  isLoading = false,
  onViewDetails,
  onRefresh,
}: JrPromotionExamAttemptsTableProps) {

  const getStatusBadge = (attempt: JrPromotionExamAttempt) => {
    switch (attempt.status) {
      case 'COMPLETED':
        if (attempt.passed === true) {
          return (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Passed
            </Badge>
          )
        } else if (attempt.passed === false) {
          return (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
          )
        } else {
          return (
            <Badge variant="secondary">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )
        }
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'ABANDONED':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Abandoned
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            Unknown
          </Badge>
        )
    }
  }

  const columns: ColumnDef<JrPromotionExamAttempt>[] = [
    {
      id: "student_info",
      accessorKey: "students",
      header: "Student",
      cell: ({ row }) => {
        const attempt = row.original
        const student = attempt.students
        return (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {student?.full_name || student?.email || "Unknown Student"}
            </div>
            {student?.email && student?.full_name && (
              <div className="text-sm text-muted-foreground">
                {student.email}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "products.name",
      header: "Product",
      cell: ({ row }) => {
        const attempt = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{attempt.products?.name || "Unknown Product"}</div>
            <div className="text-sm text-muted-foreground">
              ID: {attempt.product_id.slice(0, 8)}...
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original),
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => {
        const attempt = row.original
        if (attempt.score === null) {
          return (
            <div className="text-sm text-muted-foreground">
              -
            </div>
          )
        }
        return (
          <Badge variant="outline" className="font-mono">
            {attempt.score}%
          </Badge>
        )
      },
    },
    {
      id: "time_taken",
      header: "Time Taken",
      cell: ({ row }) => {
        const attempt = row.original
        // Calculate time taken from timestamps
        if (!attempt.timestamp_start || !attempt.timestamp_end) {
          return (
            <div className="text-sm text-muted-foreground">
              -
            </div>
          )
        }
        
        const startTime = new Date(attempt.timestamp_start)
        const endTime = new Date(attempt.timestamp_end)
        const timeTakenMs = endTime.getTime() - startTime.getTime()
        const timeTakenMinutes = Math.round(timeTakenMs / (1000 * 60))
        
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{timeTakenMinutes} min</span>
          </div>
        )
      },
    },
    {
      accessorKey: "timestamp_start",
      header: "Started",
      cell: ({ row }) => {
        const dateValue = row.getValue("timestamp_start")
        
        if (!dateValue) {
          return (
            <div className="text-sm text-muted-foreground">
              -
            </div>
          )
        }

        const date = new Date(dateValue as string)
        
        if (isNaN(date.getTime())) {
          return (
            <div className="text-sm text-muted-foreground">
              Invalid date
            </div>
          )
        }

        return (
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </div>
        )
      },
    },
    {
      accessorKey: "timestamp_end",
      header: "Completed",
      cell: ({ row }) => {
        const dateValue = row.getValue("timestamp_end")
        
        if (!dateValue) {
          return (
            <div className="text-sm text-muted-foreground">
              -
            </div>
          )
        }

        const date = new Date(dateValue as string)
        
        if (isNaN(date.getTime())) {
          return (
            <div className="text-sm text-muted-foreground">
              Invalid date
            </div>
          )
        }

        return (
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const attempt = row.original

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
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(attempt.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewDetails(attempt)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <JrDataTable
      columns={columns}
      data={attempts}
      searchKey="student_info"
      searchPlaceholder="Search by student..."
      isLoading={isLoading}
      onRefresh={onRefresh}
    />
  )
} 