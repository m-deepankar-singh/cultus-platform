"use client"

import React, { useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useUsersInfinite, flattenUsersPages, getTotalUsersCount, type UserProfile, type UsersFilters } from '@/hooks/queries/admin/useUsers';
import { useDeleteUser } from '@/hooks/mutations/admin/useUserMutations';
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserActionsCell } from "./user-actions-cell";
import { EditUserDialog } from "./edit-user-dialog";
import { AddUserDialog } from "./add-user-dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface VirtualizedUsersTableProps {
  clientOptions: Array<{ id: string; name: string }>;
}

const ROW_HEIGHT = 65; // Height of each row in pixels
const TABLE_HEIGHT = 600; // Height of the virtual table

interface RowData {
  users: UserProfile[];
  clientOptions: Array<{ id: string; name: string }>;
  onUserUpdated: () => void;
}

// Utility function to check user status
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

// Memoized row component for performance
const UserRow = React.memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: RowData 
}) => {
  const { users, clientOptions, onUserUpdated } = data;
  const user = users[index];
  
  if (!user) {
    return (
      <div style={style} className="flex items-center px-6 border-b border-border bg-card dark:bg-card/80">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  
  return (
    <div style={style} className="border-b border-border bg-card dark:bg-card/80 hover:bg-muted/25 transition-colors group">
      <div className="grid grid-cols-7 gap-6 px-6 py-4 items-center h-full">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium text-foreground truncate">
            {user.full_name || "(No Name)"}
          </div>
        </div>
        <div className="text-sm text-foreground truncate">{user.email}</div>
        <div>
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
        </div>
        <div>
          <Badge variant={isUserActive(user) ? "success" : "destructive"}>
            {isUserActive(user) ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="text-sm text-foreground truncate">{user.client?.name || "-"}</div>
        <div className="text-sm text-muted-foreground">
          {user.last_sign_in_at
            ? format(new Date(user.last_sign_in_at), "MMM d, yyyy")
            : "Never"}
        </div>
        <div className="flex items-center justify-end">
          <UserActionsCell 
            user={user} 
            clients={clientOptions} 
            onUserUpdated={onUserUpdated}
          />
        </div>
      </div>
    </div>
  );
});

UserRow.displayName = 'UserRow';

export function VirtualizedUsersTable({ clientOptions }: VirtualizedUsersTableProps) {
  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  
  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: currentUserRole } = useCurrentUser();
  const isStaffUser = currentUserRole === 'Staff';
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Build filters object
  const filters: UsersFilters = React.useMemo(() => {
    const f: UsersFilters = {
      pageSize: 50, // Optimized for virtualization
    };
    
    if (debouncedSearchTerm) {
      f.search = debouncedSearchTerm;
    }
    
    if (roleFilter && roleFilter !== 'all') {
      f.role = roleFilter;
    }
    
    if (clientFilter && clientFilter !== 'all') {
      f.clientId = clientFilter;
    }
    
    return f;
  }, [debouncedSearchTerm, roleFilter, clientFilter]);
  
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
  } = useUsersInfinite(filters);
  
  // Flatten all pages into single array
  const users = React.useMemo(() => flattenUsersPages(data), [data]);
  const totalCount = React.useMemo(() => getTotalUsersCount(data), [data]);
  
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
  const itemCount = hasNextPage ? users.length + 1 : users.length;
  
  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasNextPage || index < users.length;
  }, [hasNextPage, users.length]);
  
  // Load more items
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
    return Promise.resolve();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  
  const handleUserUpdated = useCallback(() => {
    // Invalidate and refetch data
    queryClient.invalidateQueries({ 
      predicate: (query) => 
        query.queryKey[0] === 'admin' && query.queryKey[1] === 'users' 
    });
  }, [queryClient]);
  
  // Row data for virtualized list
  const rowData: RowData = React.useMemo(() => ({
    users,
    clientOptions,
    onUserUpdated: handleUserUpdated,
  }), [users, clientOptions, handleUserUpdated]);
  
  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive mb-4">Error loading users: {error?.message}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </Card>
    );
  }
  
  return (
    <Card className="border-0 shadow-none bg-transparent">
      {isStaffUser && (
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            You are in view-only mode. Staff members can view users but cannot edit or deactivate them.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="p-6 space-y-4">        
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
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
            <div className="grid gap-4 md:grid-cols-2 rounded-md border p-4">
              <div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
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
                    <SelectItem value="all">All Clients</SelectItem>
                    {clientOptions.map((client) => (
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

        {/* Table Container */}
        <div className="rounded-md border">
          {/* Table Header */}
          <div className="grid grid-cols-7 gap-6 px-6 py-4 font-medium bg-muted/50 border-b text-sm">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Client</div>
            <div>Last Active</div>
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
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No users found.
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
                  {UserRow}
                </List>
              )}
            </InfiniteLoader>
          )}
          
          {/* Status bar */}
          <div className="p-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <div>
                Showing {users.length} of {totalCount} users
              </div>
              {isFetchingNextPage && (
                <div className="text-xs">Loading more...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 