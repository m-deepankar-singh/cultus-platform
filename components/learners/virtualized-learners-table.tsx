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
import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
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

interface RowData {
  learners: Learner[];
  onEditLearner: (learner: Learner) => void;
  onDeleteLearner: (learner: Learner) => void;
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
  const { learners, onEditLearner, onDeleteLearner } = data;
  const learner = learners[index];
  
  if (!learner) {
    return (
      <div style={style} className="flex items-center px-4 border-b">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
      return (
      <div style={style} className="border-b hover:bg-muted/25 transition-colors group">
        <div className="grid grid-cols-7 gap-6 px-6 py-4 items-center h-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
              {learner.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{learner.full_name}</div>
              {learner.temporary_password && (
                <div className="text-xs text-muted-foreground font-mono">
                  Temp: {learner.temporary_password}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-sm text-foreground truncate">{learner.email || '—'}</div>
          
          <div className="text-sm text-foreground truncate">{learner.phone_number || '—'}</div>
          
          <div className="text-sm text-foreground truncate">{learner.client?.name || '—'}</div>
          
          <div>
            {learner.job_readiness_background_type ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                {learner.job_readiness_background_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
          
          <div>
            <Badge variant={learner.is_active ? "default" : "secondary"} className={learner.is_active ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
              {learner.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          
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
  }), [learners, handleEditLearner, handleDeleteLearner]);
  
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
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search learners..."
              className="pl-10 h-10 bg-background border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-10">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="h-10">
            Search
          </Button>
          <BulkUploadDialog onLearnersBulkUploaded={handleBulkUploadComplete} />
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
      <div className="rounded-lg border bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-7 gap-6 px-6 py-4 font-medium bg-transparent border-b text-sm text-muted-foreground">
          <div>Name</div>
          <div>Contact Email</div>
          <div>Phone</div>
          <div>Client</div>
          <div>Background</div>
          <div>Status</div>
          <div>Enrolled</div>
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