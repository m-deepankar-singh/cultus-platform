"use client"

import React, { useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useLearnersInfinite, flattenLearnersPages, getTotalLearnersCount, type Learner, type LearnersFilters } from '@/hooks/queries/admin/useLearners';
import { useDeleteLearner } from '@/hooks/mutations/admin/useLearnerMutations';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Search, SlidersHorizontal, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import Link from "next/link";
import { BulkUploadDialog } from "./bulk-upload-dialog";
import { ExportLearnersButton } from "./export-learners-button";
import { EditLearnerDialog } from "./edit-learner-dialog";
import { useDebounce } from '@/hooks/use-debounce';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface VirtualizedLearnersTableProps {
  clientOptions: Array<{ id: string; name: string }>;
}

const ROW_HEIGHT = 65; // Height of each row in pixels
const TABLE_HEIGHT = 600; // Height of the virtual table

interface ColumnVisibility {
  name: boolean;
  email: boolean;
  tempPassword: boolean;
  phone: boolean;
  client: boolean;
  background: boolean;
  status: boolean;
  enrolled: boolean;
}

interface RowData {
  learners: Learner[];
  onEditLearner: (learner: Learner) => void;
  onDeleteLearner: (learner: Learner) => void;
  columnVisibility: ColumnVisibility;
}

// Memoized row component for performance
const LearnerRow = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: RowData 
}) => {
  const { learners, onEditLearner, onDeleteLearner, columnVisibility } = data;
  const learner = learners[index];
  
  if (!learner) {
    return (
      <div style={style} className="flex items-center px-6 border-b border-border bg-card dark:bg-card/80">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  const visibleColumns = Object.entries(columnVisibility).filter(([_, visible]) => visible);
  const gridCols = `grid-cols-${visibleColumns.length}`;
  
  return (
    <div style={style} className="border-b border-border bg-card dark:bg-card/80 hover:bg-muted/25 transition-colors group">
      <div className={`grid ${gridCols} gap-6 px-6 py-4 items-center h-full`}>
        {columnVisibility.name && (
          <div className="font-medium text-foreground truncate">{learner.full_name}</div>
        )}
        {columnVisibility.email && (
          <div className="text-sm text-foreground truncate">{learner.email || '—'}</div>
        )}
        {columnVisibility.tempPassword && (
          <div className="font-mono text-xs text-muted-foreground truncate">{learner.temporary_password || '—'}</div>
        )}
        {columnVisibility.phone && (
          <div className="text-sm text-foreground truncate">{learner.phone_number || '—'}</div>
        )}
        {columnVisibility.client && (
          <div className="text-sm text-foreground truncate">{learner.client?.name || '—'}</div>
        )}
        {columnVisibility.background && (
          <div>
            {learner.job_readiness_background_type ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-medium">
                {learner.job_readiness_background_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
        )}
        {columnVisibility.status && (
          <div>
            <Badge variant={learner.is_active ? "default" : "secondary"} className={learner.is_active ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" : ""}>
              {learner.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        )}
        {columnVisibility.enrolled && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {learner.created_at ? format(new Date(learner.created_at), "MMM d, yyyy") : "—"}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  <DropdownMenuItem onClick={() => onEditLearner(learner)}>
                    Edit learner
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteLearner(learner)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete learner
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LearnerRow.displayName = 'LearnerRow';

export function VirtualizedLearnersTable({ clientOptions }: VirtualizedLearnersTableProps) {
  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibility>({
    name: true,
    email: true,
    tempPassword: true,
    phone: true,
    client: true,
    background: true,
    status: true,
    enrolled: true,
  });
  
  // Edit/Delete states
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [currentLearner, setCurrentLearner] = React.useState<Learner | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [learnerToDelete, setLearnerToDelete] = React.useState<Learner | null>(null);
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteLearnerMutation = useDeleteLearner();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Build filters object
  const filters: LearnersFilters = React.useMemo(() => {
    const f: LearnersFilters = {
      pageSize: 50, // Optimized for virtualization
    };
    
    if (debouncedSearchTerm) {
      f.search = debouncedSearchTerm;
    }
    
    if (clientFilter !== 'all') {
      f.clientId = clientFilter;
    }
    
    if (statusFilter !== 'all') {
      f.isActive = statusFilter === 'Active';
    }
    
    return f;
  }, [debouncedSearchTerm, clientFilter, statusFilter]);
  
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
  } = useLearnersInfinite(filters);
  
  // Flatten all pages into single array
  const learners = React.useMemo(() => flattenLearnersPages(data), [data]);
  const totalCount = React.useMemo(() => getTotalLearnersCount(data), [data]);
  
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
  const itemCount = hasNextPage ? learners.length + 1 : learners.length;
  
  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasNextPage || index < learners.length;
  }, [hasNextPage, learners.length]);
  
  // Load more items
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
    return Promise.resolve();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  
  // Event handlers
  const handleEditLearner = useCallback((learner: Learner) => {
    setCurrentLearner(learner);
    setEditDialogOpen(true);
  }, []);
  
  const handleDeleteLearner = useCallback((learner: Learner) => {
    setLearnerToDelete(learner);
    setDeleteDialogOpen(true);
  }, []);
  
  const handleLearnerUpdated = useCallback(() => {
    // Invalidate and refetch data
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLearners(filters) });
    toast({
      title: "Learner updated",
      description: "The learner has been updated successfully."
    });
  }, [queryClient, filters, toast]);
  
  const confirmDeleteLearner = useCallback(async () => {
    if (!learnerToDelete) return;
    
    try {
      await deleteLearnerMutation.mutateAsync(learnerToDelete.id);
      setDeleteDialogOpen(false);
      setLearnerToDelete(null);
    } catch (error) {
      // Error handling is done by the mutation hook
    }
  }, [learnerToDelete, deleteLearnerMutation]);
  
  const handleBulkUploadComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLearners(filters) });
  }, [queryClient, filters]);
  
  // Row data for virtualized list
  const rowData: RowData = React.useMemo(() => ({
    learners,
    onEditLearner: handleEditLearner,
    onDeleteLearner: handleDeleteLearner,
    columnVisibility,
  }), [learners, handleEditLearner, handleDeleteLearner, columnVisibility]);
  
  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive mb-4">Error loading learners: {error?.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </Card>
    );
  }
  
  return (
    <Card className="border-0 shadow-none bg-transparent">
      {/* Search and Filter Controls */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search learners..."
              className="pl-10 h-10 bg-background border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-10">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10">
                  <Eye className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-4">
                <div className="font-medium text-sm">Toggle columns</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="name"
                      checked={columnVisibility.name}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, name: checked as boolean }))
                      }
                    />
                    <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Name
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email"
                      checked={columnVisibility.email}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, email: checked as boolean }))
                      }
                    />
                    <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Contact Email
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tempPassword"
                      checked={columnVisibility.tempPassword}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, tempPassword: checked as boolean }))
                      }
                    />
                    <label htmlFor="tempPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Temp Password
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="phone"
                      checked={columnVisibility.phone}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, phone: checked as boolean }))
                      }
                    />
                    <label htmlFor="phone" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Phone
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="client"
                      checked={columnVisibility.client}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, client: checked as boolean }))
                      }
                    />
                    <label htmlFor="client" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Client
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="background"
                      checked={columnVisibility.background}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, background: checked as boolean }))
                      }
                    />
                    <label htmlFor="background" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Background
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status"
                      checked={columnVisibility.status}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, status: checked as boolean }))
                      }
                    />
                    <label htmlFor="status" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Status
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enrolled"
                      checked={columnVisibility.enrolled}
                      onCheckedChange={(checked) => 
                        setColumnVisibility(prev => ({ ...prev, enrolled: checked as boolean }))
                      }
                    />
                    <label htmlFor="enrolled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Enrolled
                    </label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col gap-4 rounded-md border p-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select
                value={clientFilter}
                onValueChange={setClientFilter}
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
                onValueChange={setStatusFilter}
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

      {/* Table Container */}
      <div className="rounded-lg border border-border bg-card dark:bg-card/80">
        {/* Table Header */}
        <div className={`grid grid-cols-${Object.values(columnVisibility).filter(Boolean).length} gap-6 px-6 py-4 font-medium bg-transparent border-b border-border text-sm text-muted-foreground`}>
          {columnVisibility.name && <div>Name</div>}
          {columnVisibility.email && <div>Contact Email</div>}
          {columnVisibility.tempPassword && <div>Temp Password</div>}
          {columnVisibility.phone && <div>Phone</div>}
          {columnVisibility.client && <div>Client</div>}
          {columnVisibility.background && <div>Background</div>}
          {columnVisibility.status && <div>Status</div>}
          {columnVisibility.enrolled && <div>Enrolled</div>}
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
      ) : learners.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No learners found.
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
              {LearnerRow}
            </List>
          )}
        </InfiniteLoader>
      )}
      
        {/* Status bar */}
        <div className="p-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <div>
              Showing {learners.length} of {totalCount} learners
            </div>
            {isFetchingNextPage && (
              <div className="text-xs">Loading more...</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Learner Dialog */}
      {currentLearner && (
        <EditLearnerDialog
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setCurrentLearner(null);
          }}
          learner={currentLearner}
          clients={clientOptions}
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
            <AlertDialogCancel disabled={deleteLearnerMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLearner}
              disabled={deleteLearnerMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLearnerMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 