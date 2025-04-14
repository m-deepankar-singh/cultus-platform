"use client"

import { useState } from "react"
import { BookOpen, FileText, MoreHorizontal, Package, Search, SlidersHorizontal } from "lucide-react"
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

interface Module {
  id: string
  title: string
  type: "Content" | "Quiz"
  status: "Published" | "Draft" | "Archived"
  products: number
  duration: string
  lastUpdated: string
}

const modules: Module[] = [
  {
    id: "1",
    title: "Introduction to Data Science",
    type: "Content",
    status: "Published",
    products: 3,
    duration: "15 min",
    lastUpdated: "2 days ago",
  },
  {
    id: "2",
    title: "Data Collection Methods",
    type: "Content",
    status: "Published",
    products: 2,
    duration: "30 min",
    lastUpdated: "1 week ago",
  },
  {
    id: "3",
    title: "JavaScript Basics Quiz",
    type: "Quiz",
    status: "Published",
    products: 4,
    duration: "20 min",
    lastUpdated: "3 days ago",
  },
  {
    id: "4",
    title: "UX Design Principles",
    type: "Content",
    status: "Draft",
    products: 1,
    duration: "45 min",
    lastUpdated: "Just now",
  },
  {
    id: "5",
    title: "Cloud Computing Assessment",
    type: "Quiz",
    status: "Published",
    products: 2,
    duration: "25 min",
    lastUpdated: "5 days ago",
  },
  {
    id: "6",
    title: "Mobile App Development Intro",
    type: "Content",
    status: "Archived",
    products: 0,
    duration: "20 min",
    lastUpdated: "2 months ago",
  },
]

export function ModulesTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredModules = modules.filter((module) => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || module.type === typeFilter
    const matchesStatus = statusFilter === "all" || module.status === statusFilter

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
              placeholder="Search modules..."
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
                  <SelectItem value="Content">Content</SelectItem>
                  <SelectItem value="Quiz">Quiz</SelectItem>
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
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No modules found.
                </TableCell>
              </TableRow>
            ) : (
              filteredModules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                        {module.type === "Content" ? (
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-medium">{module.title}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        module.type === "Content"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-purple-200 bg-purple-50 text-purple-700"
                      }
                    >
                      {module.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        module.status === "Published" ? "default" : module.status === "Draft" ? "outline" : "secondary"
                      }
                      className={
                        module.status === "Published"
                          ? "bg-green-500"
                          : module.status === "Draft"
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "bg-gray-500"
                      }
                    >
                      {module.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{module.products}</span>
                    </div>
                  </TableCell>
                  <TableCell>{module.duration}</TableCell>
                  <TableCell>{module.lastUpdated}</TableCell>
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
                        <DropdownMenuItem>Edit module</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {module.status === "Published" ? (
                          <DropdownMenuItem>Unpublish</DropdownMenuItem>
                        ) : module.status === "Draft" ? (
                          <DropdownMenuItem>Publish</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem>Restore</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600">Delete module</DropdownMenuItem>
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
