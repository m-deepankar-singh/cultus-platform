# Detailed Implementation Plan: App Login API (`/api/app/auth/login`)

This document provides a step-by-step guide for implementing the **Student App Login API** endpoint.

**Target Role:** Student (attempting login)
**Base Route:** `/api/app/auth/login`

**Prerequisites:**

*   Supabase project set up.
*   `profiles` table exists (linking to `auth.users`, with `id`, `role`, `client_id`, `is_active`, `email`).
*   Supabase Auth configured (Email/Password provider).
*   Next.js project with App Router, TypeScript, Zod, and Supabase SSR helper (`@supabase/ssr`) installed.
*   Utility function for creating Supabase server client (`createClient`) exists.

**Design Notes:**

*   This endpoint handles login specifically for the student-facing application (`/app`).
*   It performs standard Supabase authentication (`signInWithPassword`).
*   **Crucially:** After successful authentication, it queries the `profiles` table to verify the user is an active, enrolled student associated with a client.
*   If verification fails, the user session created by `signInWithPassword` must be immediately destroyed (`signOut`) before returning an error to prevent unauthorized access.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/auth.ts` (Create or add to existing)

*   [x] **Create File/Imports:** Ensure file exists, `import { z } from 'zod';`
*   [x] **Define `AppLoginSchema`:**
    ```typescript
    import { z } from 'zod';

    export const AppLoginSchema = z.object({
      email: z.string().email({ message: 'Invalid email address' }),
      password: z.string().min(1, { message: 'Password is required' }),
    });
    ```
*   [x] **Export Schema.**

---

## 2. Implement `POST /api/app/auth/login` (Student Login & Verification)

*   **File:** `app/api/app/auth/login/route.ts`

*   [x] **Create File/Directory:** Create directories and file.
*   [x] **Imports:**
    ```typescript
    import { NextResponse } from 'next/server';
    import { createClient } from '@/lib/supabase/server'; // Adjust path
    import { AppLoginSchema } from '@/lib/schemas/auth'; // Adjust path
    ```
*   [x] **Define `POST` Handler:**
    ```typescript
    export async function POST(request: Request) {
      // Implementation steps below
    }
    ```
*   [x] **Create Supabase Client:** Inside `POST`, `const supabase = createClient();`.
*   [x] **Parse & Validate Request Body:**
    *   [x] Get body: `const body = await request.json();`
    *   [x] Validate: `const validationResult = AppLoginSchema.safeParse(body);`
    *   [x] Handle validation errors: `if (!validationResult.success) { return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 }); }`
    *   [x] Get validated data: `const { email, password } = validationResult.data;`
*   [x] **Attempt Supabase Authentication:**
    *   [x] Call `signInWithPassword`: `const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });`
*   [x] **Handle Authentication Failure:**
    *   [x] If `authError`: `return NextResponse.json({ error: authError.message || 'Invalid login credentials' }, { status: 401 }); // Unauthorized`
    *   [x] If no user data returned (shouldn't happen if no error, but check defensively): `if (!authData || !authData.user) { return NextResponse.json({ error: 'Authentication failed' }, { status: 500 }); }`
*   [x] **Verification Step (On Successful Auth):**
    *   [x] Get user ID: `const userId = authData.user.id;`
    *   [x] **Fetch User Profile:** `const { data: profile, error: profileError } = await supabase .from('profiles') .select('role, client_id, is_active') .eq('id', userId) .single();`
    *   [x] Handle profile fetch errors: `if (profileError) { console.error('Profile fetch error after login:', profileError); // Sign out the potentially logged-in user await supabase.auth.signOut(); return NextResponse.json({ error: 'Error verifying user status' }, { status: 500 }); }`
    *   [x] **Perform Checks:**
        ```typescript
        const isVerifiedStudent = 
            profile && 
            profile.role === 'Student' && 
            profile.client_id && 
            profile.is_active === true;
        ```
*   [x] **Handle Verification Result:**
    *   [x] **If `isVerifiedStudent` is true:**
        *   Login is successful and verified. The Supabase SSR helper middleware/server component logic will handle the session.
        *   Return success: `return NextResponse.json({ message: 'Login successful' }, { status: 200 });`
    *   [x] **If `isVerifiedStudent` is false:**
        *   **Crucial:** Sign the user out immediately to invalidate the session cookie set by `signInWithPassword`.
        *   `await supabase.auth.signOut();`
        *   Return forbidden error: `return NextResponse.json({ error: 'Access denied. User is not an active, enrolled student.' }, { status: 403 }); // Forbidden`
*   [x] **Add Top-Level Error Handling:** Wrap the entire handler logic in a `try...catch` block for unexpected errors, ensuring sign-out occurs if an error happens after successful auth but before verification completes.

---

## 3. Refinement and Testing

*   [ ] **Review Code:** Check consistency, status codes, error messages, and especially the sign-out logic on verification failure.
*   [ ] **Test Success Case:** Log in as an active, enrolled student associated with a client. Verify successful login and subsequent access to `/app` routes.
*   [ ] **Test Verification Failures:**
    *   Log in with credentials of an Admin/Staff user (should fail verification, return 403).
    *   Log in with credentials of a Student not assigned to any client (`client_id` is null) (should fail verification, return 403).
    *   Log in with credentials of a Student marked as inactive (`is_active` is false) (should fail verification, return 403).
    *   Log in with credentials of a user in `auth.users` but with no corresponding `profiles` entry (should fail verification, return 403/500 depending on error handling).
*   [ ] **Test Authentication Failures:**
    *   Log in with incorrect password (should return 401).
    *   Log in with non-existent email (should return 401).
*   [ ] **Session Management:** Verify that if verification fails, the user is truly signed out and cannot access protected `/app` routes (check browser cookies/local storage if necessary).
*   [ ] **Check Supabase Auth/DB Logs.** 