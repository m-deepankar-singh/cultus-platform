"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash2, Eye, Clock, Users, CheckCircle, XCircle } from "lucide-react"
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
import { formatDistanceToNow } from "date-fns"

export interface JrPromotionExamConfig {
  id: string
  product_id: string
  is_enabled: boolean
  question_count: number
  pass_threshold: number
  time_limit_minutes: number
  system_prompt?: string
  created_at: string
  updated_at: string
  products?: {
    id: string
    name: string
  }
}

interface JrPromotionExamConfigTableProps {
  examConfigs: JrPromotionExamConfig[]
  isLoading?: boolean
  onEdit: (config: JrPromotionExamConfig) => void
  onDelete: (config: JrPromotionExamConfig) => void
  onRefresh?: () => void
}

export function JrPromotionExamConfigTable({
  examConfigs,
  isLoading = false,
  onEdit,
  onDelete,
  onRefresh,
}: JrPromotionExamConfigTableProps) {
  const [deleteConfig, setDeleteConfig] = React.useState<JrPromotionExamConfig | null>(null)

  const columns: ColumnDef<JrPromotionExamConfig>[] = [
    {
      id: "product_name",
      accessorKey: "products.name",
      header: "Product Name",
      cell: ({ row }) => {
        const config = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{config.products?.name || "Unknown Product"}</div>
            <div className="text-sm text-muted-foreground">
              ID: {config.product_id.slice(0, 8)}...
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "is_enabled",
      header: "Status",
      cell: ({ row }) => {
        const isEnabled = row.getValue("is_enabled") as boolean
        return (
          <Badge variant={isEnabled ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
            {isEnabled ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "question_count",
      header: "Questions",
      cell: ({ row }) => {
        const count = row.getValue("question_count") as number
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{count}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "pass_threshold",
      header: "Pass Threshold",
      cell: ({ row }) => {
        const threshold = row.getValue("pass_threshold") as number
        return (
          <Badge variant="outline" className="font-mono">
            {threshold}%
          </Badge>
        )
      },
    },
    {
      accessorKey: "time_limit_minutes",
      header: "Time Limit",
      cell: ({ row }) => {
        const timeLimit = row.getValue("time_limit_minutes") as number
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{timeLimit} min</span>
          </div>
        )
      },
    },
    {
      id: "system_prompt",
      header: "System Prompt",
      cell: ({ row }) => {
        const config = row.original
        const hasPrompt = config.system_prompt && config.system_prompt.trim().length > 0
        return (
          <div className="max-w-[200px]">
            {hasPrompt ? (
              <div className="text-sm text-muted-foreground truncate">
                {config.system_prompt}
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at")
        
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
        const config = row.original

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
                onClick={() => navigator.clipboard.writeText(config.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(config)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Configuration
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteConfig(config)}
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
    if (deleteConfig) {
      onDelete(deleteConfig)
      setDeleteConfig(null)
    }
  }

  return (
    <>
      <JrDataTable
        columns={columns}
        data={examConfigs}
        searchKey="product_name"
        searchPlaceholder="Search by product name..."
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      <AlertDialog open={!!deleteConfig} onOpenChange={() => setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion exam 
              configuration for "{deleteConfig?.products?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 