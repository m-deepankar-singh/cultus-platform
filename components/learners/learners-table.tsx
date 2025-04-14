"use client"

import { useState } from "react"
import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge" // Import Badge if needed for status/etc.

interface Learner {
  id: string
  name: string
  email: string
  phone?: string // Optional phone number
  client: string
  avatar: string
  initials: string
  enrollmentDate: string // Example: Add relevant learner details
  status: "Active" | "Inactive" // Example status
}

// Mock data - replace with actual data fetching logic
const learners: Learner[] = [
  {
    id: "l1",
    name: "Alice Green",
    email: "alice.green@university.edu",
    phone: "555-1234",
    client: "Stanford University",
    avatar: "/placeholder-user.jpg",
    initials: "AG",
    enrollmentDate: "2024-01-15",
    status: "Active",
  },
  {
    id: "l2",
    name: "Bob White",
    email: "bob.white@acmecorp.com",
    phone: "555-5678",
    client: "Acme Corporation",
    avatar: "/placeholder-user.jpg",
    initials: "BW",
    enrollmentDate: "2024-02-20",
    status: "Active",
  },
  {
    id: "l3",
    name: "Charlie Black",
    email: "charlie.black@deptofed.gov",
    client: "Department of Education",
    avatar: "/placeholder-user.jpg",
    initials: "CB",
    enrollmentDate: "2023-11-01",
    status: "Inactive",
  },
    {
    id: "l4",
    name: "Diana Prince",
    email: "diana.prince@university.edu",
    phone: "555-1122",
    client: "Stanford University",
    avatar: "/placeholder-user.jpg",
    initials: "DP",
    enrollmentDate: "2024-03-10",
    status: "Active",
  },
]

export function LearnersTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [clientFilter, setClientFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredLearners = learners.filter((learner) => {
    const matchesSearch =
      learner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (learner.phone && learner.phone.includes(searchTerm))

    const matchesClient = clientFilter === "all" || learner.client === clientFilter
    const matchesStatus = statusFilter === "all" || learner.status === statusFilter

    return matchesSearch && matchesClient && matchesStatus
  })
  
  // Get unique client names for filter dropdown
  const uniqueClients = Array.from(new Set(learners.map(l => l.client)))

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search learners (name, email, phone)..."
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
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row dark:border-border">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
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
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border dark:border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLearners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No learners found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLearners.map((learner) => (
                <TableRow key={learner.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={learner.avatar} alt={learner.name} />
                        <AvatarFallback>{learner.initials}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{learner.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{learner.email}</TableCell>
                  <TableCell>{learner.phone || "-"}</TableCell>
                  <TableCell>{learner.client}</TableCell>
                  <TableCell>
                    <Badge variant={learner.status === "Active" ? "success" : "secondary"}>
                       {learner.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{learner.enrollmentDate}</TableCell>
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
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>View progress</DropdownMenuItem>
                        {/* Add more learner-specific actions */}
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