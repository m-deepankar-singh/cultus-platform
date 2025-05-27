"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
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
import { JrDataTable } from "./shared/jr-data-table"
import { 
  JrBackground, 
  getBackgroundTypeLabel, 
  getProjectTypeLabel 
} from "@/lib/api/job-readiness/backgrounds"
import { formatDistanceToNow } from "date-fns"

interface JrBackgroundsTableProps {
  backgrounds: JrBackground[]
  isLoading?: boolean
  onEdit: (background: JrBackground) => void
  onDelete: (background: JrBackground) => void
  onRefresh?: () => void
}

export function JrBackgroundsTable({
  backgrounds,
  isLoading = false,
  onEdit,
  onDelete,
  onRefresh,
}: JrBackgroundsTableProps) {
  const [deleteBackground, setDeleteBackground] = React.useState<JrBackground | null>(null)

  // Format grading criteria display
  const formatGradingCriteria = (background: JrBackground) => {
    if (!background.grading_criteria || background.grading_criteria.length === 0) {
      return "No criteria"
    }
    
    return (
      <div className="space-y-1">
        {background.grading_criteria.slice(0, 3).map((criterion, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs font-medium">{criterion.criterion}</span>
            <Badge variant="outline" className="text-xs">
              {criterion.weight}%
            </Badge>
          </div>
        ))}
        {background.grading_criteria.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{background.grading_criteria.length - 3} more...
          </div>
        )}
      </div>
    )
  }

  // Format tier prompts summary
  const formatTierPrompts = (background: JrBackground) => {
    const tiers = [
      { name: "Bronze", system: background.bronze_system_prompt, input: background.bronze_input_prompt },
      { name: "Silver", system: background.silver_system_prompt, input: background.silver_input_prompt },
      { name: "Gold", system: background.gold_system_prompt, input: background.gold_input_prompt },
    ]

    const configuredTiers = tiers.filter(tier => tier.system && tier.input)
    
    return (
      <div className="space-y-1">
        {configuredTiers.map((tier, index) => (
          <Badge key={index} variant="outline" className="text-xs mr-1">
            {tier.name}
          </Badge>
        ))}
        {configuredTiers.length === 0 && (
          <span className="text-xs text-muted-foreground">No prompts configured</span>
        )}
      </div>
    )
  }

  const columns: ColumnDef<JrBackground>[] = [
    {
      accessorKey: "background_type",
      header: "Background Type",
      cell: ({ row }) => {
        const background = row.original
        return (
          <div className="space-y-1">
            <Badge variant="default" className="text-xs">
              {getBackgroundTypeLabel(background.background_type)}
            </Badge>
            <div className="text-xs text-muted-foreground">
              → {getProjectTypeLabel(background.project_type)}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "project_description_template",
      header: "Project Template",
      cell: ({ row }) => {
        const template = row.getValue("project_description_template") as string
        return (
          <div className="max-w-xs">
            <div className="text-sm font-medium line-clamp-2">
              {template.substring(0, 100)}
              {template.length > 100 && "..."}
            </div>
          </div>
        )
      },
    },
    {
      id: "gradingCriteria",
      header: "Grading Criteria",
      cell: ({ row }) => formatGradingCriteria(row.original),
    },
    {
      id: "tierPrompts",
      header: "Configured Tiers",
      cell: ({ row }) => formatTierPrompts(row.original),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at")
        
        // Handle invalid or missing dates
        if (!dateValue) {
          return (
            <div className="text-sm text-muted-foreground">
              -
            </div>
          )
        }

        const date = new Date(dateValue as string)
        
        // Check if the date is valid
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
        const background = row.original

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
                onClick={() => navigator.clipboard.writeText(background.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(background)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Configuration
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteBackground(background)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Configuration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const handleConfirmDelete = () => {
    if (deleteBackground) {
      onDelete(deleteBackground)
      setDeleteBackground(null)
    }
  }

  return (
    <>
      <JrDataTable
        columns={columns}
        data={backgrounds}
        searchKey="background_type"
        searchPlaceholder="Search backgrounds..."
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBackground} onOpenChange={() => setDeleteBackground(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Background Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the configuration for "{getBackgroundTypeLabel(deleteBackground?.background_type || '')}" → "{getProjectTypeLabel(deleteBackground?.project_type || '')}"? This action cannot be undone and will remove all associated AI project generation settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 