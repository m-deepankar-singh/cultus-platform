# Detailed Implementation Plan: Product Management API (`/api/admin/products`)

This document provides a step-by-step guide for implementing the **Admin Product Management API** endpoints.

**Target Role:** Admin
**Base Route:** `/api/admin/products`

**Prerequisites:**

*   Supabase project set up.
*   `products` table exists with relevant columns (e.g., `id`, `name`, `description`, `created_at`, `is_active`).
*   `modules` table exists (as product details might involve fetching related modules).
*   Supabase RLS policies configured for `products` table (Admins: all access).
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper installed.
*   Utility functions for creating Supabase server/admin clients and getting user session/role exist.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/product.ts`

*   [x] **Create File:** Create the file `lib/schemas/product.ts` if it doesn't exist.
*   [x] **Import Zod:** Add `import { z } from 'zod';`.
*   [x] **Define `ProductSchema`:**
    ```typescript
    export const ProductSchema = z.object({
      name: z.string().min(1, { message: 'Product name is required' }),
      description: z.string().optional().nullable(),
      is_active: z.boolean().default(true).optional(),
      // Add other relevant product fields
    });
    ```
*   [x] **Define `UpdateProductSchema` (Optional - can reuse ProductSchema with `.partial()`):**
    ```typescript
    // Option 1: Reuse with partial
    export const UpdateProductSchema = ProductSchema.partial();

    // Option 2: Define explicitly if different validation needed for update
    // export const UpdateProductSchema = z.object({ ... });
    ```
*   [x] **Define `ProductIdSchema`:**
    ```typescript
    export const ProductIdSchema = z.object({
      productId: z.string().uuid({ message: 'Invalid Product ID format' })
    });
    ```
*   [x] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Implement `GET /api/admin/products` (List Products)

*   **File:** `app/api/admin/products/route.ts`

*   [x] **Create File/Directory:** Create `app/api/admin/products/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'. Return 401/403 if invalid.
*   [x] **Parse Query Parameters:** Extract optional filters (e.g., `search`, `isActive`).
*   [x] **Build Supabase Query:**
    *   [x] Start query: `let query = supabase.from('products').select('*'); // Adjust columns if needed`.
    *   [x] Apply filters: `if (searchQuery) { query = query.ilike('name', `%${searchQuery}%`); }`, `if (isActiveFilter) { query = query.eq('is_active', isActiveFilter === 'true'); }`.
    *   [x] Add ordering: `query = query.order('name', { ascending: true });`.
*   [x] **Execute Query & Handle Response:** Fetch data, handle DB errors, return product list or empty array.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Implement `POST /api/admin/products` (Create Product)

*   **File:** `app/api/admin/products/route.ts`

*   [x] **Imports:** Add `ProductSchema`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body: `const body = await request.json();`.
    *   [x] Validate: `const validationResult = ProductSchema.safeParse(body);`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const productData = validationResult.data;`.
*   [x] **Insert Product:**
    *   [x] Create Supabase server client.
    *   [x] Insert: `const { data: newProduct, error } = await supabase.from('products').insert(productData).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors (500), return new product data (201).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Implement `GET /api/admin/products/[productId]` (Get Product Details)

*   **File:** `app/api/admin/products/[productId]/route.ts`

*   [x] **Create File/Directory:** Create `app/api/admin/products/[productId]/route.ts`.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `ProductIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Validate Route Parameter:** Validate `params.productId` using `ProductIdSchema`.
*   [x] **Fetch Product Details:**
    *   [x] Create Supabase server client.
    *   [x] Query: `const { data: product, error } = await supabase.from('products').select('*, modules(*)').eq('id', productId).single(); // Fetch product and related modules`.
*   [x] **Handle Response & Errors:** Handle DB errors (non-PGRST116), handle not found (404), return product data with modules (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Implement `PUT /api/admin/products/[productId]` (Update Product)

*   **File:** `app/api/admin/products/[productId]/route.ts`

*   [x] **Imports:** Add `UpdateProductSchema` (or `ProductSchema`).
*   [x] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Validate Route Parameter:** Validate `params.productId` using `ProductIdSchema`.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body.
    *   [x] Validate using `UpdateProductSchema.safeParse(body)` or `ProductSchema.partial().safeParse(body)`.
    *   [x] Handle validation errors (400).
    *   [x] Get validated data: `const updateData = validationResult.data;`.
    *   [x] Check if `updateData` is empty (return 400).
*   [x] **Update Product:**
    *   [x] Create Supabase server client.
    *   [x] Update: `const { data: updatedProduct, error } = await supabase.from('products').update(updateData).eq('id', productId).select().single();`.
*   [x] **Handle Response & Errors:** Handle DB errors, handle not found (if `updatedProduct` is null), return updated product data (200).
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 6. Implement `DELETE /api/admin/products/[productId]` (Delete Product)

*   **File:** `app/api/admin/products/[productId]/route.ts`

*   [x] **Imports:** Add `createAdminClient` (if needing complex cleanup).
*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [x] **Validate Route Parameter:** Validate `params.productId` using `ProductIdSchema`.
*   [x] **Perform Deletion:**
    *   [x] Create Supabase server client (or admin client).
    *   [x] **Consider Dependencies:** Determine handling for related `modules`, `client_product_assignments`, and potentially `progress` data. Cascade delete (DB constraints) is often simplest if appropriate. Otherwise, check for dependencies and either prevent deletion or perform manual cleanup.
    *   [x] Delete product: `const { error } = await supabase.from('products').delete().eq('id', productId);`.
*   [x] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 7. Refinement and Testing

*   [ ] **Review Code:** Check for consistency, proper error handling, types, and status codes.
*   [ ] **Test Each Endpoint:** Use Postman/Insomnia or frontend integration:
    *   Success cases for CRUD operations.
    *   Authentication/Authorization failures.
    *   Validation errors (invalid input/IDs).
    *   Not found errors.
    *   Filter functionality (list endpoint).
    *   Deletion constraints (if dependencies exist).
*   [ ] **Check Supabase Logs:** Monitor logs during testing.
*   [ ] **Verify RLS:** Ensure only Admins can access these endpoints. 