# Detailed Implementation Plan: Storage Integration API (`/api/admin/storage/upload`)

This document provides a step-by-step guide for implementing the **Admin Storage Upload API** endpoint.

**Target Role:** Admin
**Base Route:** `/api/admin/storage/upload`

**Prerequisites:**

*   Supabase project set up.
*   Supabase Storage configured:
    *   A bucket named `course-videos` (or similar, adjust accordingly) exists.
    *   Storage RLS policies are set up via the Supabase Dashboard to allow authenticated users (specifically Admins, based on metadata or role check in policy) to upload to the target bucket (e.g., `course-videos`).
*   Next.js project with App Router, TypeScript, and Supabase SSR helper installed.
*   Utility functions for creating Supabase server clients and getting user session/role exist.

**Design Notes:**

*   This endpoint will accept `FormData` containing the file to upload.
*   The filename on Supabase Storage might need a strategy to avoid collisions (e.g., prefixing with user ID, timestamp, or a UUID). For simplicity, this initial plan uses the original filename but may need refinement.
*   Error handling should cover file validation, upload errors, and authorization.
*   Consider adding file size and type validation.

---

## 1. Define Zod Schemas (Optional)

*   **File:** `lib/schemas/storage.ts` (Create if needed)

*   [ ] **(Optional) Define Metadata Schema:** If you plan to pass additional metadata along with the file in the `FormData`, define a Zod schema to validate it. For a basic file upload, this might not be necessary.
    ```typescript
    // Example if passing moduleId with the file
    // import { z } from 'zod';
    // export const UploadMetadataSchema = z.object({
    //   moduleId: z.string().uuid().optional(),
    // });
    ```

---

## 2. Implement `POST /api/admin/storage/upload` (Upload File)

*   **File:** `app/api/admin/storage/upload/route.ts`

*   [ ] **Create File/Directory:** Create `app/api/admin/storage/upload/route.ts`.
*   [ ] **Imports:**
    ```typescript
    import { NextResponse } from 'next/server';
    import { createClient } from '@/lib/supabase/server'; // Adjust path
    import { getUserSessionAndRole } from '@/lib/supabase/utils'; // Adjust path
    // import { UploadMetadataSchema } from '@/lib/schemas/storage'; // Optional
    ```
*   [ ] **Define `POST` Handler:**
    ```typescript
    export async function POST(request: Request) {
      // Implementation steps below
    }
    ```
*   [ ] **Authentication & Authorization:**
    *   [ ] Inside `POST`, create a Supabase server client: `const supabase = createClient();`.
    *   [ ] Verify user session and role: `const { user, role, error: authError } = await getUserSessionAndRole(supabase);`.
    *   [ ] Handle auth errors or missing user (401).
    *   [ ] Check if the user role is 'Admin' (403).
*   [ ] **Process FormData:**
    *   [ ] Get FormData: `const formData = await request.formData();`.
    *   [ ] Get the file: `const file = formData.get('file') as File | null;`.
    *   [ ] **(Optional) Get Metadata:** `const metadataField = formData.get('metadata'); // e.g., get moduleId if sent`
    *   [ ] **(Optional) Parse Metadata:** `const metadata = metadataField ? JSON.parse(metadataField as string) : {};`
    *   [ ] **(Optional) Validate Metadata:** `const metadataValidation = UploadMetadataSchema.safeParse(metadata); // if using schema`
*   [ ] **Validate File:**
    *   [ ] Check if file exists: `if (!file) { return NextResponse.json({ error: 'No file provided' }, { status: 400 }); }`.
    *   [ ] Check file size (example limit: 100MB): `if (file.size > 100 * 1024 * 1024) { return NextResponse.json({ error: 'File size exceeds limit (100MB)' }, { status: 400 }); }`.
    *   [ ] Check file type (example: allow only mp4): `if (file.type !== 'video/mp4') { return NextResponse.json({ error: 'Invalid file type (only MP4 allowed)' }, { status: 400 }); }`.
*   [ ] **Define Storage Path:**
    *   [ ] **Simple:** `const filePath = `course-videos/${file.name}`; // Prone to collisions!`
    *   [ ] **Better (with UUID prefix):**
        ```typescript
        const fileExtension = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExtension}`;
        const filePath = `course-videos/${fileName}`;
        // Or potentially include moduleId if available: `course-videos/${metadata.moduleId}/${fileName}`
        ```
*   [ ] **Upload to Supabase Storage:**
    *   [ ] Call upload: `const { data, error: uploadError } = await supabase.storage .from('course-videos') // Use your bucket name .upload(filePath, file, { upsert: false // Set to true to allow overwriting });`.
*   [ ] **Handle Upload Response & Errors:**
    *   [ ] Check for upload errors: `if (uploadError) { console.error('Storage upload error:', uploadError); return NextResponse.json({ error: uploadError.message || 'Failed to upload file' }, { status: 500 }); }`.
    *   [ ] Check for missing path data: `if (!data || !data.path) { console.error('Storage upload failed silently.'); return NextResponse.json({ error: 'Upload failed' }, { status: 500 }); }`.
*   [ ] **Get Public URL (Optional but Useful):**
    *   [ ] `const { data: urlData } = supabase.storage.from('course-videos').getPublicUrl(data.path);`
    *   [ ] `const publicUrl = urlData?.publicUrl;`
*   [ ] **Return Success Response:**
    *   [ ] Return the storage path and optionally the public URL: `return NextResponse.json({ path: data.path, publicUrl: publicUrl });`.
*   [ ] **Add Error Handling:** Wrap the entire handler logic in a `try...catch` block for unexpected errors.

---

## 3. Refinement and Testing

*   [ ] **Review Code:** Check for consistency, error handling, and security.
*   [ ] **File Naming Strategy:** Finalize the strategy for naming files in storage to prevent collisions and ensure organization (e.g., using UUIDs, user IDs, module IDs).
*   [ ] **Bucket Policies:** Double-check Supabase Storage RLS policies to ensure only Admins can upload to the intended bucket/path.
*   [ ] **Test Upload:**
    *   Upload valid files (MP4 within size limits).
    *   Attempt uploads with invalid file types.
    *   Attempt uploads exceeding the size limit.
    *   Test uploads with filenames containing special characters.
    *   Test concurrent uploads (if expected).
*   [ ] **Test Authorization:** Attempt uploads as non-Admin users (should fail).
*   [ ] **Verify Storage:** Check the Supabase Storage dashboard to confirm files are uploaded correctly to the expected path.
*   [ ] **Check Supabase Logs:** Monitor storage and API logs during testing. 