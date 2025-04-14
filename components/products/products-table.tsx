"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, FileText, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Product {
  id: string
  name: string
  type: "Course" | "Assessment"
  status: "Published" | "Draft" | "Archived"
  clients: number
  modules: number
  lastUpdated: string
}

const products: Product[] = [
  {
    id: "1",
    name: "Introduction to Data Science",
    type: "Course",
    status: "Published",
    clients: 12,
    modules: 8,
    lastUpdated: "2 days ago",
  },
  {
    id: "2",
    name: "Web Development Fundamentals",
    type: "Course",
    status: "Published",
    clients: 8,
    modules: 10,
    lastUpdated: "1 week ago",
  },
  {
    id: "3",
    name: "JavaScript Proficiency Assessment",
    type: "Assessment",
    status: "Published",
    clients: 15,
    modules: 5,
    lastUpdated: "3 days ago",
  },
  {
    id: "4",
    name: "UX Design Principles",
    type: "Course",
    status: "Draft",
    clients: 0,
    modules: 6,
    lastUpdated: "Just now",
  },
  {
    id: "5",
    name: "Cloud Computing Certification",
    type: "Assessment",
    status: "Published",
    clients: 7,
    modules: 4,
    lastUpdated: "5 days ago",
  },
  {
    id: "6",
    name: "Mobile App Development",
    type: "Course",
    status: "Archived",
    clients: 3,
    modules: 12,
    lastUpdated: "2 months ago",
  },
]

export function ProductsTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || product.type === typeFilter
    const matchesStatus = statusFilter === "all" || product.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Course">Course</SelectItem>
                  <SelectItem value="Assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                        {product.type === "Course" ? (
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                        {product.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="info"
                      className={
                        product.type === "Course"
                          ? ""
                          : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/50 dark:text-purple-300"
                      }
                    >
                      {product.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "Published"
                          ? "success"
                          : product.status === "Draft"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.clients}</TableCell>
                  <TableCell>{product.modules}</TableCell>
                  <TableCell>{product.lastUpdated}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Link href={`/products/${product.id}`} className="flex w-full">
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit product</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {product.status === "Published" ? (
                          <DropdownMenuItem>Unpublish</DropdownMenuItem>
                        ) : product.status === "Draft" ? (
                          <DropdownMenuItem>Publish</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem>Restore</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600">Delete product</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
