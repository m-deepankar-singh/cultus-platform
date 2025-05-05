"use client"

import { useState, useEffect } from "react"
import { Building2, MoreHorizontal, Search, SlidersHorizontal, Package } from "lucide-react"
import Link from "next/link"
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
import { Client, getClients, toggleClientStatus } from "@/app/actions/clientActions"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Interface for products
interface Product {
  id: string
  name: string
  description: string | null
}

// Extended client interface to include products
interface ClientWithProducts extends Client {
  products?: Product[]
}

export function ClientsTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [clients, setClients] = useState<ClientWithProducts[]>([])
  const [loading, setLoading] = useState(true)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const { toast } = useToast()

  // Function to fetch clients
  const fetchClients = async () => {
    try {
      setLoading(true)
      const clientsData = await getClients()
      
      // Create enhanced client objects with product data
      const enhancedClients = await Promise.all(
        clientsData.map(async (client) => {
          try {
            const response = await fetch(`/api/staff/clients/${client.id}/products`)
            if (response.ok) {
              const products = await response.json()
              return { ...client, products }
            }
          } catch (error) {
            console.error(`Failed to fetch products for client ${client.id}:`, error)
          }
          return { ...client, products: [] }
        })
      )
      
      setClients(enhancedClients)
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load clients on component mount
  useEffect(() => {
    fetchClients()
  }, [])

  // Handle toggling a client's active status
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleClientStatus(id, !currentStatus)
      toast({
        title: "Success",
        description: `Client ${currentStatus ? "deactivated" : "activated"} successfully.`,
      })
      fetchClients() // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${currentStatus ? "deactivate" : "activate"} client.`,
        variant: "destructive",
      })
      console.error(error)
    }
  }

  // Format date string to a readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch (error) {
      return dateString
    }
  }

  // Handle edit client action
  const handleEditClient = (client: Client) => {
    setEditClient(client)
    setShowEditForm(true)
  }

  // Filter clients based on search and filter criteria
  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && client.is_active) || 
      (statusFilter === "inactive" && !client.is_active)

    return matchesSearch && matchesStatus
  })

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
            <AddClientDialog onClientAdded={fetchClients} />
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="font-medium">{client.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{client.contact_email || "—"}</TableCell>
                  <TableCell>
                    {client.products && client.products.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        <TooltipProvider>
                          {client.products.slice(0, 3).map((product) => (
                            <Tooltip key={product.id}>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {product.name.length > 18 ? `${product.name.substring(0, 15)}...` : product.name}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{product.name}</p>
                                {product.description && <p className="text-xs text-muted-foreground">{product.description}</p>}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {client.products.length > 3 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline">
                                  +{client.products.length - 3} more
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs space-y-1">
                                  {client.products.slice(3).map((product) => (
                                    <p key={product.id} className="text-sm">{product.name}</p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClient(client)}>
                          Edit client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            Manage assigned products
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(client.id, client.is_active)}
                          className={client.is_active ? "text-red-600" : "text-green-600"}
                        >
                          {client.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit client form dialog */}
      {editClient && (
        <ClientForm
          open={showEditForm}
          setOpen={setShowEditForm}
          client={editClient}
          onSuccess={() => {
            fetchClients()
            setEditClient(null)
          }}
        />
      )}
    </Card>
  )
}
