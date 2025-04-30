# Detailed Implementation Plan: Notification Logic & API

This document provides a step-by-step guide for implementing the backend logic for **Notification Generation** and the **Client Staff Notification API** endpoints.

**Target Roles:** System/Admin (for generation), Client Staff (for consumption)
**API Routes:** `/api/client-staff/notifications`

**Prerequisites:**

*   Supabase project set up.
*   `profiles` table exists (with `id`, `role`, `client_id`).
*   `clients` table exists.
*   `modules` table exists (with `id`, `product_id`, `name`).
*   `products` table exists (with `id`, `name`).
*   `client_product_assignments` table exists (linking clients and products).
*   `notifications` table exists (e.g., `id` PK, `recipient_profile_id` FK to `profiles.id`, `title` TEXT, `message` TEXT, `link_url` TEXT nullable, `is_read` BOOLEAN default false, `created_at` TIMESTAMPTZ).
*   Supabase RLS policies configured for `notifications` (Client Staff: select/update own notifications; Admin: potentially all access for debugging).
*   Next.js project with App Router, TypeScript, Zod, Supabase SSR helper installed.
*   Utility functions for Supabase server/admin clients and getting user session/profile/role exist.

**Design Notes:**

*   Notifications are generated when specific events occur (e.g., module update).
*   This plan focuses on **Option 2 (API Logic)** for generation, triggering notification creation from relevant API endpoints (like Module Update).
*   Notifications are targeted to specific `recipient_profile_id` (Client Staff).
*   The API allows Client Staff to fetch their unread/recent notifications and mark them as read.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/notification.ts` (Create if needed)

*   [ ] **Create File/Imports:** Create `lib/schemas/notification.ts` and import `zod`.
*   [ ] **Define `NotificationIdSchema`:**
    ```typescript
    import { z } from 'zod';

    export const NotificationIdSchema = z.object({
      notificationId: z.string().uuid({ message: 'Invalid Notification ID format' })
    });
    ```
*   [ ] **(Optional) Define `NotificationMarkReadSchema` (for PATCH body):**
    ```typescript
    // Could be an empty object if no other fields are needed
    export const NotificationMarkReadSchema = z.object({});
    // Or explicitly require is_read: true
    // export const NotificationMarkReadSchema = z.object({ is_read: z.literal(true) });
    ```
*   [ ] **Export Schemas.**

---

## 2. Implement Notification Generation Logic

*   **Location:** Inside relevant API endpoints where notifications should be triggered (e.g., `PUT /api/admin/modules/[moduleId]`).
*   **Helper Function:** Create a utility function to handle notification creation to keep API routes cleaner.

*   [ ] **Create Utility Function (`lib/utils/notifications.ts`):**
    ```typescript
    import { createAdminClient } from '@/lib/supabase/admin'; // Use admin for cross-user inserts
    import { SupabaseClient } from '@supabase/supabase-js';

    interface NotificationPayload {
      title: string;
      message: string;
      link_url?: string;
    }

    // Example: Notify Client Staff when a Module they have access to is updated
    export async function notifyClientStaffForModuleUpdate(
      moduleId: string,
      moduleName: string,
      productId: string,
      productName: string
    ) {
      const supabaseAdmin = createAdminClient();

      try {
        // 1. Find Clients assigned to the Product containing the Module
        const { data: assignments, error: assignmentError } = await supabaseAdmin
          .from('client_product_assignments')
          .select('client_id')
          .eq('product_id', productId);

        if (assignmentError) throw assignmentError;
        if (!assignments || assignments.length === 0) return; // No clients assigned

        const clientIds = assignments.map(a => a.client_id);

        // 2. Find active Client Staff associated with those Clients
        const { data: staffProfiles, error: staffError } = await supabaseAdmin
          .from('profiles')
          .select('id') // Select only the ID
          .in('client_id', clientIds)
          .eq('role', 'Client Staff')
          .eq('is_active', true);

        if (staffError) throw staffError;
        if (!staffProfiles || staffProfiles.length === 0) return; // No staff found

        // 3. Prepare Notification Data
        const notificationsToInsert = staffProfiles.map(profile => ({
          recipient_profile_id: profile.id,
          title: `Module Updated: ${moduleName}`,
          message: `The module "${moduleName}" within product "${productName}" has been updated. Please review the changes.`,
          // Example link - adjust based on your frontend routing
          link_url: `/admin/products/${productId}/modules/${moduleId}`,
        }));

        // 4. Insert Notifications
        const { error: insertError } = await supabaseAdmin
          .from('notifications')
          .insert(notificationsToInsert);

        if (insertError) throw insertError;

        console.log(`Notifications sent to ${staffProfiles.length} client staff for module ${moduleId} update.`);

      } catch (error) {
        console.error('Error generating notifications for module update:', error);
        // Decide on error handling: log, throw, or fail silently?
      }
    }
    ```
*   [ ] **Integrate into Triggering API Route (Example: Module Update):**
    *   **File:** `app/api/admin/modules/[moduleId]/route.ts` (within the `PUT` handler)
    *   **After successful module update:**
        ```typescript
        // ... inside PUT handler, after successful supabase.from('modules').update()
        if (updatedModule) {
          // Fetch product details if not already available
          const { data: productData, error: productError } = await supabase
              .from('products')
              .select('id, name')
              .eq('id', updatedModule.product_id)
              .single();

          if (!productError && productData) {
            // Call the notification utility function (don't await if background is ok)
            notifyClientStaffForModuleUpdate(
              moduleId,
              updatedModule.name, // Use the updated name
              productData.id,
              productData.name
            );
          } else {
              console.error("Failed to fetch product details for notification trigger.");
          }
        }
        // ... rest of PUT handler (return response)
        ```
*   [ ] **Refine Trigger Logic:** Identify all events that should trigger notifications (e.g., new product assignment, student milestone) and implement similar utility functions and API integrations.

---

## 3. Client Staff Notification API (`/api/client-staff/notifications`)

### 3.1 Implement `GET /api/client-staff/notifications` (List Notifications)

*   **File:** `app/api/client-staff/notifications/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:**
    *   [ ] Verify user session, get profile, check role is 'Client Staff'. `const { user, profile, role, error: authError } = await getUserSessionAndProfile(supabase);`
    *   [ ] Handle auth errors or role mismatch (401/403).
    *   [ ] Get `staffProfileId = user.id;`
*   [ ] **Parse Query Parameters (Optional):** Allow filtering by `read` status or limiting results (e.g., `?read=false&limit=10`).
*   [ ] **Fetch Notifications:**
    *   [ ] Create Supabase client.
    *   [ ] Start query: `let query = supabase.from('notifications').select('*');`
    *   [ ] Filter by recipient: `query = query.eq('recipient_profile_id', staffProfileId);`
    *   [ ] Apply filters: `if (readFilter) { query = query.eq('is_read', readFilter === 'true'); }`
    *   [ ] Add ordering: `query = query.order('created_at', { ascending: false });`
    *   [ ] Apply limit: `if (limit) { query = query.limit(parseInt(limit, 10)); }`
*   [ ] **Execute Query & Handle Response:** Fetch data, handle DB errors, return notification list.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.2 Implement `PATCH /api/client-staff/notifications/[notificationId]` (Mark as Read)

*   **File:** `app/api/client-staff/notifications/[notificationId]/route.ts`

*   [ ] **Create File/Directory:** Create directories and file.
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndProfile`, `NotificationIdSchema`, `NotificationMarkReadSchema` (optional).
*   [ ] **Define `PATCH` Handler:** `export async function PATCH(request: Request, { params }: { params: { notificationId: string } }) { ... }`
*   [ ] **Authentication & Authorization:** Verify session, get profile, check role is 'Client Staff'. Get `staffProfileId`.
*   [ ] **Validate Route Parameter (`notificationId`):** Validate `params.notificationId` using `NotificationIdSchema`.
*   [ ] **(Optional) Parse & Validate Body:** If `NotificationMarkReadSchema` requires `is_read: true`, parse and validate the body.
*   [ ] **Update Notification:**
    *   [ ] Create Supabase client.
    *   [ ] Update: `const { data, error, count } = await supabase .from('notifications') .update({ is_read: true }) .eq('id', validatedNotificationId) .eq('recipient_profile_id', staffProfileId) // *** Crucial: Ensure user can only update their own notifications *** .select('id') .maybeSingle();`
*   [ ] **Handle Response & Errors:**
    *   [ ] Handle DB errors (500).
    *   [ ] If `data` is null (and no error), the notification wasn't found or didn't belong to the user. Return 404 Not Found.
    *   [ ] If successful, return 200 OK with the updated notification ID or just status 200/204.
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Refinement and Testing

*   [ ] **Review Code:** Check consistency, error handling, authorization logic.
*   [ ] **Notification Triggers:** Ensure all desired events correctly call the notification generation utilities.
*   [ ] **RLS Policies:** Verify `notifications` table RLS allows Client Staff to select/update only rows where `recipient_profile_id` matches their own `auth.uid()`.
*   [ ] **Test Generation:** Trigger events (e.g., update a module assigned to a client with staff) and verify notifications are created for the correct Client Staff in the `notifications` table.
*   [ ] **Test API Endpoints (as Client Staff):**
    *   Verify `GET` retrieves only the logged-in staff's notifications.
    *   Verify `GET` filters (read/unread, limit) work.
    *   Verify `PATCH` successfully marks a notification as read.
    *   Verify `PATCH` fails (404/403) when trying to mark a notification belonging to another user.
    *   Verify `PATCH` fails for invalid notification IDs.
*   [ ] **Check Supabase Logs.** 