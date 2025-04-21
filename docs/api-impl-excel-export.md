# Detailed Implementation Plan: Excel Export API

This document provides a step-by-step guide for implementing the **Excel Export API** endpoints for downloading progress data.

**Target Roles:** Admin, Staff, Client Staff
**Base Routes:** `/api/[role]/progress/export` (e.g., `/api/admin/progress/export`)

**Prerequisites:**

*   Supabase project set up.
*   Relevant data tables exist: `profiles`, `clients`, `products`, `modules`, `course_progress`, `assessment_progress`.
*   RLS policies configured for these tables, allowing appropriate read access based on role (Admin: all, Staff: scoped by client, Client Staff: own client).
*   Next.js project with App Router, TypeScript, Zod, Supabase SSR helper installed.
*   `exceljs` library installed: `npm install exceljs` and `npm install -D @types/exceljs`.
*   Utility functions for Supabase server clients and getting user session/profile/role exist.
*   Zod schemas for `ClientIdSchema`, `ProductIdSchema`, `StudentIdSchema` exist.

**Design Notes:**

*   Each role will have its own endpoint to handle specific data scoping.
*   A shared utility function will handle the actual Excel generation from data.
*   Query parameters will allow filtering the exported data.
*   The response will set headers to trigger a file download in the browser.

---

## 1. Define Zod Schemas

*   **File:** `lib/schemas/export.ts` (Create if needed)

*   [ ] **Create File/Imports:** Create `lib/schemas/export.ts` and import `zod`.
*   [ ] **Define `ProgressExportQuerySchema`:**
    ```typescript
    import { z } from 'zod';

    export const ProgressExportQuerySchema = z.object({
      clientId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
      moduleId: z.string().uuid().optional(),
      studentId: z.string().uuid().optional(),
      // Add date range filters if needed
      // startDate: z.string().datetime().optional(),
      // endDate: z.string().datetime().optional(),
    });
    ```
*   [ ] **Export Schema.**

---

## 2. Create Excel Generation Utility

*   **File:** `lib/utils/export.ts` (Create if needed)

*   [ ] **Create File/Imports:**
    ```typescript
    import ExcelJS from 'exceljs';
    ```
*   [ ] **Define `generateProgressExcel` Function:**
    ```typescript
    // Define an interface for the expected data structure
    interface ProgressRecord {
      studentName: string;
      studentEmail: string;
      clientName: string;
      productName: string;
      moduleName: string;
      moduleType: 'Course' | 'Assessment';
      status?: string; // e.g., course status
      progressPercentage?: number | null;
      score?: number | null; // e.g., assessment score
      completedAt?: string | null;
      submittedAt?: string | null;
      // Add other relevant fields
    }

    export async function generateProgressExcel(data: ProgressRecord[]): Promise<Buffer> {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Upskilling Platform';
      workbook.lastModifiedBy = 'Upskilling Platform';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('Progress Report');

      // Define Columns (adjust based on ProgressRecord)
      worksheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 30 },
        { header: 'Student Email', key: 'studentEmail', width: 30 },
        { header: 'Client', key: 'clientName', width: 25 },
        { header: 'Product', key: 'productName', width: 30 },
        { header: 'Module', key: 'moduleName', width: 30 },
        { header: 'Module Type', key: 'moduleType', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Progress %', key: 'progressPercentage', width: 15, style: { numFmt: '0%' } },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Completed At', key: 'completedAt', width: 20 },
        { header: 'Submitted At', key: 'submittedAt', width: 20 },
      ];

      // Style Header Row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Data Rows
      data.forEach(record => {
        worksheet.addRow({
          ...record,
          // Format dates if they are Date objects or ISO strings
          completedAt: record.completedAt ? new Date(record.completedAt).toLocaleString() : null,
          submittedAt: record.submittedAt ? new Date(record.submittedAt).toLocaleString() : null,
          progressPercentage: record.progressPercentage != null ? record.progressPercentage / 100 : null,
        });
      });

      // Auto-filter
      worksheet.autoFilter = { from: 'A1', to: `${worksheet.lastColumn.letter}1` };

      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer as Buffer;
    }
    ```
*   [ ] **Refine `ProgressRecord` Interface:** Adjust the interface and worksheet columns to match the exact data fields required in the export.
*   [ ] **Export Function.**

---

## 3. Implement Export Endpoints (`/api/[role]/progress/export`)

*   **Approach:** Create separate route files for each role, but much of the data fetching and formatting logic might be reusable.

### 3.1 Data Fetching and Formatting (Conceptual Helper)

*   [ ] **Create Data Fetching Utility (e.g., `lib/data/progress.ts`):**
    *   Define an async function `fetchProgressDataForExport` that takes `supabase` client, `role`, `userProfile` (for scoping), and validated `filters` (from `ProgressExportQuerySchema`) as input.
    *   Inside this function:
        *   **Determine Scope:** Based on `role` and `userProfile`, determine the list of `clientIds` and `studentIds` the user can access.
        *   **Build Base Query:** Start building a query joining `profiles`, `clients`, `modules`, `products`, `course_progress`, `assessment_progress`.
        *   **Apply Scoping:** Filter the query based on the determined `clientIds` / `studentIds`.
        *   **Apply Filters:** Add `WHERE` clauses based on the validated `filters` (clientId, productId, moduleId, studentId, date ranges).
        *   **Select Fields:** Select all necessary fields required for the `ProgressRecord` interface.
        *   **Execute Query.**
        *   **Format Results:** Map the raw database results into the `ProgressRecord[]` structure needed by `generateProgressExcel`.
        *   Return the formatted data array.

### 3.2 Implement `GET /api/admin/progress/export` (Admin Export)

*   **File:** `app/api/admin/progress/export/route.ts`
*   [ ] **Create File/Directory.**
*   [ ] **Imports:** `NextResponse`, `createClient`, `getUserSessionAndRole`, `ProgressExportQuerySchema`, `generateProgressExcel`, `fetchProgressDataForExport`.
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify session and role is 'Admin'.
*   [ ] **Parse & Validate Query Params:** Use `ProgressExportQuerySchema`.
*   [ ] **Fetch Formatted Data:** `const progressData = await fetchProgressDataForExport(supabase, 'Admin', profile, validatedFilters);`
*   [ ] **Generate Excel Buffer:** `const buffer = await generateProgressExcel(progressData);`
*   [ ] **Return Response:**
    ```typescript
    const filename = `progress_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    ```
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.3 Implement `GET /api/staff/progress/export` (Staff Export)

*   **File:** `app/api/staff/progress/export/route.ts`
*   [ ] **Create File/Directory.**
*   [ ] **Imports:** (Similar to Admin)
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify session and role is 'Staff' (or 'Admin'). Get profile.
*   [ ] **Parse & Validate Query Params.**
*   [ ] **Fetch Formatted Data:** `const progressData = await fetchProgressDataForExport(supabase, 'Staff', profile, validatedFilters);` (The helper function handles Staff scoping).
*   [ ] **Generate Excel Buffer:** `const buffer = await generateProgressExcel(progressData);`
*   [ ] **Return Response:** (Identical headers and status code as Admin).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

### 3.4 Implement `GET /api/client-staff/progress/export` (Client Staff Export)

*   **File:** `app/api/client-staff/progress/export/route.ts`
*   [ ] **Create File/Directory.**
*   [ ] **Imports:** (Similar to Admin/Staff)
*   [ ] **Define `GET` Handler:** `export async function GET(request: Request) { ... }`
*   [ ] **Authentication & Authorization:** Verify session and role is 'Client Staff' (or 'Admin'). Get profile.
*   [ ] **Parse & Validate Query Params.**
*   [ ] **Fetch Formatted Data:** `const progressData = await fetchProgressDataForExport(supabase, 'Client Staff', profile, validatedFilters);` (Helper handles Client Staff scoping).
*   [ ] **Generate Excel Buffer:** `const buffer = await generateProgressExcel(progressData);`
*   [ ] **Return Response:** (Identical headers and status code as Admin).
*   [ ] **Add Error Handling:** Wrap in `try...catch`.

---

## 4. Refinement and Testing

*   [ ] **Review Code:** Check consistency, error handling, security (data scoping), header correctness.
*   [ ] **Data Fetching Logic:** Thoroughly test `fetchProgressDataForExport` to ensure correct joins, filtering, and data formatting for all roles.
*   [ ] **Excel Formatting:** Open generated files to verify columns, headers, data types, and formatting (dates, percentages).
*   [ ] **Test Each Role Endpoint:**
    *   Verify Admins can export all data and filters work.
    *   Verify Staff can export only data for their assigned client(s) and filters work within that scope.
    *   Verify Client Staff can export only data for their specific client and filters work within that scope.
*   [ ] **Test Filters:** Test combinations of query parameter filters (`clientId`, `productId`, `studentId`, etc.).
*   [ ] **Test Empty Results:** Ensure an empty but valid Excel file is generated if no data matches the criteria.
*   [ ] **Test Large Datasets:** Assess performance for large exports. Consider adding limits or suggesting filters if performance degrades significantly.
*   [ ] **Check Supabase RLS:** Ensure RLS doesn't unexpectedly block data needed for the exports (especially if using complex joins in the helper function).
*   [ ] **Check Supabase Logs.** 