"use client"

import React, { useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useModulesInfinite, flattenModulesPages, getTotalModulesCount, type Module, type ModulesFilters } from '@/hooks/queries/admin/useModules';
import { useDeleteModule } from '@/hooks/mutations/admin/useModuleMutations';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  FileText, 
  MoreHorizontal, 
  Search, 
  SlidersHorizontal,
  ExternalLink,
  Eye,
  Pencil,
  Trash,
  Package
} from "lucide-react";
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
import { ModuleForm } from "./module-form";
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
import { ModuleCreateButton } from './module-create-button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VirtualizedModulesTableProps {
  isAdmin: boolean;
  initialType?: "Course" | "Assessment" | "all";
}

const ROW_HEIGHT = 65; // Height of each row in pixels
const TABLE_HEIGHT = 600; // Height of the virtual table

interface RowData {
  modules: Module[];
  isAdmin: boolean;
  onEditModule: (module: Module) => void;
  onDeleteModule: (module: Module) => void;
}

// Memoized row component for performance
const ModuleRow = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: RowData 
}) => {
  const { modules, isAdmin, onEditModule, onDeleteModule } = data;
  const module = modules[index];
  
  if (!module) {
    return (
      <div style={style} className="flex items-center px-6 border-b border-border bg-card dark:bg-card/80">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  return (
    <div style={style} className="border-b border-border bg-card dark:bg-card/80 hover:bg-muted/25 transition-colors group">
      <div className="grid grid-cols-5 gap-6 px-6 py-4 items-center h-full">
        <div>
          <Badge variant={module.type === "Course" ? "default" : "secondary"}>
            {module.type === "Course" ? <BookOpen className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
            {module.type}
          </Badge>
        </div>
        <div className="font-medium text-foreground truncate">{module.name}</div>
        <div>
          {module.products && module.products.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {module.products.length <= 2 ? (
                // Show all products if there are 2 or fewer
                module.products.map((product) => (
                  <Link 
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="inline-flex"
                  >
                    <Badge variant="outline" className="flex items-center gap-1 hover:bg-accent">
                      <Package className="h-3 w-3" />
                      {product.name}
                      <ExternalLink className="h-3 w-3" />
                    </Badge>
                  </Link>
                ))
              ) : (
                // Show count with tooltip if more than 2
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {module.products.length} Products
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-xs font-medium">Assigned to:</div>
                      <ul className="text-xs mt-1 list-disc pl-3 space-y-1">
                        {module.products.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/products/${product.id}`}
                              className="hover:underline flex items-center gap-1"
                            >
                              {product.name}
                              <ExternalLink className="h-2 w-2" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm italic">Unassigned</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {module.created_at ? format(new Date(module.created_at), "MMM d, yyyy") : "—"}
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
              <DropdownMenuItem asChild>
                <Link href={`/modules/${module.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => onEditModule(module)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDeleteModule(module)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});

ModuleRow.displayName = 'ModuleRow';

export function VirtualizedModulesTable({ isAdmin, initialType = "all" }: VirtualizedModulesTableProps) {
  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [moduleType, setModuleType] = React.useState<"Course" | "Assessment" | "all">(initialType);
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Edit/Delete states
  const [editModule, setEditModule] = React.useState<Module | null>(null);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [moduleToDelete, setModuleToDelete] = React.useState<Module | null>(null);
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteModuleMutation = useDeleteModule();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Build filters object
  const filters: ModulesFilters = React.useMemo(() => {
    const f: ModulesFilters = {
      pageSize: 50, // Optimized for virtualization
    };
    
    if (debouncedSearchTerm) {
      f.search = debouncedSearchTerm;
    }
    
    if (moduleType !== 'all') {
      f.type = moduleType;
    }
    
    return f;
  }, [debouncedSearchTerm, moduleType]);
  
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
  } = useModulesInfinite(filters);
  
  // Flatten all pages into single array
  const modules = React.useMemo(() => flattenModulesPages(data), [data]);
  const totalCount = React.useMemo(() => getTotalModulesCount(data), [data]);
  
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
  const itemCount = hasNextPage ? modules.length + 1 : modules.length;
  
  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasNextPage || index < modules.length;
  }, [hasNextPage, modules.length]);
  
  // Load more items
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
    return Promise.resolve();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  
  // Event handlers
  const handleEditModule = useCallback((module: Module) => {
    setEditModule(module);
    setShowEditForm(true);
  }, []);
  
  const handleDeleteModule = useCallback((module: Module) => {
    setModuleToDelete(module);
    setDeleteDialogOpen(true);
  }, []);
  
  const handleModuleUpdated = useCallback(() => {
    // Invalidate and refetch data
    queryClient.invalidateQueries({ 
      predicate: (query) => 
        query.queryKey[0] === 'admin' && query.queryKey[1] === 'modules' 
    });
    setShowEditForm(false);
    setEditModule(null);
  }, [queryClient]);
  
  const confirmDeleteModule = useCallback(async () => {
    if (!moduleToDelete) return;
    
    try {
      await deleteModuleMutation.mutateAsync(moduleToDelete.id);
      setDeleteDialogOpen(false);
      setModuleToDelete(null);
    } catch (error) {
      // Error handling is done by the mutation hook
    }
  }, [moduleToDelete, deleteModuleMutation]);
  
  // Row data for virtualized list
  const rowData: RowData = React.useMemo(() => ({
    modules,
    isAdmin,
    onEditModule: handleEditModule,
    onDeleteModule: handleDeleteModule,
  }), [modules, isAdmin, handleEditModule, handleDeleteModule]);
  
  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive mb-4">Error loading modules: {error?.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </Card>
    );
  }
  
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "Create and manage all modules from this centralized location" 
                : "View all modules from this centralized location"}
            </p>
          </div>
          {isAdmin && <ModuleCreateButton />}
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search modules..."
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
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-1 rounded-md border p-4">
              <div>
                <Select value={moduleType} onValueChange={(value) => setModuleType(value as "Course" | "Assessment" | "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Course">Courses</SelectItem>
                    <SelectItem value="Assessment">Assessments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="rounded-md border">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-6 px-6 py-4 font-medium bg-muted/50 border-b text-sm">
            <div>Type</div>
            <div>Name</div>
            <div>Assigned To</div>
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
          ) : modules.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No modules found.
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
                  {ModuleRow}
                </List>
              )}
            </InfiniteLoader>
          )}
          
          {/* Status bar */}
          <div className="p-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <div>
                Showing {modules.length} of {totalCount} modules
              </div>
              {isFetchingNextPage && (
                <div className="text-xs">Loading more...</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Module Dialog/Form */}
      {showEditForm && editModule && (
        <ModuleForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          productId={editModule.products?.[0]?.id || editModule.product_id || "3f9a1ea0-5942-4ef1-bdb6-183d5add4b52"}
          type={editModule.type}
          module={{
            ...editModule,
            product_id: editModule.products?.[0]?.id || editModule.product_id || "3f9a1ea0-5942-4ef1-bdb6-183d5add4b52"
          }}
          onSaved={handleModuleUpdated}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module{' '}
              <span className="font-semibold">{moduleToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteModuleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteModule}
              disabled={deleteModuleMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteModuleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 