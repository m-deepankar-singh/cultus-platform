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

*   [ ] **Create File:** Create `lib/schemas/assignment.ts`.
*   [ ] **Imports:** `import { z } from 'zod';`
*   [ ] **Define `ProductAssignmentSchema` (for POST body):**
    ```typescript
    export const ProductAssignmentSchema = z.object({
      product_id: z.string().uuid({ message: 'Invalid Product ID' })
    });
    ```
*   [ ] **Export Schema.**

---

## 2. Implement `GET /api/staff/clients/[clientId]/products` (List Assigned Products)

*   **File:** `app/api/staff/clients/[clientId]/products/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Verify user session and get profile/role (Staff, Admin allowed). `const { user, profile, role, error: authError } = await getUserSessionAndProfile(supabase);`
    *   [ ] Handle auth errors (401).
    *   [ ] Check allowed roles: `if (!['Staff', 'Admin'].includes(role)) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }`
*   [ ] **Validate Route Parameter (`clientId`):** Validate `params.clientId` using `ClientIdSchema`.
*   [ ] **Verify Staff Access:**
    *   [ ] Get `validatedClientId = validationResult.data.clientId;`
    *   [ ] **If role is Staff:** Check if `profile.client_id` matches `validatedClientId`. Return 403 if no match or `profile.client_id` is null.
*   [ ] **Fetch Assigned Products:**
    *   [ ] Create Supabase client.
    *   [ ] Query: `const { data: assignments, error } = await supabase .from('client_product_assignments') .select(' assigned_at, product:products(*) ' ) // Select assignment details and all product info .eq('client_id', validatedClientId);`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500), return the list of products extracted from the assignments (e.g., `assignments.map(a => a.product)`).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Implement `POST /api/staff/clients/[clientId]/products` (Assign Product)

*   **File:** `app/api/staff/clients/[clientId]/products/route.ts`

*   [ ] **Imports:** Add `ProductAssignmentSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [ ] **Validate Route Parameter (`clientId`):** Validate `params.clientId`.
*   [ ] **Verify Staff Access:** Check if Staff user can manage `validatedClientId` (as in GET). Return 403 if not.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body.
    *   [ ] Validate using `ProductAssignmentSchema.safeParse(body)`.
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const { product_id } = validationResult.data;`.
*   [ ] **Insert Assignment:**
    *   [ ] Create Supabase client.
    *   [ ] **Optional:** Verify `product_id` exists in the `products` table first.
    *   [ ] Insert: `const { data: newAssignment, error } = await supabase .from('client_product_assignments') .insert({ client_id: validatedClientId, product_id: product_id }) .select() .single();`.
*   [ ] **Handle Response & Errors:**
    *   [ ] Handle DB errors (e.g., 409 Conflict if assignment already exists due to PK violation, 500 for others).
    *   [ ] Return new assignment data or success status (201).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Implement `DELETE /api/staff/clients/[clientId]/products/[productId]` (Unassign Product)

*   **File:** `app/api/staff/clients/[clientId]/products/[productId]/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`, `ProductIdSchema`.
*   [ ] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { clientId: string, productId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [ ] **Validate Route Parameters:** Validate `params.clientId` and `params.productId` using their respective schemas.
*   [ ] **Verify Staff Access:** Check if Staff user can manage `validatedClientId` (as in GET). Return 403 if not.
*   [ ] **Perform Deletion:**
    *   [ ] Create Supabase client.
    *   [ ] Delete: `const { error, count } = await supabase .from('client_product_assignments') .delete({ count: 'exact' }) // Request count to check if row existed .eq('client_id', validatedClientId) .eq('product_id', validatedProductId);`.
*   [ ] **Handle Response & Errors:**
    *   [ ] Handle DB errors (500).
    *   [ ] Check if `count` is 0, potentially return 404 Not Found (assignment didn't exist).
    *   [ ] If successful (`count > 0`), return 204 No Content.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

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