# Client Logo Implementation

This document tracks the implementation of client logo functionality in the admin panel.

## Completed Tasks

- [x] Create Supabase migration to add client_logo bucket with appropriate RLS policies
- [x] Create reusable file upload component for handling image uploads
- [x] Create helper functions for uploading files to Supabase storage
- [x] Update client form to include logo upload functionality
- [x] Update client detail component to display the logo
- [x] Update clients table to show logos in the client listing
- [x] Create validation schema for client logo uploads

## Implementation Plan

The client logo functionality allows admin and staff users to upload and manage logos for clients. The logos are stored in a dedicated Supabase storage bucket named `client_logo` and are displayed in the admin panel.

### Features

1. Upload a logo when creating or editing a client
2. Display the logo in the client detail view
3. Display the logo in the clients table list
4. Remove or replace the logo as needed
5. Proper validation for file size and type

### Relevant Files

- `supabase/migrations/20240710000000_create_client_logo_bucket.sql` - Migration to create the client_logo bucket
- `components/ui/file-upload.tsx` - Reusable file upload component
- `lib/supabase/upload-helpers.ts` - Helper functions for file uploads
- `app/actions/clientActions.ts` - Updated client actions to handle logo URLs
- `components/clients/client-form.tsx` - Updated form with logo upload functionality
- `components/clients/client-detail.tsx` - Updated to display client logo
- `components/clients/clients-table.tsx` - Updated to show logos in the client listing
- `lib/schemas/client-logo.ts` - Validation schema for client logo uploads

### Storage Structure

Client logos are stored in the `client_logo` bucket with the following path structure:
- For new clients: A UUID is generated as the filename (e.g., `123e4567-e89b-12d3-a456-426614174000.png`)
- For existing clients: The client ID is used as a folder path (e.g., `client-id/123e4567-e89b-12d3-a456-426614174000.png`)

### Security

- Only admin and staff users can upload, update, or delete client logos
- Anyone can view the logos (they are public)
- Files are validated for size (max 2MB) and type (only image formats allowed) 