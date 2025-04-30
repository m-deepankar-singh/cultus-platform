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

*   [x] **Create File:** Create the file `lib/schemas/client.ts` if it doesn't exist.
*   [x] **Import Zod:** Add `import { z } from 'zod';`.
*   [x] **Define `ClientSchema`:**
    ```typescript
    export const ClientSchema = z.object({
      name: z.string().min(1, { message: 'Client name is required' }),
      contact_email: z.string().email({ message: 'Invalid contact email' }).optional().nullable(),
      // Add other relevant client fields (e.g., address, phone)
      is_active: z.boolean().default(true).optional(),
    });
    ```
*   [x] **Define `UpdateClientSchema` (Optional - can reuse ClientSchema with `.partial()`):**
    ```typescript
    // Option 1: Reuse with partial
    export const UpdateClientSchema = ClientSchema.partial();

    // Option 2: Define explicitly if different validation needed for update
    // export const UpdateClientSchema = z.object({ ... });
    ```
*   [x] **Define `ClientIdSchema`:**
    ```typescript
    export const ClientIdSchema = z.object({
      clientId: z.string().uuid({ message: 'Invalid Client ID format' })
    });
    ```
*   [x] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Admin Routes (`/api/admin/clients`)

### 2.1 Implement `GET /api/admin/clients` (List Clients - Admin)

*   **File:** `app/api/admin/clients/route.ts`

*   [x] **Create File/Directory:** Create `app/api/admin/clients/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient` (from `@/lib/supabase/server` - Adjust path if incorrect).
*   [x] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Call `const supabase = await createClient();` (Assumed async).
    *   [x] Get user: `const { data: { user }, error: authError } = await supabase.auth.getUser();`.
    *   [x] Handle auth errors or no user (401).
    *   [x] Get role: Fetch role from `profiles` table: `const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();`.
    *   [x] Handle profile fetch errors or no profile found (403).
    *   [x] Check if `profile.role === 'Admin'` (403 if not).
*   [x] **Parse Query Parameters:** Extract optional filters (`search`, `isActive`) from `request.url`.
*   [x] **Build Supabase Query:**
    *   [x] Start query: `let query = supabase.from('clients').select('*'); // Adjust columns as needed`.
    *   [x] Apply filters: `if (searchQuery) { query = query.ilike('name', `%${searchQuery}%`); }`, `if (isActiveFilter) { query = query.eq('is_active', isActiveFilter === 'true'); }`.
    *   [x] Add ordering: `query = query.order('name', { ascending: true });`.
*   [x] **Execute Query & Handle Response:** Fetch data, handle DB errors, return client list or empty array.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 2.2 Implement `POST /api/admin/clients` (Create Client - Admin)

*   **File:** `app/api/admin/clients/route.ts`

*   [x] **Imports:** Add `ClientSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body: `const body = await request.json();`.
    *   [x] Validate: `const validationResult = ClientSchema.safeParse(body);`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const clientData = validationResult.data;`.
*   [x] **Insert Client:**
    *   [x] Create Supabase server client.
    *   [x] Insert: `const { data: newClient, error } = await supabase.from('clients').insert(clientData).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors (500), return new client data (201).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 2.3 Implement `GET /api/admin/clients/[clientId]` (Get Client Details - Admin)

*   **File:** `app/api/admin/clients/[clientId]/route.ts`

*   [x] **Create File/Directory:** Create `app/api/admin/clients/[clientId]/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient`, `ClientIdSchema`. (Updated based on actual implementation)
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'. (Using standard method)
*   [x] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`.
*   [x] **Fetch Client Details:**
    *   [x] Create Supabase server client.
    *   [x] Query: `const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientId).single();`.
*   [x] **Handle Response & Errors:** Handle DB errors (non-PGRST116), handle not found (404), return client data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 2.4 Implement `PUT /api/admin/clients/[clientId]` (Update Client - Admin)

*   **File:** `app/api/admin/clients/[clientId]/route.ts`

*   [x] **Imports:** Add `UpdateClientSchema`.
*   [x] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'. (Using standard method)
*   [x] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body.
    *   [x] Validate using `UpdateClientSchema.safeParse(body)`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const updateData = validationResult.data;`.
    *   [x] Check if `updateData` is empty (return 400).
*   [x] **Update Client:**
    *   [x] Create Supabase server client.
    *   [x] Update: `const { data: updatedClient, error } = await supabase.from('clients').update(updateData).eq('id', clientId).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors, handle not found (if `updatedClient` is null), return updated client data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 2.5 Implement `DELETE /api/admin/clients/[clientId]` (Delete Client - Admin)

*   **File:** `app/api/admin/clients/[clientId]/route.ts`

*   [x] **Imports:** Add `createAdminClient`... (Note: Did not need separate admin client for this implementation).
*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'. (Using standard method)
*   [x] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`.
*   [x] **Perform Deletion:**
    *   [x] Create Supabase server client.
    *   [x] **Consider Dependencies:** ... (Comment added in code).
    *   [x] Delete client: `const { error } = await supabase.from('clients').delete().eq('id', clientId);`.
*   [x] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Staff Routes (`/api/staff/clients`)

**Note:** These routes rely heavily on Supabase Row Level Security (RLS) policies being correctly configured on the `clients` table to enforce data access restrictions for Staff users. The API code verifies the user's role but trusts RLS to scope the data returned or modified.

### 3.1 Implement `GET /api/staff/clients` (List Clients - Staff)

*   **File:** `app/api/staff/clients/route.ts`

*   [x] **Create File/Directory:** Create `app/api/staff/clients/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient`. (Updated based on actual implementation)
*   [x] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [x] **Authentication & Authorization:** (Using standard method)
    *   [x] Verify user session and role.
    *   [x] Handle auth errors (401).
    *   [x] Check if role is allowed (e.g., `if (!['Staff', 'Admin'].includes(role)) { ... }`)
*   [x] **Parse Query Parameters:** Extract optional filters (e.g., `search`, `isActive`).
*   [x] **Build Supabase Query (RLS Enforced):**
    *   [x] Create Supabase server client.
    *   [x] Start query: `let query = supabase.from('clients').select('*'); // RLS automatically scopes results...`
    *   [x] Apply optional filters: `if (searchQuery) { ... }`, `if (isActiveFilter) { ... }`.
    *   [x] Add ordering: `query = query.order('name', { ascending: true });`.
*   [x] **Execute Query & Handle Response:** Fetch data, handle DB errors, return client list (which will be correctly scoped by RLS).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `GET /api/staff/clients/[clientId]` (Get Client Details - Staff)

*   **File:** `app/api/staff/clients/[clientId]/route.ts`

*   [x] **Create File/Directory:** Create `app/api/staff/clients/[clientId]/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient`, `ClientIdSchema`. (Updated based on actual implementation)
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify session and allowed roles (Staff, Admin). (Using standard method)
*   [x] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`. Get `validatedClientId`.
*   [x] **Fetch Client Details (RLS Enforced):**
    *   [x] Create Supabase server client.
    *   [x] Query: `const { data: client, error } = await supabase.from('clients').select('*').eq('id', validatedClientId).single(); // RLS ensures ...`
*   [x] **Handle Response & Errors:** Handle DB errors, handle not found (404 - this now also covers RLS denial), return client data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

### 3.3 Implement `PUT /api/staff/clients/[clientId]` (Update Client - Staff)

*   **File:** `app/api/staff/clients/[clientId]/route.ts`

*   [x] **Imports:** Add `UpdateClientSchema`.
*   [x] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify session and allowed roles (Staff, Admin). (Using standard method)
*   [x] **Validate Route Parameter:** Validate `params.clientId` using `ClientIdSchema`. Get `validatedClientId`.
*   [x] **Parse & Validate Request Body:** Validate request body using `UpdateClientSchema`. Handle errors (400). Get `updateData`. Check if `updateData` is empty.
*   [x] **Update Client (RLS Enforced):**
    *   [x] Create Supabase server client.
    *   [x] Update: `const { data: updatedClient, error } = await supabase.from('clients').update(updateData).eq('id', validatedClientId).select().single(); // RLS policies WITH CHECK ...`
*   [x] **Handle Response & Errors:** Handle DB errors, handle not found / update failure (which now includes RLS restriction cases), return updated client data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

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