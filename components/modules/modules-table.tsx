"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowUpDown, 
  MoreHorizontal,
  Pencil,
  Trash,
  ExternalLink,
  FileText,
  BookOpen,
  Eye,
  Search
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
import { DataPagination } from "@/components/ui/data-pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface PaginatedResponse {
  data: Module[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

interface ModulesTableProps {
  initialModules?: Module[]
  isAdmin: boolean
  initialType?: "Course" | "Assessment" | "all"
}

export function ModulesTable({ initialModules = [], isAdmin, initialType = "all" }: ModulesTableProps) {
  // State for modules data and pagination
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize] = useState(20)
  
  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [moduleType, setModuleType] = useState<"Course" | "Assessment" | "all">(initialType)
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search term changes
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Fetch modules when filters or pagination changes
  useEffect(() => {
    fetchModules()
  }, [currentPage, pageSize, debouncedSearchTerm, moduleType])
  
  const fetchModules = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      })
      
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm)
      }
      
      if (moduleType !== 'all') {
        params.append('type', moduleType)
      }
      
      // Fetch modules from API
      const response = await fetch(`/api/admin/modules?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error fetching modules: ${response.status}`)
      }
      
      const result: PaginatedResponse = await response.json()
      
      setModules(result.data)
      setTotalCount(result.metadata.totalCount)
      setTotalPages(result.metadata.totalPages)
    } catch (error) {
      console.error("Failed to fetch modules:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  
  // Handle filter changes
  const handleTypeChange = (type: "Course" | "Assessment" | "all") => {
    setModuleType(type)
    setCurrentPage(1) // Reset to first page
  }

  return (
    <div>
      <div className="flex items-center py-4">
        <div className="relative flex-1 mr-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={moduleType}
          onValueChange={(value) => handleTypeChange(value as "Course" | "Assessment" | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Course">Courses</SelectItem>
            <SelectItem value="Assessment">Assessments</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>
                <div className="flex items-center">
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell>
                    <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="w-40 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell>
                    <div className="w-8 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : modules.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No modules found.
                </TableCell>
              </TableRow>
            ) : (
              // Modules data
              modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>
                    <Badge variant={module.type === "Course" ? "default" : "secondary"}>
                      {module.type === "Course" ? <BookOpen className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
                      {module.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{module.name}</TableCell>
                  <TableCell>
                    {module.products && module.products.length > 0 ? (
                      <Link 
                        href={`/products/${module.products[0].id}`}
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        {module.products[0].name}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(module.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {!loading && totalPages > 0 && (
        <div className="py-4">
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}
