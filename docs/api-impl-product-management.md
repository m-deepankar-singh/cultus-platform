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

*   [ ] **Create File:** Create the file `lib/schemas/product.ts` if it doesn't exist.
*   [ ] **Import Zod:** Add `import { z } from 'zod';`.
*   [ ] **Define `ProductSchema`:**
    ```typescript
    export const ProductSchema = z.object({
      name: z.string().min(1, { message: 'Product name is required' }),
      description: z.string().optional().nullable(),
      is_active: z.boolean().default(true).optional(),
      // Add other relevant product fields
    });
    ```
*   [ ] **Define `UpdateProductSchema` (Optional - can reuse ProductSchema with `.partial()`):**
    ```typescript
    // Option 1: Reuse with partial
    export const UpdateProductSchema = ProductSchema.partial();

    // Option 2: Define explicitly if different validation needed for update
    // export const UpdateProductSchema = z.object({ ... });
    ```
*   [ ] **Define `ProductIdSchema`:**
    ```typescript
    export const ProductIdSchema = z.object({
      productId: z.string().uuid({ message: 'Invalid Product ID format' })
    });
    ```
*   [ ] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Implement `GET /api/admin/products` (List Products)

*   **File:** `app/api/admin/products/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/products/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'. Return 401/403 if invalid.
*   [ ] **Parse Query Parameters:** Extract optional filters (e.g., `search`, `isActive`).
*   [ ] **Build Supabase Query:**
    *   [ ] Start query: `let query = supabase.from('products').select('*'); // Adjust columns if needed`.
    *   [ ] Apply filters: `if (searchQuery) { query = query.ilike('name', `%${searchQuery}%`); }`, `if (isActiveFilter) { query = query.eq('is_active', isActiveFilter === 'true'); }`.
    *   [ ] Add ordering: `query = query.order('name', { ascending: true });`.
*   [ ] **Execute Query & Handle Response:** Fetch data, handle DB errors, return product list or empty array.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Implement `POST /api/admin/products` (Create Product)

*   **File:** `app/api/admin/products/route.ts`

*   [ ] **Imports:** Add `ProductSchema`.
*   [ ] **Define `POST` Handler:** `export async function POST(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body: `const body = await request.json();`.
    *   [ ] Validate: `const validationResult = ProductSchema.safeParse(body);`.
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const productData = validationResult.data;`.
*   [ ] **Insert Product:**
    *   [ ] Create Supabase server client.
    *   [ ] Insert: `const { data: newProduct, error } = await supabase.from('products').insert(productData).select().single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500), return new product data (201).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Implement `GET /api/admin/products/[productId]` (Get Product Details)

*   **File:** `app/api/admin/products/[productId]/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/products/[productId]/route.ts`.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `ProductIdSchema`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.productId` using `ProductIdSchema`.
*   [ ] **Fetch Product Details:**
    *   [ ] Create Supabase server client.
    *   [ ] Query: `const { data: product, error } = await supabase.from('products').select('*, modules(*)').eq('id', productId).single(); // Fetch product and related modules`.
*   [ ] **Handle Response & Errors:** Handle DB errors (non-PGRST116), handle not found (404), return product data with modules (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Implement `PUT /api/admin/products/[productId]` (Update Product)

*   **File:** `app/api/admin/products/[productId]/route.ts`

*   [ ] **Imports:** Add `UpdateProductSchema` (or `ProductSchema`).
*   [ ] **Define `PUT` Handler:** `export async function PUT(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.productId` using `ProductIdSchema`.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get body.
    *   [ ] Validate using `UpdateProductSchema.safeParse(body)` or `ProductSchema.partial().safeParse(body)`.
    *   [ ] Handle validation errors (400).
    *   [ ] Get validated data: `const updateData = validationResult.data;`.
    *   [ ] Check if `updateData` is empty (return 400).
*   [ ] **Update Product:**
    *   [ ] Create Supabase server client.
    *   [ ] Update: `const { data: updatedProduct, error } = await supabase.from('products').update(updateData).eq('id', productId).select().single();`.
*   [ ] **Handle Response & Errors:** Handle DB errors, handle not found (if `updatedProduct` is null), return updated product data (200).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 6. Implement `DELETE /api/admin/products/[productId]` (Delete Product)

*   **File:** `app/api/admin/products/[productId]/route.ts`

*   [ ] **Imports:** Add `createAdminClient` (if needing complex cleanup).
*   [ ] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { productId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify user session and role is 'Admin'.
*   [ ] **Validate Route Parameter:** Validate `params.productId` using `ProductIdSchema`.
*   [ ] **Perform Deletion:**
    *   [ ] Create Supabase server client (or admin client).
    *   [ ] **Consider Dependencies:** Determine handling for related `modules`, `client_product_assignments`, and potentially `progress` data. Cascade delete (DB constraints) is often simplest if appropriate. Otherwise, check for dependencies and either prevent deletion or perform manual cleanup.
    *   [ ] Delete product: `const { error } = await supabase.from('products').delete().eq('id', productId);`.
*   [ ] **Handle Response & Errors:** Handle DB errors (500). If successful, return 204 No Content.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

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