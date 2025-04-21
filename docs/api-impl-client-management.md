# Detailed Implementation Plan: Client Management API

This document provides a step-by-step guide for implementing the **Client Management API** endpoints for both Admins and Staff roles.

**Target Roles:** Admin, Staff
**Base Routes:** `/api/admin/clients`, `/api/staff/clients`

**Prerequisites:**

*   Supabase project set up.
*   `clients` table exists with relevant columns (e.g., `id`, `name`, `contact_email`, `created_at`).
*   `profiles` table exists, linking users to roles and potentially clients (for Client Staff or Staff assigned to specific clients).
*   **Crucially: Supabase RLS policies configured for `clients` table:**
    *   Admins: Permissive policies granting all access (e.g., `USING (true)` or check for 'Admin' role).
    *   Staff: Policies that restrict `SELECT`, `UPDATE` (and potentially `INSERT`/`DELETE` if applicable) operations to only the clients they are explicitly assigned to. This is the primary mechanism for enforcing staff access, ideally checking against `auth.uid()` and an assignment table or user metadata.
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper installed.
*   Utility functions for creating Supabase server/admin clients and getting user session/role/profile exist (e.g., `getUserSessionAndProfile`).

**Assumption for Staff Access:** RLS policies correctly limit staff access to their assigned client(s). The API logic will rely on these policies rather than manual `client_id` checks within the code. Staff access determination (e.g., `profiles.client_id`, `staff_client_assignments` table, `app_metadata`) is handled within the RLS policy definition.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/client.ts`

*   [ ] **Create File:** Create the file `lib/schemas/client.ts` if it doesn't exist.
*   [ ] **Import Zod:** Add `import { z } from 'zod';`.
*   [ ] **Define `ClientSchema`:**
    ```typescript
    export const ClientSchema = z.object({
      name: z.string().min(1, { message: 'Client name is required' }),
      contact_email: z.string().email({ message: 'Invalid contact email' }).optional().nullable(),
      // Add other relevant client fields (e.g., address, phone)
      is_active: z.boolean().default(true).optional(),
    });
    ```
*   [ ] **Define `UpdateClientSchema` (Optional - can reuse ClientSchema with `.partial()`):**
    ```typescript
    // Option 1: Reuse with partial
    export const UpdateClientSchema = ClientSchema.partial();

    // Option 2: Define explicitly if different validation needed for update
    // export const UpdateClientSchema = z.object({ ... });
    ```
*   [ ] **Define `ClientIdSchema`:**
    ```typescript
    export const ClientIdSchema = z.object({
      clientId: z.string().uuid({ message: 'Invalid Client ID format' })
    });
    ```
*   [ ] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Admin Routes (`/api/admin/clients`)

### 2.1 Implement `GET /api/admin/clients` (List Clients - Admin)

*   **File:** `app/api/admin/clients/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/clients/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient` (from `@/lib/supabase/server` - Adjust path if incorrect).
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Call `const supabase = await createClient();` (Assumed async).
    *   [ ] Get user: `const { data: { user }, error: authError } = await supabase.auth.getUser();`.
    *   [ ] Handle auth errors or no user (401).
    *   [ ] Get role: Fetch role from `profiles` table: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`.
    *   [ ] Handle profile fetch errors or no profile found (403).
    *   [ ] Check if `profile.role === 'Admin'` (403 if not).
*   [ ] **Parse Query Parameters:** Extract optional filters (`search`, `isActive`) from `request.url`.
*   [ ] **Build Supabase Query:**
    *   [ ] Start query: `let query = supabase.from('clients').select('*'); // Adjust columns as needed`.
    *   [ ] Apply filters: `if (searchQuery) { query = query.ilike('name', `%${searchQuery}%`); }`, `if (isActiveFilter) { query = query.eq('is_active', isActiveFilter === 'true'); }`.
    *   [ ] Add ordering: `query = query.order('name', { ascending: true });`.
*   [ ] **Execute Query & Handle Response:** Fetch data, handle DB errors, return client list or empty array.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `POST /api/admin/clients` (Create Client - Admin)

*   **File:** `app/api/admin/clients/route.ts`

*   [ ] **Imports:** Add `ClientSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body: `const body = await request.json();`.
    *   [ ] Validate: `const validationResult = ClientSchema.safeParse(body);`.
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const clientData = validationResult.data;`.
*   [ ] **Insert Client:**
    *   [ ] Create Supabase server client.
    *   [ ] Insert: `const { data: newClient, error } = await supabase.from('clients').insert(clientData).select().single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500), return new client data (201).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.3 Implement `GET /api/admin/clients/[clientId]` (Get Client Details - Admin)

*   **File:** `app/api/admin/clients/[clientId]/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/clients/[clientId]/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `ClientIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`.
*   [ ] **Fetch Client Details:**
    *   [ ] Create Supabase server client.
    *   [ ] Query: `const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientId).single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors (non-PGRST116), handle not found (404), return client data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.4 Implement `PUT /api/admin/clients/[clientId]` (Update Client - Admin)

*   **File:** `app/api/admin/clients/[clientId]/route.ts`

*   [ ] **Imports:** Add `UpdateClientSchema` (or `ClientSchema`).
*   [ ] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body.
    *   [ ] Validate using `UpdateClientSchema.safeParse(body)` or `ClientSchema.partial().safeParse(body)`.
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const updateData = validationResult.data;`.
    *   [ ] Check if `updateData` is empty (return 400).
*   [ ] **Update Client:**
    *   [ ] Create Supabase server client.
    *   [ ] Update: `const { data: updatedClient, error } = await supabase.from('clients').update(updateData).eq('id', clientId).select().single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors, handle not found (if `updatedClient` is null), return updated client data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 2.5 Implement `DELETE /api/admin/clients/[clientId]` (Delete Client - Admin)

*   **File:** `app/api/admin/clients/[clientId]/route.ts`

*   [ ] **Imports:** Add `createAdminClient` (if needed for cascading deletes or related data cleanup not handled by DB constraints).
*   [ ] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`.
*   [ ] **Perform Deletion:**
    *   [ ] Create Supabase server client (or admin client if complex cleanup needed).
    *   [ ] **Consider Dependencies:** Before deleting, determine how related data (users, assignments, progress) should be handled. Options: Cascade delete via DB constraints (preferred), manual cleanup in API (complex), disallow delete if dependencies exist.
    *   [ ] Delete client: `const { error } = await supabase.from('clients').delete().eq('id', clientId);`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Staff Routes (`/api/staff/clients`)

**Note:** These routes rely heavily on Supabase Row Level Security (RLS) policies being correctly configured on the `clients` table to enforce data access restrictions for Staff users. The API code verifies the user's role but trusts RLS to scope the data returned or modified.

### 3.1 Implement `GET /api/staff/clients` (List Clients - Staff)

*   **File:** `app/api/staff/clients/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/staff/clients/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Verify user session and role. `const { user, profile, role, error: authError } = await getUserSessionAndProfile(supabase);`
    *   [ ] Handle auth errors (401).
    *   [ ] Check if role is allowed (e.g., `if (!['Staff', 'Admin'].includes(role)) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }`)
*   [ ] **Parse Query Parameters:** Extract optional filters (e.g., `search`, `isActive`).
*   [ ] **Build Supabase Query (RLS Enforced):**
    *   [ ] Create Supabase server client.
    *   [ ] Start query: `let query = supabase.from('clients').select('*'); // RLS automatically scopes results based on the authenticated user's role and policies.`
    *   [ ] Apply optional filters: `if (searchQuery) { query = query.ilike('name', `%${searchQuery}%`); }`, `if (isActiveFilter) { query = query.eq('is_active', isActiveFilter === 'true'); }`.
    *   [ ] Add ordering: `query = query.order('name', { ascending: true });`.
*   [ ] **Execute Query & Handle Response:** Fetch data, handle DB errors, return client list (which will be correctly scoped by RLS).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `GET /api/staff/clients/[clientId]` (Get Client Details - Staff)

*   **File:** `app/api/staff/clients/[clientId]/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/staff/clients/[clientId]/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify session and allowed roles (Staff, Admin).
*   [ ] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`. Get `validatedClientId`.
*   [ ] **Fetch Client Details (RLS Enforced):**
    *   [ ] Create Supabase server client.
    *   [ ] Query: `const { data: client, error } = await supabase.from('clients').select('*').eq('id', validatedClientId).single(); // RLS ensures only accessible clients are returned. If inaccessible, this returns null/error.`
*   [ ] **Handle Response & Errors:** Handle DB errors, handle not found (404 - this now also covers cases where RLS prevented access), return client data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.3 Implement `PUT /api/staff/clients/[clientId]` (Update Client - Staff)

*   **File:** `app/api/staff/clients/[clientId]/route.ts`

*   [ ] **Imports:** Add `UpdateClientSchema` (or `ClientSchema`).
*   [ ] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify session and allowed roles (Staff, Admin).
*   [ ] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`. Get `validatedClientId`.
*   [ ] **Parse & Validate Request Body:** Validate request body using `UpdateClientSchema`. Handle errors (400). Get `updateData`. Check if `updateData` is empty.
*   [ ] **Update Client (RLS Enforced):**
    *   [ ] Create Supabase server client.
    *   [ ] Update: `const { data: updatedClient, error } = await supabase.from('clients').update(updateData).eq('id', validatedClientId).select().single(); // RLS policies WITH CHECK clause prevent unauthorized updates.`
*   [ ] **Handle Response & Errors:** Handle DB errors, handle not found / update failure (which now includes RLS restriction cases), return updated client data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

**(Note:** Staff DELETE is not included in this plan. If required, a `DELETE /api/staff/clients/[clientId]` endpoint would follow a similar pattern, relying on an RLS `DELETE` policy.)

---

## 4. Refinement and Testing

*   [ ] **Review Code:** Ensure consistency, proper error handling, and adherence to best practices across all Admin and Staff routes.
*   [ ] **DRY Principle:** Identify opportunities to share logic between Admin and Staff routes where appropriate (e.g., using helper functions for data fetching or validation).
*   [ ] **Test Admin Routes:** Verify all CRUD operations for Admins, including filters.
*   [ ] **Test Staff Routes:**
    *   Verify Staff can only list/view/update the client(s) permitted by their RLS policies.
    *   Test access denied scenarios (Staff trying to access unassigned clients via ID - should result in 404).
    *   Test Admin access via Staff routes (should work if Admin RLS policies grant access).
*   [ ] **Test Edge Cases:** Empty results, invalid IDs, validation failures, concurrency issues (if applicable).
*   [ ] **Check Supabase RLS:** **Crucially**, verify that the RLS policies themselves correctly enforce the intended access rules for both Staff and Admin roles. Test RLS directly using different authenticated roles.
*   [ ] **Check Supabase Logs:** Monitor logs during testing. 