# Comprehensive Server-Side Pagination Implementation Plan

## Progress Summary

### Completed
- [x] Phase 1: Core pagination utility functions (`lib/pagination.ts`)
- [x] Phase 2: Reusable pagination UI component (`components/ui/data-pagination.tsx`)
- [x] Phase 3: API endpoints for:
  - [x] Users (`/api/admin/users`)
  - [x] Learners (`/api/admin/learners`)
  - [x] Clients (`/api/admin/clients`)
  - [x] Products (`/api/admin/products`)
  - [x] Modules (`/api/admin/modules`)
- [x] Phase 4: Frontend components updated for server-side pagination:
  - [x] UsersTable
  - [x] LearnersTableClient
  - [x] ClientsTable
  - [x] ProductsTable
  - [x] ModulesTable
  - [x] AssignModuleModal
  - [x] AssignProductModal
  - [x] AddLearnerDialog
  - [x] DataPagination
- [x] Phase 5: Pagination implemented in all major components (see above)

### In Progress / Next Up
- [ ] Phase 6: Database Optimization (add indexes, migrations)
- [ ] Phase 7: Testing and Optimization
- [ ] Phase 8: Implementation for Remaining Components (QuestionList, QuestionBanksTable)

---

## Overview

Based on my analysis of the Cultus Platform codebase, I've identified several components that would benefit from server-side pagination to improve database performance when handling thousands of users. This plan outlines a systematic approach to implement pagination across these components.

### Codebase Compatibility and Adaptation Considerations

This plan is designed to integrate server-side pagination into the Cultus Platform. Based on an analysis of the existing codebase:

*   **Supabase Client:** The plan's reliance on a server-side Supabase client (e.g., `createClient` and `createServiceClient` from `@/lib/supabase/server`) is compatible with the existing setup in `lib/supabase/server.ts`, which correctly uses `@supabase/ssr` for robust server-side authentication and client creation. The plan's API examples use `createServiceClient` which aligns with the existing `createAdminClient` for operations requiring elevated privileges.
*   **Server Components (e.g., `UsersTable`):** Some components identified for pagination, like the current `UsersTable`, are implemented as Server Components. The plan proposes converting these to Client Components (`"use client"`) to manage pagination state (current page, search terms) and handle data fetching interactively. This is a common and effective pattern for interactive tables but represents an architectural shift from their current server-rendered nature.
    *   **Alternative for Server Components:** If preserving a server-centric approach is strongly preferred, pagination could be driven by URL search parameters, with the Server Component re-rendering on navigation. However, this might offer less interactivity for features like instant search without full page reloads or more complex client-side state management. The plan's client component approach is generally more flexible for rich table UIs.
*   **Client Components (e.g., `LearnersTableClient`):** Components like `LearnersTableClient` are already Client Components. The plan's strategy to move their current client-side filtering and data handling to server-side pagination and filtering is a significant improvement for performance and scalability.
*   **API Endpoints and Server Actions:** The plan's approach of modifying existing API routes or creating new Server Actions to handle paginated requests (using `.range()` and count queries) aligns well with Supabase's capabilities and Next.js patterns.
*   **Database Operations:** The use of Supabase's `.range()` method for pagination and the recommendation to add database indexes are crucial for performance and are fully supported.

## Components Requiring Pagination

The following components currently load all data at once and would benefit from server-side pagination:

*   `UsersTable` - Displays admin users
*   `LearnersTableClient` - Displays student accounts
*   `ClientsTable` - Displays client organizations
*   `ProductsTable` - Displays educational products
*   `QuestionList` - Displays assessment questions
*   `ModulesTable` - Displays course modules
*   `QuestionBanksTable` - Displays question banks

## Implementation Plan

### Phase 1: Core Pagination Infrastructure

#### Step 1: Create Pagination Utility Functions

Create a utility file for pagination helpers:

```typescript
// lib/pagination.ts
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

export function calculatePaginationRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
```

#### Step 2: Create Reusable Pagination UI Component

Build on the existing pagination components to create a standardized pagination UI:

```tsx
// components/ui/data-pagination.tsx
import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DataPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: DataPaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} entries
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            />
          </PaginationItem>

          {/* Generate page links - show up to 5 pages */}
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            // Calculate page number to display (centered around current page)
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i + (5 - Math.min(totalPages - currentPage + 1, 5));
              if (pageNum > totalPages) pageNum = i + 1;
            }

            return (
              <PaginationItem key={i}>
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={currentPage === pageNum}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
```

### Phase 2: Server-Side API Endpoints with Pagination

#### Step 3: Update API Routes to Support Pagination

For each component, create or modify the corresponding API endpoint to support pagination:

##### Users API:

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { calculatePaginationRange } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || '';

    const supabase = await createServiceClient();

    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // First get total count
    let countQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Add search filter if provided
    if (search) {
      countQuery = countQuery.ilike('full_name', `%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json({ error: 'Failed to count users' }, { status: 500 });
    }

    // Then fetch paginated data
    let dataQuery = supabase
      .from('profiles')
      .select('*');

    // Add search filter if provided
    if (search) {
      dataQuery = dataQuery.ilike('full_name', `%${search}%`);
    }

    const { data, error: dataError } = await dataQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (dataError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      metadata: {
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        pageSize
      }
    });
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

##### Learners API:

```typescript
// app/api/admin/learners/route.ts
// Similar implementation as Users API but for the students table
```

##### Clients API:

```typescript
// app/api/admin/clients/route.ts
// Similar implementation as Users API but for the clients table
```

##### Products API:

```typescript
// app/api/admin/products/route.ts
// Similar implementation as Users API but for the products table
```

#### Step 4: Create Server Actions for Pagination (Optional)

If using server actions, create them for each entity:

```typescript
// app/actions/users.ts
'use server';

import { createClient } from '@/lib/supabase/server'; // Assuming createClient is your server-side Supabase client
import { calculatePaginationRange, PaginatedResponse } from '@/lib/pagination';

export async function getUsers(page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedResponse<any>> {
  try {
    const supabase = await createClient();

    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // First get total count
    let countQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // Add search filter if provided
    if (search) {
      countQuery = countQuery.ilike('full_name', `%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw new Error('Failed to count users');

    // Then fetch paginated data
    let dataQuery = supabase
      .from('profiles')
      .select('*');

    // Add search filter if provided
    if (search) {
      dataQuery = dataQuery.ilike('full_name', `%${search}%`);
    }

    const { data, error: dataError } = await dataQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (dataError) throw new Error('Failed to fetch users');

    return {
      data: data || [],
      metadata: {
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        pageSize
      }
    };
  } catch (error) {
    console.error('Error in getUsers server action:', error);
    throw error;
  }
}
```

### Phase 3: Update Frontend Components

#### Step 5: Update `UsersTable` Component

```tsx
// components/users/users-table.tsx
"use client";

import { useState, useEffect } from "react";
import { DataPagination } from "@/components/ui/data-pagination";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Constants
const ITEMS_PER_PAGE = 20;

export function UsersTable() {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data function
  async function fetchUsers() {
    setLoading(true);

    try {
      // Fetch paginated data from API
      const response = await fetch(
        `/api/admin/users?page=${currentPage}&pageSize=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();

      setUsers(result.data);
      setTotalCount(result.metadata.totalCount);
      setTotalPages(result.metadata.totalPages);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch data when page changes or search term changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage]); // Note: Search term change triggers fetch via handleSearch

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page
    fetchUsers();
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle loading and error states
  if (error) {
    return <div className="text-red-500 p-4">Error loading users: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage your users and their access.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 pb-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button onClick={handleSearch}>
            Search
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {/* Actions dropdown */}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination UI */}
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
  );
}
```

#### Step 6: Update `LearnersTableClient` Component

```tsx
// components/learners/learners-table-client.tsx
// Similar implementation as UsersTable but for learners
```

#### Step 7: Update `ClientsTable` Component

```tsx
// components/clients/clients-table.tsx
// Similar implementation as UsersTable but for clients
```

#### Step 8: Update `ProductsTable` Component

```tsx
// components/products/products-table.tsx
// Similar implementation as UsersTable but for products
```

### Phase 4: Server Action Implementation (Alternative Approach)

If you prefer using server actions instead of API routes:

#### Step 9: Update `UsersTable` to Use Server Actions

```tsx
// components/users/users-table.tsx
"use client";

import { useState, useEffect } from "react";
import { getUsers } from "@/app/actions/users"; // Ensure this path is correct
import { DataPagination } from "@/components/ui/data-pagination";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Constants
const ITEMS_PER_PAGE = 20;

export function UsersTable() {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data using server action
  async function fetchUsersWithAction() {
    setLoading(true);
    setError(null); // Reset error state

    try {
      const result = await getUsers(currentPage, ITEMS_PER_PAGE, searchTerm);

      setUsers(result.data);
      setTotalCount(result.metadata.totalCount);
      setTotalPages(result.metadata.totalPages);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  // Fetch data when page changes
  useEffect(() => {
    fetchUsersWithAction();
  }, [currentPage]); // Note: Search term change triggers fetch via handleSearch

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page
    fetchUsersWithAction(); // Fetch with new search term
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle loading and error states
  if (error && !loading) { // Show error only if not loading (to prevent flicker)
    return <div className="text-red-500 p-4">Error loading users: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage your users and their access.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 pb-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading && searchTerm ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {/* Actions dropdown */}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination UI */}
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
  );
}
// Rest of the component remains the same as in Step 5
```

#### Step 10: Create Server Actions for Other Components

Create similar server actions for other components that need pagination:

```typescript
// app/actions/learners.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { calculatePaginationRange, PaginatedResponse } from '@/lib/pagination';

export async function getLearners(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  clientFilter?: string,
  statusFilter?: string
): Promise<PaginatedResponse<any>> {
  try {
    const supabase = await createClient();

    // Calculate range for pagination
    const { from, to } = calculatePaginationRange(page, pageSize);

    // Build query for count
    let countQuery = supabase
      .from('students') // Assuming 'students' is the table name for learners
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (search) {
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    if (clientFilter && clientFilter !== 'all') {
      countQuery = countQuery.eq('client_id', clientFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      countQuery = countQuery.eq('is_active', statusFilter === 'Active');
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw new Error('Failed to count learners');

    // Build query for data
    let dataQuery = supabase
      .from('students')
      .select('*, client:client_id(id, name)'); // Adjust select as needed

    // Apply the same filters
    if (search) {
      dataQuery = dataQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    if (clientFilter && clientFilter !== 'all') {
      dataQuery = dataQuery.eq('client_id', clientFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      dataQuery = dataQuery.eq('is_active', statusFilter === 'Active');
    }

    const { data, error: dataError } = await dataQuery
      .order('created_at', { ascending: false })
      .range(from, to);

    if (dataError) throw new Error('Failed to fetch learners');

    return {
      data: data || [],
      metadata: {
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
        pageSize
      }
    };
  } catch (error) {
    console.error('Error in getLearners server action:', error);
    throw error;
  }
}
```

### Phase 5: Implement Pagination in Specific Components

Let's implement pagination for each component one by one, starting with the most critical ones:

#### Step 11: Implement Pagination in `LearnersTableClient`

```tsx
// components/learners/learners-table-client.tsx
"use client";

import { useState, useEffect } from "react";
import { getLearners } from "@/app/actions/learners"; // Ensure this path is correct
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
// Assuming Search and SlidersHorizontal icons are imported, e.g., from lucide-react
import { Search, SlidersHorizontal } from "lucide-react";
// ... other imports (Select, Dropdown for filters if needed)

const ITEMS_PER_PAGE = 20;

export function LearnersTableClient({ uniqueClients }: { uniqueClients: string[] }) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data function
  async function fetchLearnersData() {
    setLoading(true);
    setError(null);

    try {
      const result = await getLearners(
        currentPage,
        ITEMS_PER_PAGE,
        searchTerm,
        clientFilter,
        statusFilter
      );

      setLearners(result.data);
      setTotalCount(result.metadata.totalCount);
      setTotalPages(result.metadata.totalPages);
    } catch (err: any) {
      console.error('Error fetching learners:', err);
      setError(err.message || 'Failed to fetch learners');
    } finally {
      setLoading(false);
    }
  }

  // Fetch data when page changes or filters change (filters trigger through handleFiltersChange)
  useEffect(() => {
    fetchLearnersData();
  }, [currentPage]);

  // Handle search and filter changes
  const handleFiltersChange = () => {
    setCurrentPage(1); // Reset to first page
    fetchLearnersData(); // Fetch with new filters/search
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Rest of the component with UI rendering
  return (
    <div>
      {/* Search and filters UI */}
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search learners..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFiltersChange();
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button onClick={handleFiltersChange} disabled={loading}>
              {loading && (searchTerm || clientFilter !== 'all' || statusFilter !== 'all') ? "Applying..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Filter options */}
        {showFilters && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Example Client Filter Dropdown (replace with your actual component) */}
            <div>
              <label htmlFor="clientFilter" className="block text-sm font-medium text-gray-700">Client</label>
              <select
                id="clientFilter"
                name="clientFilter"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Clients</option>
                {uniqueClients.map(client => <option key={client} value={client}>{client}</option>)}
              </select>
            </div>
            {/* Example Status Filter Dropdown (replace with your actual component) */}
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="statusFilter"
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && !loading && (
        <div className="p-4 text-red-500">Error loading learners: {error}</div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : learners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">No learners found</TableCell>
              </TableRow>
            ) : (
              learners.map((learner) => (
                <TableRow key={learner.id}>
                  <TableCell>{learner.full_name}</TableCell>
                  <TableCell>{learner.email}</TableCell>
                  <TableCell>{learner.client?.name || 'N/A'}</TableCell>
                  <TableCell>{learner.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>{learner.phone_number || 'N/A'}</TableCell>
                  <TableCell>{new Date(learner.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{/* Actions */}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination UI */}
      {!loading && totalPages > 0 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
```

#### Step 12: Implement Pagination in `ClientsTable`

```tsx
// components/clients/clients-table.tsx
"use client";

import { useState, useEffect } from "react";
// Assuming a getClients server action exists or will be created
// import { getClients } from "@/app/actions/clients";
import { DataPagination } from "@/components/ui/data-pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
// ... other imports

// Placeholder for getClients if not yet created
async function getClients(page: number, pageSize: number, search?: string, statusFilter?: string): Promise<any> {
  console.warn("getClients server action not implemented yet. Using placeholder data.");
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockClients = Array.from({ length: pageSize }, (_, i) => ({
    id: `client-${(page - 1) * pageSize + i + 1}`,
    name: `Client ${(page - 1) * pageSize + i + 1} ${search || ''} ${statusFilter || ''}`,
    is_active: Math.random() > 0.5,
    created_at: new Date().toISOString(),
    products: [{ name: "Product A" }, { name: "Product B" }]
  }));
  return {
    data: mockClients,
    metadata: { totalCount: 100, totalPages: Math.ceil(100 / pageSize), currentPage: page, pageSize }
  };
}


const ITEMS_PER_PAGE = 20;

export function ClientsTable() {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // const [showFilters, setShowFilters] = useState(false); // If filters are needed

  // Fetch data function
  async function fetchClientsData() {
    setLoading(true);
    setError(null);

    try {
      const result = await getClients(
        currentPage,
        ITEMS_PER_PAGE,
        searchTerm,
        statusFilter
      );

      // Enhance clients with product data (if products are fetched separately and paginated client list doesn't include them)
      // This example assumes products are part of the client data or handled within getClients
      // If products need a separate fetch per client, this approach might be inefficient for a list view
      // and should be re-evaluated. The example below is simplified.
      const enhancedClients = result.data; // Assuming getClients returns data with products

      // If products need to be fetched separately for each client in the paginated list:
      /*
      const enhancedClients = await Promise.all(
        result.data.map(async (client: any) => {
          try {
            // This is an N+1 problem if not handled carefully.
            // Consider if product count or a summary is enough, or if products should be fetched on demand (e.g., in a modal)
            const response = await fetch(`/api/staff/clients/${client.id}/products`); // Example API
            if (response.ok) {
              const products = await response.json();
              return { ...client, products };
            }
          } catch (error) {
            console.error(`Failed to fetch products for client ${client.id}:`, error);
          }
          return { ...client, products: [] };
        })
      );
      */

      setClients(enhancedClients);
      setTotalCount(result.metadata.totalCount);
      setTotalPages(result.metadata.totalPages);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }

  // Fetch data when page changes or filters change
  useEffect(() => {
    fetchClientsData();
  }, [currentPage]);

  // Handle search and filter changes
  const handleFiltersChange = () => {
    setCurrentPage(1); // Reset to first page
    fetchClientsData();
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      {/* Search and Filters UI (Similar to LearnersTableClient) */}
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFiltersChange(); }}
            className="flex-1"
          />
          {/* Add filter UI for statusFilter if needed */}
          <Button onClick={handleFiltersChange} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && !loading && (
        <div className="p-4 text-red-500">Error loading clients: {error}</div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No clients found</TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.is_active ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    {client.products && client.products.length > 0
                      ? client.products.map((p: any) => p.name).join(', ')
                      : 'No products'}
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{/* Actions */}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination UI */}
      {!loading && totalPages > 0 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
```

### Phase 6: Database Optimization

#### Step 13: Add Indexes to Database Tables

To ensure optimal performance with pagination, add appropriate indexes to your database tables:

*   **Users/Profiles Table:**
    *   Add index on `created_at` for sorting (e.g., `created_at DESC`)
    *   Add index on `full_name` for search filtering (consider text search capabilities like `GIN` index with `tsvector` if using PostgreSQL and complex searches)
    *   Add index on `email` for search filtering

*   **Students Table:**
    *   Add index on `created_at` for sorting (e.g., `created_at DESC`)
    *   Add index on `full_name` for search filtering
    *   Add index on `email` for search filtering
    *   Add index on `client_id` for filtering
    *   Add index on `is_active` for filtering

*   **Clients Table:**
    *   Add index on `created_at` for sorting (e.g., `created_at DESC`)
    *   Add index on `name` for search filtering
    *   Add index on `is_active` for filtering

*   **Products Table:**
    *   Add index on `created_at` for sorting (e.g., `created_at DESC`)
    *   Add index on `name` for search filtering

#### Step 14: Create Database Migrations

Create migration files to add these indexes:

```sql
-- Example migration for students table (PostgreSQL syntax)
CREATE INDEX IF NOT EXISTS idx_students_created_at_desc ON students (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_full_name_trgm ON students USING gin (full_name gin_trgm_ops); -- For ilike '%search%'
-- Alternatively, for simple prefix/exact search:
-- CREATE INDEX IF NOT EXISTS idx_students_full_name ON students (full_name);
CREATE INDEX IF NOT EXISTS idx_students_email_trgm ON students USING gin (email gin_trgm_ops); -- For ilike '%search%'
-- CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);
CREATE INDEX IF NOT EXISTS idx_students_client_id ON students (client_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students (is_active);

-- Example migration for profiles (users) table
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON profiles USING gin (full_name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles (full_name);
```
*(Note: `gin_trgm_ops` requires the `pg_trgm` extension in PostgreSQL for efficient `ILIKE '%text%'` searches. Simple btree indexes are better for exact matches or `ILIKE 'text%'`)*

### Phase 7: Testing and Optimization

#### Step 15: Test Pagination with Different Data Volumes

*   Test with small datasets (10-50 records)
*   Test with medium datasets (100-500 records)
*   Test with large datasets (1000+ records, ideally mirroring production scale)

For each test:

*   Verify correct page navigation (next, previous, specific page numbers)
*   Verify correct item count display (`Showing X-Y of Z entries`)
*   Verify search and filtering work correctly across pages
*   Measure and record load times for initial load and page changes (using browser developer tools)

#### Step 16: Performance Optimization

Based on testing results, implement optimizations:

*   **Query Optimization:**
    *   Use `EXPLAIN ANALYZE` in Supabase (or your database console) to analyze query performance.
    *   Adjust indexes if needed (e.g., add composite indexes, change index types).
    *   Consider denormalizing data for frequently joined fields if joins are a bottleneck, but weigh this against data consistency needs.
*   **UI Optimization:**
    *   Implement loading skeletons or placeholders for table rows for better UX during page transitions and initial load.
    *   Add debounce to search inputs to prevent excessive API calls while the user is typing.
        ```typescript
        // Example debounce function (can be imported from lodash or a custom utility)
        function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
          let timeoutId: NodeJS.Timeout;
          return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
          } as T;
        }

        // In component:
        // const debouncedFetch = useCallback(debounce(fetchDataFunction, 500), []);
        // useEffect(() => { if (searchTerm) debouncedFetch(); }, [searchTerm, debouncedFetch]);
        ```
*   **Caching:**
    *   Implement client-side caching for recently viewed pages or data if appropriate (e.g., using React Query, SWR, or a simple custom cache).
    *   Consider server-side caching (e.g., Redis) for frequently accessed, relatively static data if database load is still high.

    ```typescript
    // Example of implementing a simple client-side cache (conceptual)
    const cache = new Map<string, { data: any; timestamp: number }>();
    const CACHE_TTL = 60000; // 1 minute

    async function fetchDataWithCache(key: string, fetchFn: () => Promise<any>) {
      const now = Date.now();
      const cachedEntry = cache.get(key);

      if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL) {
        return cachedEntry.data;
      }

      const data = await fetchFn();
      cache.set(key, { data, timestamp: now });
      return data;
    }
    ```
    *(Note: Libraries like React Query or SWR handle this more robustly.)*

### Phase 8: Implementation for Remaining Components

#### Step 17: Implement Pagination for `ProductsTable`

Follow the same pattern as in Steps 11 and 12 (using server actions or API routes) to implement pagination for the `ProductsTable` component. Create a `getProducts` server action or API endpoint.

#### Step 18: Implement Pagination for `QuestionList`

Follow the same pattern to implement pagination for the `QuestionList` component. Create a `getQuestions` server action or API endpoint. This might also involve filters for question banks, difficulty, etc.