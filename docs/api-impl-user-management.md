# Detailed Implementation Plan: User Management API (`/api/admin/users`)

This document provides a step-by-step guide for implementing the **Admin User Management API** endpoints.

**Target Role:** Admin
**Base Route:** `/api/admin/users`

**Prerequisites:**

*   Supabase project set up.
*   `profiles` table exists with columns like `id` (FK to `auth.users`), `role`, `client_id` (FK to `clients`, nullable), `full_name`, etc.
*   `clients` table exists.
*   Supabase RLS policies configured for basic access (ensure Admins can manage `profiles` and `auth.users` via `admin` API).
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper (`@supabase/ssr`) installed.
*   Utility functions for creating Supabase server client (`lib/supabase/server.ts`) and admin client (`lib/supabase/admin.ts`) exist.
*   Utility for getting user session and profile/role exists (`lib/supabase/utils.ts`).

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/user.ts`

*   [ ] **Create File:** Create the file `lib/schemas/user.ts` if it doesn't exist.
*   [ ] **Import Zod:** Add `import { z } from 'zod';`.
*   [ ] **Define Roles Enum (Optional but Recommended):** Define a TypeScript enum or const array for user roles used in the application (e.g., `export const USER_ROLES = ['Admin', 'Staff', 'Viewer', 'Client Staff', 'Student'] as const;`).
*   [ ] **Define `CreateUserSchema`:**
    ```typescript
    export const CreateUserSchema = z.object({
      email: z.string().email({ message: 'Invalid email address' }),
      password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
      role: z.enum(USER_ROLES), // Or z.enum(['Admin', 'Staff', ...])
      client_id: z.string().uuid({ message: 'Invalid Client ID' }).optional().nullable(),
      // Add other required fields for profile creation, e.g., full_name
      full_name: z.string().min(1, { message: 'Full name is required' }),
    }).refine(data => {
      // Example: Make client_id required if role is Client Staff
      if (data.role === 'Client Staff') {
        return !!data.client_id;
      }
      return true;
    }, {
      message: 'Client ID is required for Client Staff role',
      path: ['client_id'],
    });
    ```
*   [ ] **Define `UpdateUserSchema`:**
    ```typescript
    export const UpdateUserSchema = z.object({
      role: z.enum(USER_ROLES).optional(),
      client_id: z.string().uuid({ message: 'Invalid Client ID' }).optional().nullable(),
      full_name: z.string().min(1, { message: 'Full name cannot be empty' }).optional(),
      // Add other updatable profile fields as optional
    }).refine(data => {
        // Ensure client_id is provided or nullified correctly based on role if role is changing
        if (data.role === 'Client Staff' && data.client_id === undefined) {
           // If changing TO Client Staff, client_id must be provided in the update
           // This logic might need adjustment based on how updates are handled (e.g., always require client_id if role is Client Staff)
           // return false; 
        }
        if (data.role && data.role !== 'Client Staff' && data.client_id) {
           // If changing role away from Client Staff, maybe nullify client_id?
           // This depends on business logic - maybe keep client_id for history?
        } 
        return true;
    }, { 
        // Add appropriate message and path if refinement fails
        message: 'Client ID handling based on role is invalid',
        path: ['client_id'],
    });
    ```
*   [ ] **Define `UserIdSchema`:**
    ```typescript
    export const UserIdSchema = z.object({
      userId: z.string().uuid({ message: 'Invalid User ID format' })
    });
    ```
*   [ ] **Export Schemas:** Ensure all defined schemas are exported.

---

## 2. Implement `GET /api/admin/users` (List Users)

*   **File:** `app/api/admin/users/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/users/route.ts` if it doesn't exist.
*   [ ] **Imports:**
    ```typescript
    import { NextResponse } from 'next/server';
    import { createClient } from '@/lib/supabase/server'; // Adjust path
    import { getUserSessionAndRole } from '@/lib/supabase/utils'; // Adjust path
    // Potentially import a schema for query parameters if needed
    ```
*   [ ] **Define `GET` Handler:**
    ```typescript
    export async function GET(request: Request) {
      // Implementation steps below
    }
    ```
*   [ ] **Authentication & Authorization:**
    *   [ ] Inside `GET`, create a Supabase server client: `const supabase = createClient();`.
    *   [ ] Verify user session and role: `const { user, role, error: authError } = await getUserSessionAndRole(supabase);`.
    *   [ ] Handle auth errors or missing user: `if (authError || !user) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }`.
    *   [ ] Check if the user role is 'Admin': `if (role !== 'Admin') { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }`.
*   [ ] **Parse Query Parameters:**
    *   [ ] Get URL search params: `const { searchParams } = new URL(request.url);`.
    *   [ ] Extract optional filters: `const searchQuery = searchParams.get('search');`, `const roleFilter = searchParams.get('role');`, `const clientIdFilter = searchParams.get('clientId');`.
*   [ ] **Build Supabase Query:**
    *   [ ] Start query: `let query = supabase.from('profiles').select('*, client:clients(id, name)'); // Select profile fields and client name`.
    *   [ ] Apply search filter if present: `if (searchQuery) { query = query.ilike('full_name', `%${searchQuery}%`); }`.
    *   [ ] Apply role filter if present: `if (roleFilter) { query = query.eq('role', roleFilter); }`.
    *   [ ] Apply client ID filter if present: `if (clientIdFilter) { query = query.eq('client_id', clientIdFilter); }`.
    *   [ ] Add ordering: `query = query.order('created_at', { ascending: false });`.
*   [ ] **Execute Query & Handle Response:**
    *   [ ] Execute: `const { data: users, error } = await query;`.
    *   [ ] Handle database errors: `if (error) { console.error('Error fetching users:', error); return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 }); }`.
    *   [ ] Return user data: `return NextResponse.json(users || []);`.
*   [ ] **Add Error Handling:** Wrap the entire handler logic in a `try...catch` block for unexpected errors, returning a 500 status.

---

## 3. Implement `POST /api/admin/users` (Create User)

*   **File:** `app/api/admin/users/route.ts`

*   [ ] **Imports:**
    ```typescript
    // Add to existing imports:
    import { createAdminClient } from '@/lib/supabase/admin'; // Adjust path
    import { CreateUserSchema } from '@/lib/schemas/user'; // Adjust path
    ```
*   [ ] **Define `POST` Handler:**
    ```typescript
    export async function POST(request: Request) {
      // Implementation steps below
    }
    ```
*   [ ] **Authentication & Authorization:**
    *   [ ] Inside `POST`, create Supabase *admin* client: `const supabaseAdmin = createAdminClient();`.
    *   [ ] Verify requesting user session and role is 'Admin' using the *server* client (as in GET). Return 401/403 if invalid.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get request body: `const body = await request.json();`.
    *   [ ] Validate body: `const validationResult = CreateUserSchema.safeParse(body);`.
    *   [ ] Handle validation errors: `if (!validationResult.success) { return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 }); }`.
    *   [ ] Get validated data: `const { email, password, role, client_id, full_name } = validationResult.data;`.
*   [ ] **Create Auth User:**
    *   [ ] Call Supabase Auth Admin: `const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, // Send confirmation email user_metadata: { full_name: full_name } });`.
    *   [ ] Handle Auth errors (e.g., user exists): `if (authError) { console.error('Auth user creation error:', authError); return NextResponse.json({ error: authError.message || 'Failed to create user in auth' }, { status: 409 }); // 409 Conflict might be suitable }`.
    *   [ ] Check if user data is present: `if (!authData || !authData.user) { console.error('Auth user creation failed silently.'); return NextResponse.json({ error: 'Failed to create user' }, { status: 500 }); }`.
    *   [ ] Get the new user ID: `const userId = authData.user.id;`.
*   [ ] **Create Profile Entry:**
    *   [ ] Insert into `profiles`: `const { data: profileData, error: profileError } = await supabaseAdmin .from('profiles') .insert({ id: userId, email: email, // Store email in profile too? Optional. role: role, client_id: client_id, full_name: full_name }) .select() .single();`.
*   [ ] **Handle Profile Creation Errors & Atomicity Concern:**
    *   [ ] Check for profile insertion errors: `if (profileError) { console.error('Profile creation error:', profileError); // Attempt to clean up the auth user? (Best effort) await supabaseAdmin.auth.admin.deleteUser(userId); return NextResponse.json({ error: profileError.message || 'Failed to create user profile' }, { status: 500 }); }`.
*   [ ] **Return Success Response:**
    *   [ ] Return the newly created profile: `return NextResponse.json(profileData, { status: 201 });`.
*   [ ] **Add Error Handling:** Wrap the entire handler logic in a `try...catch` block.

---

## 4. Implement `GET /api/admin/users/[userId]` (Get User Details)

*   **File:** `app/api/admin/users/[userId]/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/users/[userId]/route.ts`.
*   [ ] **Imports:**
    ```typescript
    import { NextResponse } from 'next/server';
    import { createClient } from '@/lib/supabase/server';
    import { getUserSessionAndRole } from '@/lib/supabase/utils';
    import { UserIdSchema } from '@/lib/schemas/user';
    ```
*   [ ] **Define `GET` Handler:**
    ```typescript
    export async function GET(request: Request, { params }: { params: { userId: string } }) {
      // Implementation steps below
    }
    ```
*   [ ] **Authentication & Authorization:** Verify user session and 'Admin' role (as in previous GET).
*   [ ] **Validate Route Parameter:**
    *   [ ] Validate `params.userId`: `const validationResult = UserIdSchema.safeParse({ userId: params.userId });`.
    *   [ ] Handle validation errors: `if (!validationResult.success) { return NextResponse.json({ error: 'Invalid User ID format' }, { status: 400 }); }`.
    *   [ ] Get validated ID: `const { userId } = validationResult.data;`.
*   [ ] **Fetch User Profile:**
    *   [ ] Create Supabase server client.
    *   [ ] Query: `const { data: profile, error } = await supabase.from('profiles').select('*, client:clients(id, name)').eq('id', userId).single();`.
*   [ ] **Handle Response & Errors:**
    *   [ ] Handle database errors: `if (error && error.code !== 'PGRST116') { // PGRST116: Row not found console.error('Error fetching profile:', error); return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 }); }`.
    *   [ ] Handle user not found: `if (!profile) { return NextResponse.json({ error: 'User not found' }, { status: 404 }); }`.
    *   [ ] Return profile data: `return NextResponse.json(profile);`.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 5. Implement `PUT /api/admin/users/[userId]` (Update User)

*   **File:** `app/api/admin/users/[userId]/route.ts`

*   [ ] **Imports:** Add `UpdateUserSchema`.
*   [ ] **Define `PUT` Handler:**
    ```typescript
    export async function PUT(request: Request, { params }: { params: { userId: string } }) {
      // Implementation steps below
    }
    ```
*   [ ] **Authentication & Authorization:** Verify user session and 'Admin' role.
*   [ ] **Validate Route Parameter:** Validate `params.userId` using `UserIdSchema`.
*   [ ] **Parse & Validate Request Body:**
    *   [ ] Get request body: `const body = await request.json();`.
    *   [ ] Validate body: `const validationResult = UpdateUserSchema.safeParse(body);`.
    *   [ ] Handle validation errors: Return 400 status.
    *   [ ] Get validated data: `const updateData = validationResult.data;`.
    *   [ ] Check if there's anything to update: `if (Object.keys(updateData).length === 0) { return NextResponse.json({ error: 'No update data provided' }, { status: 400 }); }`.
*   [ ] **Update Profile:**
    *   [ ] Create Supabase server client.
    *   [ ] Update: `const { data: updatedProfile, error } = await supabase .from('profiles') .update(updateData) .eq('id', userId) .select('*, client:clients(id, name)') // Return updated data with client info .single();`.
*   [ ] **Handle Response & Errors:**
    *   [ ] Handle database errors (check for non-PGRST116 errors).
    *   [ ] Handle user not found (if `updatedProfile` is null after update attempt without error).
    *   [ ] Return updated profile: `return NextResponse.json(updatedProfile);`.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 6. Implement `DELETE /api/admin/users/[userId]` (Delete User)

*   **File:** `app/api/admin/users/[userId]/route.ts`

*   [ ] **Imports:** Add `createAdminClient`.
*   [ ] **Define `DELETE` Handler:**
    ```typescript
    export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
      // Implementation steps below
    }
    ```
*   [ ] **Authentication & Authorization:** Verify user session and 'Admin' role.
*   [ ] **Validate Route Parameter:** Validate `params.userId` using `UserIdSchema`.
*   [ ] **Create Admin Client:** `const supabaseAdmin = createAdminClient();`.
*   [ ] **Delete Profile First (Optional but Recommended):**
    *   [ ] `const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);`.
    *   [ ] Log profile deletion errors but proceed cautiously: `if (profileError) { console.warn(`Failed to delete profile for ${userId}: ${profileError.message}. Proceeding with auth user deletion.`); // Don't necessarily block auth deletion }`.
*   [ ] **Delete Auth User:**
    *   [ ] `const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);`.
*   [ ] **Handle Auth Deletion Errors:**
    *   [ ] Check for errors: `if (authError) { console.error('Auth user deletion error:', authError); // If profile deletion worked but this failed, state is inconsistent. return NextResponse.json({ error: authError.message || 'Failed to delete user from auth' }, { status: 500 }); }`.
*   [ ] **Return Success Response:**
    *   [ ] Return no content: `return new NextResponse(null, { status: 204 });` or `return NextResponse.json({ message: 'User deleted successfully' });`.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 7. Refinement and Testing

*   [ ] **Review Code:** Ensure consistent error handling, proper status codes, and adherence to TypeScript best practices.
*   [ ] **Test Each Endpoint:** Use tools like Postman, Insomnia, or frontend interactions to test:
    *   Success cases.
    *   Authentication/Authorization failures (wrong role, no session).
    *   Validation errors (invalid input, missing fields).
    *   Not found errors (invalid IDs).
    *   Edge cases (e.g., creating existing user, deleting non-existent user).
*   [ ] **Check Supabase Logs:** Monitor Supabase logs for any unexpected database or auth errors during testing. 