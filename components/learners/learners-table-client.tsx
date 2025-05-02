"use client"

import { useState } from "react"
import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Learner } from "./learners-table"
import { format } from "date-fns"
import Link from "next/link"

interface LearnersTableClientProps {
  initialLearners: Learner[]
  uniqueClients: string[]
}

export function LearnersTableClient({ initialLearners, uniqueClients }: LearnersTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [clientFilter, setClientFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const filteredLearners = initialLearners.filter((learner) => {
    const matchesSearch =
      learner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (learner.email && learner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (learner.phone_number && learner.phone_number.includes(searchTerm))

    const matchesClient = clientFilter === "all" || learner.client.name === clientFilter
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "Active" && learner.is_active) ||
      (statusFilter === "Inactive" && !learner.is_active)

    return matchesSearch && matchesClient && matchesStatus
  })

  return (
    <>
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
              filteredLearners.map((learner) => {
                // Generate initials from the learner's full name
                const initials = learner.full_name
                  .split(" ")
                  .map(name => name[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2);
                
                return (
                  <TableRow key={learner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{learner.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{learner.email || "-"}</TableCell>
                    <TableCell>{learner.phone_number || "-"}</TableCell>
                    <TableCell>{learner.client.name}</TableCell>
                    <TableCell>
                      <Badge variant={learner.is_active ? "success" : "secondary"}>
                        {learner.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {learner.created_at ? format(new Date(learner.created_at), "PPP") : "-"}
                    </TableCell>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/learners/${learner.id}`}>View details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>View progress</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
} 