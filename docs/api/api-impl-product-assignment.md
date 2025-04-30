# Detailed Implementation Plan: Product Assignment API (`/api/staff/clients/[clientId]/products`)

This document provides a step-by-step guide for implementing the **Product Assignment API** endpoints, used by Staff and Admins.

**Target Roles:** Admin, Staff
**Base Route:** `/api/staff/clients/[clientId]/products`

**Prerequisites:**

*   Supabase project set up.
*   `clients` table exists.
*   `products` table exists.
*   `client_product_assignments` table exists (e.g., `client_id` FK, `product_id` FK, `assigned_at`, composite PK on `client_id, product_id`).
*   `profiles` table exists, linking users to roles and potentially clients (for Staff client association).
*   Supabase RLS policies configured for `client_product_assignments` (Admins: all access; Staff: access based on their assigned client(s)).
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper installed.
*   Utility functions for creating Supabase server clients and getting user session/profile/role exist.
*   Zod schemas for `ClientIdSchema` and `ProductIdSchema` exist (likely in `lib/schemas/client.ts` and `lib/schemas/product.ts`).

**Assumption for Staff Access:** Staff users have a single `client_id` in their profile, or a mechanism exists to determine which clients they manage.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/assignment.ts` (Create if needed)

*   [x] **Create File:** Create `lib/schemas/assignment.ts`.
*   [x] **Imports:** `import { z } from 'zod';`
*   [x] **Define `ProductAssignmentSchema` (for POST body):**
    ```typescript
    export const ProductAssignmentSchema = z.object({
      product_id: z.string().uuid({ message: 'Invalid Product ID' })
    });
    ```
*   [x] **Export Schema.**

---

## 2. Implement `GET /api/staff/clients/[clientId]/products` (List Assigned Products)

*   **File:** `app/api/staff/clients/[clientId]/products/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:**
    *   [x] Verify user session and get profile/role (Staff, Admin allowed). `const { user, profile, role, error: authError } = await getUserSessionAndProfile(supabase);`
    *   [x] Handle auth errors (401).
    *   [x] Check allowed roles: `if (!['Staff', 'Admin'].includes(role)) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }`
*   [x] **Validate Route Parameter (`clientId`):** Validate `params.clientId` using `ClientIdSchema`.
*   [x] **Verify Staff Access:**
    *   [x] Get `validatedClientId = validationResult.data.clientId;`
    *   [x] **If role is Staff:** Check if `profile.client_id` matches `validatedClientId`. Return 403 if no match or `profile.client_id` is null.
*   [x] **Fetch Assigned Products:**
    *   [x] Create Supabase client.
    *   [x] Query: `const { data: assignments, error } = await supabase .from('client_product_assignments') .select(' assigned_at, product:products(*) ' ) // Select assignment details and all product info .eq('client_id', validatedClientId);`.
*   [x] **Handle Response & Errors:** Handle DB errors (500), return the list of products extracted from the assignments (e.g., `assignments.map(a => a.product)`).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Implement `POST /api/staff/clients/[clientId]/products` (Assign Product)

*   **File:** `app/api/staff/clients/[clientId]/products/route.ts`

*   [x] **Imports:** Add `ProductAssignmentSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [x] **Validate Route Parameter (`clientId`):** Validate `params.clientId`.
*   [x] **Verify Staff Access:** Check if Staff user can manage `validatedClientId` (as in GET). Return 403 if not.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body.
    *   [x] Validate using `ProductAssignmentSchema.safeParse(body)`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const { product_id } = validationResult.data;`.
*   [x] **Insert Assignment:**
    *   [x] Create Supabase client.
    *   [x] **Optional:** Verify `product_id` exists in the `products` table first.
    *   [x] Insert: `const { data: newAssignment, error } = await supabase .from('client_product_assignments') .insert({ client_id: validatedClientId, product_id: product_id }) .select() .single();`.
*   [x] **Handle Response & Errors:**
    *   [x] Handle DB errors (e.g., 409 Conflict if assignment already exists due to PK violation, 500 for others).
    *   [x] Return new assignment data or success status (201).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Implement `DELETE /api/staff/clients/[clientId]/products/[productId]` (Unassign Product)

*   **File:** `app/api/staff/clients/[clientId]/products/[productId]/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `ClientIdSchema`, `ProductIdSchema`.
*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { clientId: string, productId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [x] **Validate Route Parameters:** Validate `params.clientId` and `params.productId` using their respective schemas.
*   [x] **Verify Staff Access:** Check if Staff user can manage `validatedClientId` (as in GET). Return 403 if not.
*   [x] **Perform Deletion:**
    *   [x] Create Supabase client.
    *   [x] Delete: `const { error, count } = await supabase .from('client_product_assignments') .delete({ count: 'exact' }) // Request count to check if row existed .eq('client_id', validatedClientId) .eq('product_id', validatedProductId);`.
*   [x] **Handle Response & Errors:**
    *   [x] Handle DB errors (500).
    *   [x] Check if `count` is 0, potentially return 404 Not Found (assignment didn't exist).
    *   [x] If successful (`count > 0`), return 204 No Content.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Refinement and Testing

*   [ ] **Review Code:** Ensure consistency, proper error handling, and security.
*   [ ] **Test Admin Access:** Verify Admins can list, assign, and unassign products for *any* client via these routes.
*   [ ] **Test Staff Access:**
    *   Verify Staff can list, assign, and unassign products *only* for their assigned client.
    *   Verify Staff get 403 errors when attempting operations on other clients.
*   [ ] **Test Edge Cases:**
    *   Assigning an already assigned product (expect 409 Conflict).
    *   Unassigning a product that isn't assigned (expect 404 or success).
    *   Using invalid client or product IDs.
*   [ ] **Check Supabase RLS:** Ensure API behavior aligns with RLS rules for the `client_product_assignments` table.
*   [ ] **Check Supabase Logs:** Monitor logs during testing. 