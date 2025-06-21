"use client"

import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Learner } from "./learners-table"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
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
import { EditLearnerDialog } from "./edit-learner-dialog"
import { DataPagination } from "@/components/ui/data-pagination"
import { BulkUploadDialog } from "./bulk-upload-dialog"
import { ExportLearnersButton } from "./export-learners-button"
interface LearnersTableClientProps {
  initialLearners: Learner[]
  clientOptions: Array<{ id: string; name: string }>
}

interface Client {
  id: string
  name: string
}

interface PaginatedResponse {
  data: Learner[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

// Constants
const ITEMS_PER_PAGE = 20;

export function LearnersTableClient({ initialLearners, clientOptions }: LearnersTableClientProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [clientFilter, setClientFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [learners, setLearners] = useState<Learner[]>(initialLearners)
  const [loading, setLoading] = useState(false)
  
  // State for all clients - used for edit dialog
  const [allClients, setAllClients] = useState<Client[]>([])
  const [, setLoadingClients] = useState(true)
  
  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentLearner, setCurrentLearner] = useState<Learner | null>(null)
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [learnerToDelete, setLearnerToDelete] = useState<Learner | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  const { toast } = useToast()

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch learners with pagination and filters
  const fetchLearners = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: ITEMS_PER_PAGE.toString(),
      })
      
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm)
      }
      
      if (clientFilter !== 'all') {
        params.append('clientId', clientFilter)
      }
      
      if (statusFilter !== 'all') {
        params.append('isActive', statusFilter === 'Active' ? 'true' : 'false')
      }
      
      // Fetch data from API
      const response = await fetch(`/api/admin/learners?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error fetching learners: ${response.status}`)
      }
      
      const result: PaginatedResponse = await response.json()
      
      // Update state with paginated data
      setLearners(result.data)
      setTotalCount(result.metadata.totalCount)
      setTotalPages(result.metadata.totalPages)
    } catch (error) {
      console.error("Failed to fetch learners:", error)
      toast({
        title: "Error",
        description: "Failed to load learners. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch learners when page or filters change
  useEffect(() => {
    fetchLearners()
  }, [currentPage, debouncedSearchTerm, clientFilter, statusFilter])
  
  // Fetch all clients for the edit dialog
  useEffect(() => {
    const fetchAllClients = async () => {
      try {
        const response = await fetch("/api/admin/clients?pageSize=100") // Get more clients
        if (!response.ok) {
          throw new Error("Failed to fetch clients")
        }
        const result = await response.json()
        
        // Handle paginated response format
        const clientsData = Array.isArray(result) ? result : (result.data || [])
        setAllClients(clientsData)
      } catch (error) {
        console.error("Error fetching clients:", error)
        setAllClients([]) // Ensure it's always an array
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load all clients for the edit dialog."
        })
      } finally {
        setLoadingClients(false)
      }
    }

    fetchAllClients()
  }, [toast])

  // Effect to listen for learnerAdded event
  useEffect(() => {
    // Set up event listener for learnerAdded event
    const handleLearnerAdded = () => {
      fetchLearners() // Refresh the data when learners are added
      
      toast({
        title: "Learner added",
        description: "The learners list has been refreshed."
      })
    }
    
    document.addEventListener('learnerAdded', handleLearnerAdded)
    
    // Clean up event listener
    return () => {
      document.removeEventListener('learnerAdded', handleLearnerAdded)
    }
  }, [toast])

  // Handle filter changes
  const handleFiltersChange = () => {
    setCurrentPage(1) // Reset to first page when filters change
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }
  
  // Handle edit learner
  const handleEditLearner = (learner: Learner) => {
    setCurrentLearner(learner)
    setEditDialogOpen(true)
  }
  
  // Handle learner updated
  const handleLearnerUpdated = () => {
    fetchLearners() // Refresh the data
    toast({
      title: "Learner updated",
      description: "The learner has been updated successfully."
    })
  }
  
  // Handle delete learner
  const handleDeleteLearner = (learner: Learner) => {
    setLearnerToDelete(learner)
    setDeleteDialogOpen(true)
  }
  
  // Confirm delete learner
  const confirmDeleteLearner = async () => {
    if (!learnerToDelete) return
    
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/learners/${learnerToDelete.id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete learner")
      }
      
      toast({
        title: "Learner deleted",
        description: `${learnerToDelete.full_name} has been deleted successfully.`,
      })
      
      fetchLearners() // Refresh the data
    } catch (error) {
      toast({
        title: "Failed to delete learner",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setLearnerToDelete(null)
    }
  }

  // Handle bulk upload completion
  const handleBulkUploadComplete = () => {
    fetchLearners() // Refresh the data
  }

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
            <BulkUploadDialog onLearnersBulkUploaded={handleBulkUploadComplete} />
            <ExportLearnersButton />
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row dark:border-border">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select
                value={clientFilter}
                onValueChange={(value) => {
                  setClientFilter(value)
                  handleFiltersChange()
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  handleFiltersChange()
                }}
              >
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
              <TableHead>Temporary Password</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Background</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  Loading learners...
                </TableCell>
              </TableRow>
            ) : learners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No learners found.
                </TableCell>
              </TableRow>
            ) : (
              learners.map((learner) => {
                // Generate initials from the learner's full name
                const initials = learner.full_name
                  .split(" ")
                  .map(name => name[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2);
                
                return (
                  <TableRow key={learner.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{learner.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{learner.email}</TableCell>
                    <TableCell>
                      {learner.temporary_password ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{learner.temporary_password}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{learner.phone_number || "—"}</TableCell>
                    <TableCell>{learner.client?.name || "—"}</TableCell>
                    <TableCell>
                      {learner.job_readiness_background_type ? (
                        <span className="text-sm">
                          {learner.job_readiness_background_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditLearner(learner)}>
                            Edit learner
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteLearner(learner)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete learner
                          </DropdownMenuItem>
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
      
      {/* Pagination */}
      {!loading && totalPages > 0 && (
        <div className="p-4">
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </div>
      )}
      
      {/* Edit Learner Dialog */}
      {currentLearner && (
        <EditLearnerDialog
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false)
            setCurrentLearner(null)
          }}
          learner={currentLearner}
          clients={allClients}
          onLearnerUpdated={handleLearnerUpdated}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the learner{' '}
              <span className="font-semibold">{learnerToDelete?.full_name}</span> and their data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLearner}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 