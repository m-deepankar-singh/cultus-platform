"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserActionsCell } from "./user-actions-cell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { DataPagination } from "@/components/ui/data-pagination"



interface Client {
  id: string
  name: string
}

// Don't extend User directly to avoid type conflicts
interface UserProfile {
  id: string
  email?: string
  last_sign_in_at?: string
  created_at?: string
  updated_at?: string
  role?: string
  full_name?: string
  client_id?: string
  client?: {
    id: string
    name: string
  }
  banned_until?: string
  status?: string
  user_metadata?: {
    status?: string
    [key: string]: any
  }
  app_metadata?: {
    status?: string
    [key: string]: any
  }
}

interface UsersTableProps {
  clients: Client[]
  initialCurrentUserRole?: string
}

// Constants
const ITEMS_PER_PAGE = 10

// Add a utility function to check user status
function isUserActive(user: UserProfile): boolean {
  // Check if user is banned
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return false;
  }
  
  // Check explicit status field from profile
  if (user.status === 'inactive') {
    return false;
  }
  
  // Check metadata status
  if (user.user_metadata?.status === 'inactive' || user.app_metadata?.status === 'inactive') {
    return false;
  }
  
  return true;
}

export function UsersTable({ clients, initialCurrentUserRole }: UsersTableProps) {
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [clientFilter, setClientFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  
  // Current user role (for permissions)
  const [currentUserRole] = useState<string | undefined>(initialCurrentUserRole)
  const isStaffUser = currentUserRole === 'Staff'

  // Fetch users from the paginated API
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: ITEMS_PER_PAGE.toString(),
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter) params.append('role', roleFilter)
      if (clientFilter) params.append('clientId', clientFilter)
  
      // Fetch data from our paginated API
      const response = await fetch(`/api/admin/users?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Update state with the paginated data
      setUsers(result.data)
      setTotalCount(result.metadata.totalCount)
      setTotalPages(result.metadata.totalPages)
      
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
  }
  }
  
  // Initial fetch and when pagination/filter changes
  useEffect(() => {
    fetchUsers()
  }, [currentPage]) // We'll handle filter changes via the search button
  
  // Handle search & filter
  const handleSearch = () => {
    setCurrentPage(1) // Reset to first page when filtering/searching
    fetchUsers()
  }
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  
  // Handle user actions that might change data
  const handleUserUpdated = () => {
    fetchUsers() // Refresh the data
  }

  return (
    <Card>
      {isStaffUser && (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            You are in view-only mode. Staff members can view users but cannot edit or deactivate them.
          </AlertDescription>
        </Alert>
      )}
      
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage your system users and their access permissions.</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filters */}
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                    <SelectItem value="Client Staff">Client Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        {/* Error message if any */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
              <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
                users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {user.full_name?.charAt(0) ||
                            user.email?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                        <div className="font-medium">
                          {user.full_name || "(No Name)"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.email}
                  </TableCell>
                  <TableCell>
                      {user.role ? (
                      <Badge
                        variant={
                            user.role === "Admin"
                            ? "outline"
                              : user.role === "Staff"
                              ? "info"
                                : user.role === "Viewer"
                                ? "outline"
                                : "warning"
                        }
                        className={
                            user.role === "Admin"
                            ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/50 dark:bg-purple-950/50 dark:text-purple-300"
                              : user.role === "Staff"
                              ? ""
                                : user.role === "Viewer"
                                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/50 dark:bg-green-950/50 dark:text-green-300"
                                : ""
                        }
                      >
                          {user.role}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isUserActive(user) ? "success" : "destructive"}>
                      {isUserActive(user) ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                    <TableCell>{user.client?.name || "-"}</TableCell>
                  <TableCell>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                      <UserActionsCell 
                        user={user} 
                        clients={clients} 
                        onUserUpdated={handleUserUpdated}
                      />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
        
        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        )}
      </CardContent>
    </Card>
  )
}
