# Learner Data Export to Excel - Implementation Plan

## Overview
This document outlines the tasks required to implement a feature that allows Admins and Staff to export learner data to an Excel file. The export can be filtered by client or include all learners. The exported data will include basic learner details such as name, email, and client information.

## 1. Project Setup & Reuse Existing Components
- [x] Leverage the existing `xlsx` library already used for bulk upload templates
- [x] Reuse authentication/authorization patterns from `bulk-upload-template/route.ts` and `bulk-upload/route.ts`
- [x] Follow the established API route structure and error handling pattern

## 2. Backend Development (API Endpoint: `/api/admin/learners/export`)

### 2.1. API Endpoint Definition
- [x] Create a new Next.js API route handler: `app/api/admin/learners/export/route.ts` following the pattern in `bulk-upload-template/route.ts`
- [x] Copy the authentication and authorization logic from existing endpoints
- [x] Reuse the query parameter parsing pattern for the `clientId` parameter
- [x] Utilize the same error handling structure for consistent responses

### 2.2. Data Fetching Logic
- [x] Reuse the Supabase client initialization pattern from existing endpoints
- [x] **Fetch Learner Data:**
    - [x] Use the same query pattern as in the bulk upload validation for fetching learners by client
    - [x] Include basic fields: id, full_name, email, phone_number, is_active, client_id, created_at, last_login_at
    - [x] Fetch client information to map client IDs to client names

### 2.3. Data Structuring for Excel
- [x] Follow the same data transformation pattern used in `bulk-upload-template/route.ts`
- [x] Define the column headers for the main sheet:
    - Learner Full Name
    - Learner Email
    - Learner Phone Number
    - Client Name
    - Learner Active Status
    - Enrollment Date
    - Last Login Date
- [x] Structure the Excel file with two sheets:
    - Main sheet with learner data
    - An instructions/legend sheet explaining the columns

### 2.4. Excel File Generation
- [x] Directly reuse the Excel generation code from `bulk-upload-template/route.ts`:
```typescript
const wb = utils.book_new();
const sheet = utils.json_to_sheet(transformedData);
utils.book_append_sheet(wb, sheet, "Learners");
const excelBuffer = write(wb, { bookType: 'xlsx', type: 'buffer' });
```
- [x] Copy the response headers and format from the template endpoint

### 2.5. Performance Optimization for Large Datasets
- [x] Implement batch processing to handle large numbers of records (up to 10,000):
    - [x] Add initial count query to determine total records
    - [x] Define batch size constant (e.g., 1,000 records per batch)
    - [x] Set maximum record limit to prevent server overload
    - [x] Process records in small batches to avoid memory issues
- [x] Add timeout handling to prevent long-running requests:
    - [x] Set a reasonable timeout (e.g., 2 minutes)
    - [x] Use AbortController to cancel the request if it takes too long
    - [x] Properly clean up resources in finally block
- [x] Optimize database queries:
    - [x] Use consistent ordering for reliable pagination
    - [x] Implement range-based pagination with .range()
    - [x] Fetch only necessary fields and tables

## 3. Frontend Development

### 3.1. UI Elements
- [x] **Export Button Component:**
    - [x] Adapt the `BulkUploadDialog` component structure to create a simpler `ExportButton` component
    - [x] Reuse the same button styling and icons for consistency
- [x] **Client Filter Integration:**
    - [x] Identify how client filtering is currently implemented in the learners view
    - [x] Reuse any existing client selection components or context
- [x] **Loading/Feedback Indicators:**
    - [x] Reuse the same loading state patterns and progress indicators from the bulk upload feature
    - [x] Leverage the existing toast notification system for feedback

### 3.2. Client Selection Modal
- [x] Create a new modal dialog component for client selection
    - [x] Create `ClientExportModal.tsx` component
    - [x] Include a dropdown or searchable list to select a specific client 
    - [x] Add an "All Clients" option for exporting all learner data
    - [x] Include clear action buttons: "Export" and "Cancel"
    - [x] Implement form validation if needed
- [x] Trigger the modal from the Export button instead of direct API call
- [x] Pass the selected client ID to the export API call

### 3.3. API Call and File Download Logic
- [x] Adapt the file handling logic from `bulk-upload-dialog.tsx` for the download process
- [x] Reuse the same error handling and toast notification patterns:
```typescript
try {
  // API call and download logic
  toast({
    title: "Export successful",
    description: "The data has been exported successfully."
  });
} catch (error) {
  console.error("Export error:", error);
  toast({
    variant: "destructive",
    title: "Export failed",
    description: error instanceof Error ? error.message : "Failed to export data",
  });
}
```

## 4. Integration and Reuse
- [x] Place the export button in the same location as the bulk upload button in `learners-header.tsx`
- [ ] Consider combining both actions into a dropdown menu if appropriate for the UI
- [x] Reuse any existing mechanisms for tracking operation states (loading, success, error)

## 5. Testing
- [ ] **Backend (API Route):**
    - [ ] Reuse the testing patterns established for the bulk upload endpoints
    - [ ] Copy the authentication/authorization tests and adapt them
    - [ ] Test with large datasets to verify pagination works
    - [ ] Test timeout handling and resource cleanup
- [ ] **Frontend:**
    - [ ] Follow the same component testing approach used for bulk upload UI elements
    - [ ] Add specific tests for the new client selection modal
- [ ] **End-to-End Testing:**
    - [ ] Utilize the same E2E testing pattern used for bulk upload if available
    - [ ] Test the complete flow from client selection to file download
    - [ ] Test with different client sizes (including large clients)

## 6. Documentation
- [x] Follow the existing API documentation format
- [ ] Update any relevant user guides using the same style and approach
- [ ] Document the client selection process in user guides
- [ ] Add notes about performance optimizations and limits in technical documentation

## 7. Follow-up Considerations (Post-MVP)
- [ ] Consider how the asynchronous processing pattern (if implemented for bulk uploads) could be applied to large exports
- [ ] Add additional filtering options (e.g., active status, date ranges)
- [x] Look for opportunities to create shared utility functions for both import and export Excel operations 