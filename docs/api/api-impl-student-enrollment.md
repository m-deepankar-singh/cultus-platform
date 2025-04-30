# Detailed Implementation Plan: Student Enrollment API (`/api/staff/clients/[clientId]/students`)

This document provides a step-by-step guide for implementing the **Student Enrollment API** endpoints, used by Staff and Admins.

**Target Roles:** Admin, Staff
**Base Route:** `/api/staff/clients/[clientId]/students`

**Prerequisites:**

*   Supabase project set up.
*   `clients` table exists.
*   `profiles` table exists (linking to `auth.users`, with `role`, `client_id`, `is_active`, `email`, `full_name` columns).
*   Supabase RLS policies configured for `profiles` (Admins: all access; Staff: access based on their assigned client(s); Students: self-access).
*   Supabase Auth configured (Email/Password provider).
*   Next.js project with App Router, TypeScript, Zod, Supabase SSR helper installed.
*   Utility functions for Supabase server/admin clients and getting user session/profile/role exist.
*   Zod schema for `ClientIdSchema` exists.

**Design Notes:**

*   Enrollment status is managed via the `profiles` table (`client_id` and `is_active` flag).
*   Enrolling creates/updates both `auth.users` and `profiles`.
*   Unenrolling *updates* the profile (`is_active` = false), but does *not* delete the user.
*   Bulk enrollment handles multiple students, potentially requiring robust error reporting.
*   Requires `supabase.auth.admin` privileges.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/enrollment.ts` (Create if needed)

*   [x] **Create File:** Create `lib/schemas/enrollment.ts`.
*   [x] **Imports:** `import { z } from 'zod';`
*   [x] **Define `EnrollStudentSchema` (Manual):**
    ```typescript
    export const EnrollStudentSchema = z.object({
      email: z.string().email({ message: 'Invalid email address' }),
      full_name: z.string().min(1, { message: 'Full name is required' }),
      // Add any other necessary fields for student profile creation
      send_invite: z.boolean().optional().default(true), // Option to send Supabase invite email
    });
    ```
*   [x] **Define `BulkEnrollStudentSchema`:**
    ```typescript
    export const BulkEnrollStudentSchema = z.object({
      students: z.array(EnrollStudentSchema.omit({ send_invite: true })) // Don't need send_invite per student usually
        .min(1, { message: 'At least one student is required for bulk enrollment' }),
      send_invite: z.boolean().optional().default(true), // Apply invite setting to the whole batch
    });
    ```
*   [x] **Define `StudentIdSchema`:** (Likely same as `UserIdSchema`, ensure it exists and is accessible)
    ```typescript
    // Assuming it's in lib/schemas/user.ts or similar
    // export const StudentIdSchema = z.object({ ... });
    // If not, define it here:
    export const StudentIdSchema = z.object({
      studentId: z.string().uuid({ message: 'Invalid Student ID format' })
    });
    ```
*   [x] **Export Schemas.**

---

## 2. Implement `GET /api/staff/clients/[clientId]/students` (List Enrolled Students)

*   **File:** `app/api/staff/clients/[clientId]/students/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`.
*   [x] **Define `GET` Handler:** `export async function GET(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [x] **Validate Route Parameter (`clientId`):** Validate `params.clientId` using `ClientIdSchema`.
*   [x] **Verify Staff Access:**
    *   [x] Get `validatedClientId = validationResult.data.clientId;`
    *   [x] **If role is Staff:** Check if `profile.client_id` matches `validatedClientId`. Return 403 if not.
*   [x] **Fetch Enrolled Students:**
    *   [x] Create Supabase client.
    *   [x] Query: `const { data: students, error } = await supabase .from('profiles') .select('*') // Select desired student fields .eq('client_id', validatedClientId) .eq('role', 'Student') .eq('is_active', true) // Only fetch active/enrolled students .order('full_name', { ascending: true });`
*   [x] **Handle Response & Errors:** Handle DB errors (500), return student list.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---

## 3. Implement `POST /api/staff/clients/[clientId]/students` (Enroll Student - Manual)

*   **File:** `app/api/staff/clients/[clientId]/students/route.ts`

*   [x] **Imports:** Add `EnrollStudentSchema`, `createAdminClient`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [x] **Validate `clientId` & Staff Access:** Validate route param and check Staff access (as in GET). Return 403 if invalid.
*   [x] **Parse & Validate Request Body:** Validate body using `EnrollStudentSchema`.
*   [x] **Get Data:** `const { email, full_name, send_invite } = validationResult.data;`
*   [x] **Core Enrollment Logic:**
    *   [x] Create Supabase Admin client: `const supabaseAdmin = createAdminClient();`.
    *   [x] **Check if Auth User Exists:** `const { data: existingAuthUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);`
    *   [x] Handle `getUserError` if it's not a "not found" error.
    *   [x] **Scenario 1: Auth User Exists:**
        *   `const userId = existingAuthUser.user.id;`
        *   **Check Profile:** `const { data: existingProfile, error: profileError } = await supabaseAdmin.from('profiles').select('id, client_id, is_active, role').eq('id', userId).single();`
        *   **If Profile Exists:**
            *   Check if already enrolled in this client (`client_id === validatedClientId && is_active`). If yes, return 200 OK or 409 Conflict.
            *   Check if assigned to another client (`client_id && client_id !== validatedClientId && is_active`). Decide policy (error? reassign?). For now, update.
            *   Update profile: `await supabaseAdmin.from('profiles').update({ client_id: validatedClientId, is_active: true, role: 'Student' /* Ensure role is Student */ }).eq('id', userId);`
        *   **If Profile Doesn't Exist:**
            *   Insert profile: `await supabaseAdmin.from('profiles').insert({ id: userId, email: email, full_name: full_name, role: 'Student', client_id: validatedClientId, is_active: true });`
    *   [x] **Scenario 2: Auth User Does NOT Exist:**
        *   **Create Auth User:** Decide between `createUser` (requires password generation/handling) or `inviteUserByEmail` (recommended).
            ```typescript
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
              data: { full_name: full_name }, // Include metadata to prefill profile
              redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`, // Your confirmation URL
            });
            ```
        *   Handle `inviteError` (e.g., email already exists - should have been caught earlier, but handle defensively).
        *   Get new user ID: `const userId = inviteData.user.id;`
        *   **Insert Profile:** `await supabaseAdmin.from('profiles').insert({ id: userId, email: email, full_name: full_name, role: 'Student', client_id: validatedClientId, is_active: true });`
*   [x] **Handle Errors:** Catch errors during profile insert/update after user creation/check. If profile fails after invite, the auth user exists but profile doesn't match - needs careful consideration.
*   [x] **Return Success Response:** Return 201 Created or 200 OK with student profile data.
*   [x] **Add Error Handling:** Wrap logic in `try...catch`.

---

## 4. Implement `POST /api/staff/clients/[clientId]/students/bulk` (Enroll Students - Bulk)

*   **File:** `app/api/staff/clients/[clientId]/students/bulk/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`, `BulkEnrollStudentSchema`, `createAdminClient`.
*   [x] **Define `POST` Handler:** `export async function POST(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [x] **Validate `clientId` & Staff Access:** Validate route param and check Staff access.
*   [x] **Parse & Validate Request Body:** Validate body using `BulkEnrollStudentSchema`.
*   [x] **Get Data:** `const { students, send_invite } = validationResult.data;`
*   [x] **Initialize Results:** `const results = { successes: [], failures: [] };`
*   [x] **Create Admin Client:** `const supabaseAdmin = createAdminClient();`
*   [x] **Loop Through Students:**
    *   `for (const student of students) { ... }`
    *   Inside the loop, wrap the logic for a single student in a `try...catch` block.
    *   **Apply Single Enrollment Logic:** Reuse or adapt the logic from step 3 (check auth user, check profile, create/update auth user via invite, create/update profile).
    *   **Collect Results:** On success, add email/id to `results.successes`. On `catch (error)`, add email and error message to `results.failures`.
*   [x] **Return Summary Response:** Return `results` object (status 200 OK, even if some failed).
*   [x] **Consider Performance:** For very large lists, this synchronous loop can be slow. Consider implementing a background job queue (outside the scope of this basic plan).

---

## 5. Implement `DELETE /api/staff/clients/[clientId]/students?studentId=...` (Unenroll Student)

*   **File:** `app/api/staff/clients/[clientId]/students/route.ts`

*   [x] **File Location:** Updated to be in the main `route.ts` file.
*   [x] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `ClientIdSchema`, `z` (for UUID validation).
*   [x] **Define `DELETE` Handler:** `export async function DELETE(request: Request, { params }: { params: { clientId: string } }) { ... }`
*   [x] **Authentication & Authorization:** Verify user session and role (Staff, Admin).
*   [x] **Validate Route Parameter & Query Parameter:**
    *   [x] Validate `params.clientId` using `ClientIdSchema`.
    *   [x] Extract `studentId` from `request.url`'s search parameters.
    *   [x] Validate `studentId` exists and is a valid UUID using `z.string().uuid()`. Return 400 if missing or invalid.
*   [x] **Verify Staff Access:** Check if Staff user can manage `validatedClientId`.
*   [x] **Perform Unenrollment (Update Profile):**
    *   [x] Create Supabase client/admin client.
    *   [x] Update: `const { data: updatedProfile, error, count } = await supabase .from('profiles') .update({ is_active: false, client_id: null }) // Set inactive, remove client link .eq('id', validatedStudentId) .eq('client_id', validatedClientId) // Ensure we only unenroll from the specified client .eq('role', 'Student') .select('id') .maybeSingle(); // Use maybeSingle to handle not found gracefully`
*   [x] **Handle Response & Errors:**
    *   [x] Handle DB errors (500).
    *   [x] If `count === 0` (and no error), the student wasn't found or wasn't active for this client. Return 404 Not Found.
    *   [x] If successful (`count > 0`), return 204 No Content.
*   [x] **Add Error Handling:** Wrap in `try...catch`.

---
## 6. Refinement and Testing

*   [ ] **Review Code:** Check consistency, error handling, security (especially around admin client usage).
*   [ ] **Atomicity:** Note that creating auth user + profile isn't truly atomic. Implement cleanup logic where possible (e.g., delete auth user if profile creation fails).
*   [ ] **Test Admin Access:** Verify Admins can list, enroll (manual/bulk), and unenroll students for *any* client.
*   [ ] **Test Staff Access:** Verify Staff operations are limited to their assigned client.
*   [ ] **Test Enrollment Scenarios:**
    *   New user enrollment.
    *   Existing auth user, no profile enrollment.
    *   Existing auth user, existing profile (inactive) enrollment.
    *   Existing auth user, existing profile (active for *another* client) enrollment.
    *   Attempting to enroll an already active student for the same client.
*   [ ] **Test Bulk Enrollment:** Test with a mix of new/existing users, report successes/failures correctly.
*   [ ] **Test Unenrollment:** Verify profile is updated (`is_active=false`, `client_id=null`), auth user remains.
*   [ ] **Check Supabase Auth/DB Logs:** Monitor for errors.
*   [ ] **Verify RLS:** Ensure API aligns with RLS. 