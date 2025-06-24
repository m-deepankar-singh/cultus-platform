"use client"

import { useState } from "react"
import { Building2, MoreHorizontal, Search, SlidersHorizontal, Package } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
import { AddClientDialog } from "@/components/clients/add-client-dialog"
import { ClientForm } from "@/components/clients/client-form"
import { useClients, useToggleClientStatus, useClient, type Client } from "@/hooks/api/use-clients"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DataPagination } from "@/components/ui/data-pagination"

// Interface for products
interface Product {
  id: string
  name: string
  description: string | null
}

// Extended client interface with products
interface ClientWithProducts extends Client {
  products?: Product[]
}

// Constants
const ITEMS_PER_PAGE = 10

export function ClientsTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("all")
  const [showFilters, setShowFilters] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  
  const { toast } = useToast()

  // API hooks
  const {
    data: clientsResponse,
    isLoading: loading,
    error,
    refetch
  } = useClients({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  })

  const toggleClientStatus = useToggleClientStatus()

  // Extract data from response
  const clients = clientsResponse?.data || []
  const totalCount = clientsResponse?.pagination?.totalCount || 0
  const totalPages = clientsResponse?.pagination?.totalPages || 0

  // Handle search and filter changes
  const handleFiltersChange = () => {
    setCurrentPage(1) // Reset to first page when filters change
    refetch()
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle toggling a client's active status
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleClientStatus.mutateAsync({
        id,
        isActive: !currentStatus,
      })
      // Success handled by the hook's onSuccess callback
    } catch (error) {
      // Error handled by the hook's onError callback
      console.error('Toggle status error:', error)
    }
  }

  // Format date string to a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch {
      return dateString
    }
  }

  // Handle edit client action
  const handleEditClient = (client: Client) => {
    setEditClient(client)
    setShowEditForm(true)
  }

  // Handle successful client operations
  const handleClientUpdated = () => {
    refetch()
  }

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as "active" | "inactive" | "all")
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">Failed to load clients. Please try again.</p>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFiltersChange()
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button onClick={handleFiltersChange} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
            <AddClientDialog onClientAdded={handleFiltersChange} />
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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
              <TableHead>Contact Email</TableHead>
              <TableHead>Assigned Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading clients...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No clients found.
                </TableCell>
              </TableRow>
            ) :
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted overflow-hidden">
                        {client.logo_url ? (
                          <Image
                            src={client.logo_url}
                            alt={`${client.name} logo`}
                            width={40}
                            height={40}
                            className="object-contain w-full h-full"
                            onError={(e) => {
                              // Fallback to building icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <Building2 className={`h-5 w-5 text-muted-foreground ${client.logo_url ? 'hidden' : ''}`} />
                      </div>
                      <div className="font-medium">{client.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{client.contact_email || "—"}</TableCell>
                  <TableCell>
                    {client.products && client.products.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.products.length <= 3 ? (
                          // Show all products if there are 3 or fewer
                          client.products.map((product) => (
                            <Badge key={product.id} variant="outline" className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {product.name}
                            </Badge>
                          ))
                        ) : (
                          // Show count with tooltip if more than 3
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {client.products.length} Products
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="text-xs font-medium">Products:</div>
                                <ul className="text-xs mt-1 list-disc pl-3 space-y-1">
                                  {client.products.map((product) => (
                                    <li key={product.id}>{product.name}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No products assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={client.is_active ? "info" : "secondary"}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(client.created_at)}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEditClient(client)}>
                          Edit Client
                        </DropdownMenuItem>
                        <Link href={`/clients/${client.id}`} passHref>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            View Details
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(client.id, client.is_active)}
                          className={client.is_active ? "text-destructive" : "text-green-600"}
                        >
                          {client.is_active ? "Deactivate Client" : "Activate Client"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination UI */}
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
      
      {/* Edit Client Dialog/Form */}
      {showEditForm && editClient && (
        <ClientForm
          open={showEditForm}
          setOpen={setShowEditForm}
          client={editClient}
          onSuccess={handleClientUpdated}
        />
      )}
    </Card>
  )
}
