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
import { JrProduct, getProductTierConfiguration } from "@/lib/api/job-readiness/products"
import { formatDistanceToNow } from "date-fns"

interface JrProductsTableProps {
  products: JrProduct[]
  isLoading?: boolean
  onEdit: (product: JrProduct) => void
  onDelete: (product: JrProduct) => void
  onRefresh?: () => void
}

export function JrProductsTable({
  products,
  isLoading = false,
  onEdit,
  onDelete,
  onRefresh,
}: JrProductsTableProps) {
  const [deleteProduct, setDeleteProduct] = React.useState<JrProduct | null>(null)

  // Format tier ranges display
  const formatTierRanges = (product: JrProduct) => {
    const config = getProductTierConfiguration(product)
    if (!config) return "Not configured"
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            Bronze
          </Badge>
          <span className="text-xs text-muted-foreground">
            {config.bronze.min}-{config.bronze.max}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
            Silver
          </Badge>
          <span className="text-xs text-muted-foreground">
            {config.silver.min}-{config.silver.max}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
            Gold
          </Badge>
          <span className="text-xs text-muted-foreground">
            {config.gold.min}-{config.gold.max}%
          </span>
        </div>
      </div>
    )
  }

  const columns: ColumnDef<JrProduct>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="space-y-1">
            <div className="font-medium">{product.name}</div>
            {product.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("type")}</Badge>
      ),
    },
    {
      id: "tierRanges",
      header: "Tier Score Ranges",
      cell: ({ row }) => formatTierRanges(row.original),
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
        const product = row.original

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
                onClick={() => navigator.clipboard.writeText(product.id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteProduct(product)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const handleConfirmDelete = () => {
    if (deleteProduct) {
      onDelete(deleteProduct)
      setDeleteProduct(null)
    }
  }

  return (
    <>
      <JrDataTable
        columns={columns}
        data={products}
        searchKey="name"
        searchPlaceholder="Search products..."
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProduct?.name}"? This action cannot be undone and will remove all associated tier configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 