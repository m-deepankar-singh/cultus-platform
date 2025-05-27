"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Download, Eye, Filter } from "lucide-react"
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
  JrStudentProgress,
  getStarLevelLabel,
  getTierLevelLabel,
  getTierColor,
  getStarLevelColor,
  formatModuleProgress,
  JrProgressFilters
} from "@/lib/api/job-readiness/progress"
import { formatDistanceToNow } from "date-fns"

interface JrProgressTableProps {
  progress: JrStudentProgress[]
  isLoading?: boolean
  onOverrideProgress: (progress: JrStudentProgress) => void
  onExport: (format: "csv" | "xlsx") => void
  onRefresh?: () => void
  filters: JrProgressFilters
  onFiltersChange: (filters: JrProgressFilters) => void
  // Available options for filters
  products?: { id: string; name: string }[]
  clients?: { id: string; name: string }[]
}

export function JrProgressTable({
  progress,
  isLoading = false,
  onOverrideProgress,
  onExport,
  onRefresh,
  filters,
  onFiltersChange,
  products = [],
  clients = [],
}: JrProgressTableProps) {
  
  // Format student name display
  const formatStudentName = (student?: { first_name: string; last_name: string; email: string }) => {
    if (!student) return "Unknown Student"
    return `${student.first_name} ${student.last_name}`
  }

  const columns: ColumnDef<JrStudentProgress>[] = [
    {
      accessorKey: "student",
      header: "Student",
      cell: ({ row }) => {
        const progress = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">
              {formatStudentName(progress.student)}
            </div>
            <div className="text-sm text-muted-foreground">
              {progress.student?.email || "No email"}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "product",
      header: "Job Readiness Product",
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
      accessorKey: "job_readiness_star_level",
      header: "Star Level",
      cell: ({ row }) => {
        const level = row.getValue("job_readiness_star_level") as string | null
        return (
          <Badge variant="outline" className={`text-xs ${getStarLevelColor(level)}`}>
            {getStarLevelLabel(level)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "job_readiness_tier",
      header: "Current Tier",
      cell: ({ row }) => {
        const tier = row.getValue("job_readiness_tier") as string
        return (
          <Badge variant="outline" className={`text-xs ${getTierColor(tier)}`}>
            {getTierLevelLabel(tier)}
          </Badge>
        )
      },
    },
    {
      id: "moduleProgress",
      header: "Module Progress",
      cell: ({ row }) => {
        const progress = row.original.module_progress
        return (
          <div className="text-sm">
            {formatModuleProgress(progress)}
          </div>
        )
      },
    },
    {
      accessorKey: "updated_at",
      header: "Last Updated",
      cell: ({ row }) => {
        const dateValue = row.getValue("updated_at")
        
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
        const progress = row.original

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
                onClick={() => navigator.clipboard.writeText(progress.student_id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Copy Student ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOverrideProgress(progress)}>
                <Edit className="mr-2 h-4 w-4" />
                Override Progress
              </DropdownMenuItem>
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

          {/* Product Filter */}
          <Select
            value={filters.productId || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, productId: value === "all" ? undefined : value })}
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

          {/* Client Filter */}
          <Select
            value={filters.clientId || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, clientId: value === "all" ? undefined : value })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export Actions */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("xlsx")}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Data Table */}
      <JrDataTable
        columns={columns}
        data={progress}
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