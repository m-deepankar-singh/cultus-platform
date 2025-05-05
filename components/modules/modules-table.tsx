"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel, 
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  ChevronDown, 
  MoreHorizontal,
  Pencil,
  Trash,
  ExternalLink,
  FileText,
  BookOpen,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface Module {
  id: string
  name: string
  type: "Course" | "Assessment"
  created_at: string
  updated_at: string
  sequence: number
  product_id: string | null
  configuration: Record<string, unknown>
  products?: {
    id: string
    name: string
  }[] | null
}

interface ModulesTableProps {
  modules: Module[]
  isAdmin: boolean
}

export function ModulesTable({ modules, isAdmin }: ModulesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns: ColumnDef<Module>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <Badge variant={type === "Course" ? "default" : "secondary"}>
            {type === "Course" ? <BookOpen className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
            {type}
          </Badge>
        )
      },
  },
  {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
      accessorKey: "products.name",
      header: "Assigned To",
      cell: ({ row }) => {
        const products = row.original.products
        return (
          <div>
            {products && products.length > 0 ? (
              <Link 
                href={`/products/${products[0].id}`}
                className="text-blue-600 hover:underline flex items-center"
              >
                {products[0].name}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            ) : (
              <span className="text-muted-foreground italic">Unassigned</span>
            )}
          </div>
        )
      },
  },
  {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return <div>{format(date, "MMM d, yyyy")}</div>
      },
  },
    {
      id: "actions",
      cell: ({ row }) => {
        const module = row.original
        
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
              <DropdownMenuItem asChild>
                <Link href={`/modules/${module.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/modules/${module.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: modules,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div>
      <div className="flex items-center py-4">
            <Input
          placeholder="Filter modules..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
            </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No modules found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
