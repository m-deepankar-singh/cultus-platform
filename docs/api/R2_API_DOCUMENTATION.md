# Cloudflare R2 Storage API Documentation

This document provides comprehensive documentation for the R2 storage API endpoints implemented for the Cultus Platform.

## Overview

The R2 storage system provides secure file upload, download, and management capabilities using Cloudflare R2 with a backend-mediated upload pattern for enhanced security and control.

### Architecture
- **Public Bucket**: `cultus-public-assets` - For client logos, product images, course materials
- **Private Bucket**: `cultus-private-submissions` - For interview recordings and student submissions
- **Authentication**: JWT-based authentication with role-based authorization
- **Upload Pattern**: Backend-mediated with presigned URLs for secure client-side uploads

## Endpoints

### 1. Upload URL Generation

**Endpoint**: `POST /api/r2/upload-url`

Generates presigned URLs for secure file uploads to R2 storage.

#### Authentication
- **Required**: Yes (JWT Bearer token)
- **Roles**: Admin only (currently restricted)

#### Request Body
```typescript
{
  file_name: string;        // Required: Original filename
  file_type: string;        // Required: MIME type (e.g., "image/png")
  file_size: number;        // Required: File size in bytes
  upload_type: 'client-logo' | 'product-image' | 'course-material' | 'interview-recording' | 'student-submission';
  target_id?: string;       // Optional: Associated record ID
}
```

#### Response
```typescript
{
  success: true;
  data: {
    upload_url: string;     // Presigned upload URL (expires in 5 minutes)
    public_url?: string;    // Public access URL (only for public bucket)
    object_key: string;     // S3 object key/path
    bucket: string;         // Target bucket name
    expires_at: string;     // ISO timestamp when upload URL expires
    upload_instructions: {
      method: "PUT";
      headers: {
        "Content-Type": string;
      };
    };
  };
}
```

#### File Type Validation
- **client-logo**: `image/jpeg`, `image/png`, `image/gif`, `image/webp` (max 5MB)
- **product-image**: `image/jpeg`, `image/png`, `image/gif`, `image/webp` (max 10MB)
- **course-material**: `application/pdf`, `image/*`, `video/*` (max 100MB)
- **interview-recording**: `video/mp4`, `video/webm`, `audio/mp3`, `audio/wav` (max 500MB)
- **student-submission**: Various types (max 50MB)

#### Example Request
```bash
curl -X POST http://localhost:3000/api/r2/upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "file_name": "company-logo.png",
    "file_type": "image/png",
    "file_size": 1024000,
    "upload_type": "client-logo"
  }'
```

#### Example Upload to Presigned URL
```bash
curl -X PUT "PRESIGNED_UPLOAD_URL" \
  -H "Content-Type: image/png" \
  --data-binary @company-logo.png
```

---

### 2. File Deletion

**Endpoint**: `DELETE /api/r2/delete`

Permanently deletes files from R2 storage.

#### Authentication
- **Required**: Yes (JWT Bearer token)
- **Roles**: Admin only

#### Request Body
```typescript
{
  object_key: string;                                    // Required: S3 object key to delete
  bucket?: 'cultus-public-assets' | 'cultus-private-submissions'; // Optional: Target bucket
  force_delete?: boolean;                                // Optional: Force delete (for future soft delete)
}
```

#### Response
```typescript
{
  success: true;
  data: {
    object_key: string;     // Deleted object key
    bucket: string;         // Bucket where file was deleted
    deleted_at: string;     // ISO timestamp of deletion
    deleted_by: string;     // User ID who performed deletion
  };
}
```

#### Example Request
```bash
curl -X DELETE http://localhost:3000/api/r2/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "object_key": "client-logo/1750181601700_company-logo.png"
  }'
```

---

### 3. Private File Access

**Endpoint**: `POST /api/r2/private-url`

Generates time-limited download URLs for private files.

#### Authentication
- **Required**: Yes (JWT Bearer token)
- **Roles**: Admin, Staff, Student (with ownership verification)

#### Request Body
```typescript
{
  object_key: string;       // Required: S3 object key for private file
  expires_in?: number;      // Optional: URL expiration in seconds (60-86400, default 3600)
  purpose?: string;         // Optional: Purpose for audit logging
}
```

#### Response
```typescript
{
  success: true;
  data: {
    download_url: string;   // Presigned download URL
    object_key: string;     // Object key
    expires_at: string;     // ISO timestamp when URL expires
    expires_in: number;     // Seconds until expiration
    purpose: string;        // Purpose for download
  };
}
```

#### Authorization Rules
- **Admin**: Can access any private file
- **Staff**: Can access interview recordings and student submissions
- **Student**: Can only access their own files (ownership verification)

#### Example Request
```bash
curl -X POST http://localhost:3000/api/r2/private-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "object_key": "interview-recording/user123/session456.mp4",
    "expires_in": 7200,
    "purpose": "interview review"
  }'
```

---

### 4. File Metadata

**Endpoint**: `GET /api/r2/metadata` or `POST /api/r2/metadata`

Retrieves metadata for files or performs batch metadata operations.

#### Authentication
- **Required**: Yes (JWT Bearer token)
- **Roles**: Admin, Staff

#### Single File Metadata (GET)

**Query Parameters**:
- `object_key`: Required - S3 object key
- `bucket`: Optional - Target bucket (defaults to public)

**Example**:
```bash
curl "http://localhost:3000/api/r2/metadata?object_key=client-logo/1750181601700_company-logo.png&bucket=cultus-public-assets" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Batch Metadata (POST)

**Request Body**:
```typescript
{
  object_keys: string[];    // Array of object keys (max 50)
  bucket?: string;          // Target bucket
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    fileName: string;
    fileSize: number;       // Size in bytes
    fileType: string;       // MIME type
    bucket: string;
    objectKey: string;
    lastModified?: string;  // ISO timestamp
    etag?: string;          // File ETag
    public_url?: string;    // Public URL if in public bucket
  };
}
```

---

### 5. Health Checks

Each service provides health check endpoints:

- `GET /api/r2/upload-url` - Upload service health
- `GET /api/r2/delete` - Delete service health  
- `GET /api/r2/private-url` - Private URL service health
- `OPTIONS /api/r2/metadata` - Metadata service health

## Error Responses

All endpoints return standardized error responses:

```typescript
{
  success: false;
  error: string;            // Human-readable error message
  code: string;             // Machine-readable error code
  details?: any;            // Additional error details (validation errors, etc.)
}
```

### Common Error Codes
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid request data
- `FILE_NOT_FOUND` - Requested file doesn't exist
- `FILE_VALIDATION_ERROR` - File type/size validation failed
- `DELETE_FAILED` - File deletion failed
- `URL_GENERATION_FAILED` - Failed to generate presigned URL
- `INTERNAL_ERROR` - Server error

## Security Features

### Authentication & Authorization
- JWT-based authentication for all endpoints
- Role-based access control (Admin > Staff > Student)
- File ownership verification for private files
- Audit logging for all operations

### File Validation
- MIME type validation per upload type
- File size limits per upload type
- Organized folder structure with timestamps
- Conflict resolution for duplicate filenames

### URL Security
- Time-limited presigned URLs (5 minutes for uploads, configurable for downloads)
- Separate public/private bucket strategy
- Secure presigned URL generation with AWS Signature Version 4

## Upload Flow

1. **Client requests upload URL** → `POST /api/r2/upload-url`
2. **Server validates request** → File type, size, user authorization
3. **Server generates presigned URL** → Returns upload URL and metadata
4. **Client uploads directly to R2** → `PUT` to presigned URL
5. **Server updates database** → Store file metadata (when database schema is implemented)

## Best Practices

### For Frontend Development
- Always validate files on client-side before requesting upload URLs
- Handle upload progress and errors gracefully
- Use the returned public_url for displaying public files
- Implement retry logic for failed uploads

### For Backend Integration
- Store object_key in database for file references
- Implement proper cleanup for orphaned files
- Use batch operations for multiple file metadata requests
- Implement audit trails for file access and deletion

### Security Considerations
- Never expose presigned URLs in client-side code longer than necessary
- Implement rate limiting for file uploads per user
- Regular cleanup of expired upload URLs
- Monitor and log all file operations for security audit

## Future Enhancements

### Planned Features
- Soft delete with recovery period
- File version management
- Batch upload operations
- Advanced search and filtering
- Storage analytics and reporting
- CDN integration for better performance
- Image optimization and resizing
- Virus scanning integration

### Database Integration
- File uploads tracking table
- File ownership and permissions
- Access audit logs
- Storage usage analytics

## Troubleshooting

### Common Issues
1. **Upload URL expired** - Regenerate upload URL (5-minute expiration)
2. **File too large** - Check file size limits per upload type
3. **Invalid file type** - Verify MIME type is allowed for upload type
4. **Access denied** - Verify user role and file ownership
5. **File not found** - Check object_key format and bucket

### Debug Endpoints
Use health check endpoints to verify service status and connectivity.

---

*This documentation covers Phase 3 (Feature-specific Backend) of the Cloudflare R2 migration plan. For implementation details, see the source code in `/app/api/r2/` directory.* 