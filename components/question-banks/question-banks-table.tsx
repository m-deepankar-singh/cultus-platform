"use client"

import { useState } from "react"
import { BookOpen, FileQuestion, FileText, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
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
import { useSearchParams } from "next/navigation"

interface QuestionBank {
  id: string
  name: string
  type: "Course" | "Assessment"
  category: string
  questions: number
  status: "Active" | "Draft" | "Archived"
  lastUpdated: string
}

const questionBanks: QuestionBank[] = [
  {
    id: "1",
    name: "Data Science Fundamentals",
    type: "Course",
    category: "Data Science",
    questions: 45,
    status: "Active",
    lastUpdated: "2 days ago",
  },
  {
    id: "2",
    name: "Web Development Basics",
    type: "Course",
    category: "Web Development",
    questions: 60,
    status: "Active",
    lastUpdated: "1 week ago",
  },
  {
    id: "3",
    name: "JavaScript Certification",
    type: "Assessment",
    category: "Web Development",
    questions: 75,
    status: "Active",
    lastUpdated: "3 days ago",
  },
  {
    id: "4",
    name: "UX Design Principles",
    type: "Course",
    category: "Design",
    questions: 30,
    status: "Draft",
    lastUpdated: "Just now",
  },
  {
    id: "5",
    name: "Cloud Computing Certification",
    type: "Assessment",
    category: "Cloud Computing",
    questions: 90,
    status: "Active",
    lastUpdated: "5 days ago",
  },
  {
    id: "6",
    name: "Mobile App Development",
    type: "Course",
    category: "Mobile Development",
    questions: 55,
    status: "Archived",
    lastUpdated: "2 months ago",
  },
  {
    id: "7",
    name: "Data Science Certification",
    type: "Assessment",
    category: "Data Science",
    questions: 100,
    status: "Active",
    lastUpdated: "1 week ago",
  },
]

export function QuestionBanksTable() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get("type") || "course"

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredQuestionBanks = questionBanks.filter((bank) => {
    const matchesType =
      (typeParam === "course" && bank.type === "Course") || (typeParam === "assessment" && bank.type === "Assessment")
    const matchesSearch = bank.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || bank.category === categoryFilter
    const matchesStatus = statusFilter === "all" || bank.status === statusFilter

    return matchesType && matchesSearch && matchesCategory && matchesStatus
  })

  // Get unique categories for filter
  const categories = Array.from(new Set(questionBanks.map((bank) => bank.category)))

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search question banks..."
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
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="Active">Active</SelectItem>
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
              <TableHead>Category</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuestionBanks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No question banks found.
                </TableCell>
              </TableRow>
            ) : (
              filteredQuestionBanks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                        {bank.type === "Course" ? (
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-medium">{bank.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{bank.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4 text-muted-foreground" />
                      <span>{bank.questions}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={bank.status === "Active" ? "default" : bank.status === "Draft" ? "outline" : "secondary"}
                      className={
                        bank.status === "Active"
                          ? "bg-green-500"
                          : bank.status === "Draft"
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "bg-gray-500"
                      }
                    >
                      {bank.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{bank.lastUpdated}</TableCell>
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
                        <DropdownMenuItem>View questions</DropdownMenuItem>
                        <DropdownMenuItem>Edit bank</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {bank.status === "Active" ? (
                          <DropdownMenuItem>Deactivate</DropdownMenuItem>
                        ) : bank.status === "Draft" ? (
                          <DropdownMenuItem>Activate</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem>Restore</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-red-600">Delete bank</DropdownMenuItem>
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
