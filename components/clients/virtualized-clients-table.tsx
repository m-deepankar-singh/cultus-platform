"use client"

import React, { useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useClientsInfinite, flattenClientsPages, getTotalClientsCount, type Client, type ClientsFilters } from '@/hooks/queries/admin/useClients';
import { useToggleClientStatus } from '@/hooks/mutations/admin/useClientMutations';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MoreHorizontal, Search, SlidersHorizontal, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { AddClientDialog } from "./add-client-dialog";
import { ClientForm } from "./client-form";
import { useDebounce } from '@/hooks/use-debounce';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';

const ROW_HEIGHT = 65; // Height of each row in pixels
const TABLE_HEIGHT = 600; // Height of the virtual table

interface RowData {
  clients: Client[];
  onEditClient: (client: Client) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

// Memoized row component for performance
const ClientRow = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: RowData 
}) => {
  const { clients, onEditClient, onToggleStatus } = data;
  const client = clients[index];
  
  if (!client) {
    return (
      <div style={style} className="flex items-center px-6 border-b border-border bg-card dark:bg-card/80">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  return (
    <div style={style} className="border-b border-border bg-card dark:bg-card/80 hover:bg-muted/25 transition-colors group">
      <div className="grid grid-cols-6 gap-6 px-6 py-4 items-center h-full">
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
          <div className="font-medium text-foreground truncate">{client.name}</div>
        </div>
        <div className="text-sm text-foreground truncate">{client.contact_email || "—"}</div>
        <div>
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
        </div>
        <div>
          <Badge variant={client.is_active ? "info" : "secondary"}>
            {client.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {client.created_at ? format(new Date(client.created_at), "MMM d, yyyy") : "—"}
        </div>
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEditClient(client)}>
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/clients/${client.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onToggleStatus(client.id, !client.is_active)}
                className={client.is_active ? "text-destructive" : "text-green-600"}
              >
                {client.is_active ? "Deactivate Client" : "Activate Client"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});

ClientRow.displayName = 'ClientRow';

export function VirtualizedClientsTable() {
  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [editClient, setEditClient] = React.useState<Client | null>(null);
  const [showEditForm, setShowEditForm] = React.useState(false);
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Build filters object
  const filters: ClientsFilters = React.useMemo(() => {
    const f: ClientsFilters = {
      pageSize: 50, // Optimized for virtualization
    };
    
    if (debouncedSearchTerm) {
      f.search = debouncedSearchTerm;
    }
    
    if (statusFilter && statusFilter !== 'all') {
      f.status = statusFilter as 'active' | 'inactive';
    }
    
    return f;
  }, [debouncedSearchTerm, statusFilter]);
  
  // Infinite query hook
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useClientsInfinite(filters);
  
  // Flatten all pages into single array - optimized to prevent unnecessary recalculations
  const clients = React.useMemo(() => flattenClientsPages(data), [data?.pages]);
  const totalCount = React.useMemo(() => getTotalClientsCount(data), [data?.pages]);
  
  // Refs for infinite loader
  const infiniteLoaderRef = useRef<InfiniteLoader>(null);
  const hasMountedRef = useRef(false);
  
  // Reset infinite loader on filter change
  useEffect(() => {
    if (hasMountedRef.current && infiniteLoaderRef.current) {
      infiniteLoaderRef.current.resetloadMoreItemsCache();
    }
    hasMountedRef.current = true;
  }, [filters]);
  
  // Calculate item count for infinite loader
  const itemCount = hasNextPage ? clients.length + 1 : clients.length;
  
  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasNextPage || index < clients.length;
  }, [hasNextPage, clients.length]);
  
  // Load more items
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
    return Promise.resolve();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Toggle client status mutation
  const toggleClientStatusMutation = useToggleClientStatus();
  
  // Handle edit client - stable reference
  const handleEditClient = useCallback((client: Client) => {
    setEditClient(client);
    setShowEditForm(true);
  }, []);
  
  // Handle toggle status - stable reference
  const handleToggleStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleClientStatusMutation.mutateAsync({
        id,
        isActive,
      });
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  }, [toggleClientStatusMutation]);
  
  // Handle client updated
  const handleClientUpdated = useCallback(() => {
    queryClient.invalidateQueries({ 
      predicate: (query) => 
        query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
    });
    setShowEditForm(false);
    setEditClient(null);
  }, [queryClient]);
  
  // Row data for virtualized list
  const rowData: RowData = React.useMemo(() => ({
    clients,
    onEditClient: handleEditClient,
    onToggleStatus: handleToggleStatus,
  }), [clients, handleEditClient, handleToggleStatus]);
  
  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive mb-4">Error loading clients: {error?.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </Card>
    );
  }
  
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your clients and their assigned products.</p>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <AddClientDialog onClientAdded={() => {
              queryClient.invalidateQueries({ 
                predicate: (query) => 
                  query.queryKey[0] === 'admin' && query.queryKey[1] === 'clients' 
              });
            }} />
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-1 rounded-md border p-4">
              <div>
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

        {/* Table Container */}
        <div className="rounded-md border">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-6 px-6 py-4 font-medium bg-muted/50 border-b text-sm">
            <div>Name</div>
            <div>Contact Email</div>
            <div>Assigned Products</div>
            <div>Status</div>
            <div>Created</div>
            <div className="text-right">Actions</div>
          </div>
        
          {/* Virtualized Table Body */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-[65px] w-full" />
                ))}
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No clients found.
            </div>
          ) : (
            <InfiniteLoader
              ref={infiniteLoaderRef}
              isItemLoaded={isItemLoaded}
              itemCount={itemCount}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <List
                  ref={ref}
                  height={TABLE_HEIGHT}
                  width="100%"
                  itemCount={itemCount}
                  itemSize={ROW_HEIGHT}
                  onItemsRendered={onItemsRendered}
                  itemData={rowData}
                  className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                >
                  {ClientRow}
                </List>
              )}
            </InfiniteLoader>
          )}
          
          {/* Status bar */}
          <div className="p-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <div>
                Showing {clients.length} of {totalCount} clients
              </div>
              {isFetchingNextPage && (
                <div className="text-xs">Loading more...</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
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
  );
} 