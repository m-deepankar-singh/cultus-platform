# Medium Priority Security Implementation Plan

**Date:** 2025-07-09  
**Based on:** Security Report 2025-07-09  
**Target Completion:** 2 weeks  
**Priority Level:** Medium

## Overview
This plan addresses 5 medium priority security issues from the security audit:
1. **Content Sanitization** (XSS Prevention)
2. **Request Body Size Limits** (DoS Prevention) 
3. **Error Message Sanitization** (Information Disclosure Prevention)
4. **Console Log Cleanup** (Sensitive Data Exposure Prevention)
5. **CORS Configuration** (Cross-Origin Security)

## Implementation Timeline: 2 weeks

---

## Phase 1: Content Sanitization (Days 1-3)

### **Issue Assessment**
- **Risk Level**: Medium-High (XSS vulnerabilities)
- **Scope**: Limited XSS risk found, only 1 `dangerouslySetInnerHTML` usage
- **Key Targets**: Project submissions, admin review forms, assessment content

### **Implementation Steps**

#### Day 1: Setup DOMPurify Infrastructure
1. **Install sanitization library**
   ```bash
   pnpm add dompurify @types/dompurify
   ```

2. **Create sanitization utility** (`lib/security/sanitization.ts`)
   - Implement `sanitizeContent()` for general content
   - Implement `sanitizeQuizAnswer()` for quiz responses
   - Implement `sanitizeProjectSubmission()` for project content
   - Add configurable allowed tags/attributes per content type

#### Day 2: Apply to User Input Endpoints
- **Project Submissions**: `/api/app/job-readiness/projects/submit/route.ts`
- **Quiz Submissions**: Quiz answer processing endpoints
- **Assessment Content**: Admin review interfaces
- **Bulk Upload**: Admin learner upload processing

#### Day 3: Frontend Sanitization
- **Admin Interfaces**: User-generated content display
- **Review Components**: Project and assessment review forms
- **Search Results**: Any user content in search displays

---

## Phase 2: Request Body Size Limits (Days 4-5)

### **Issue Assessment**
- **Current State**: No global request size limits, only application-level validation
- **Risk**: Memory exhaustion via large payloads
- **Targets**: 500MB file uploads, large project submissions

### **Implementation Steps**

#### Day 4: Middleware-Level Size Limits
1. **Update middleware.ts** 
   - Add global request size validation before processing
   - Implement early termination for oversized requests
   - Add size-based rate limiting

2. **API Route Configurations**
   - Add `maxDuration` exports for long-running operations
   - Configure per-endpoint size limits
   - Set up memory monitoring for video processing

#### Day 5: Application-Level Enhancements
- **File Upload Validation**: Enhanced size checking with streaming validation
- **Project Submission Limits**: Hard caps on text content length
- **Memory Usage Optimization**: Streaming for large file processing

---

## Phase 3: Error Message Sanitization (Days 6-9)

### **Issue Assessment**  
- **Critical Finding**: 231 files with console logging, 61+ files exposing database errors
- **Risk**: Information disclosure, database schema exposure
- **Scope**: System-wide error handling overhaul needed

### **Implementation Steps**

#### Day 6: Error Sanitization Infrastructure
1. **Create error handling utilities** (`lib/security/error-handling.ts`)
   - Environment-aware error sanitization
   - Production error message mapping
   - Development vs production error responses

2. **Create logging utility** (`lib/logging/secure-logger.ts`)
   - Environment-aware logging
   - Sensitive data filtering
   - Structured logging for security monitoring

#### Day 7-8: API Route Error Handling
- **Authentication Endpoints**: Sanitize auth error messages
- **Database Error Responses**: Remove Supabase error details
- **Stack Trace Removal**: Prevent internal path exposure
- **Generic Error Messages**: Implement user-friendly error responses

#### Day 9: Frontend Error Handling
- **Error Boundary Updates**: Sanitized error display
- **Form Error Messages**: Remove technical details
- **API Error Processing**: Client-side error sanitization

---

## Phase 4: Console Log Cleanup (Days 10-12)

### **Issue Assessment**
- **Scope**: 231 files with console statements 
- **Risk**: Sensitive data exposure in production logs
- **Priority**: System-wide logging standardization

### **Implementation Steps**

#### Day 10: Logging Infrastructure
1. **Implement secure logger** (from Day 6)
2. **Environment-based log levels**
3. **Sensitive data filtering patterns**

#### Day 11-12: Console Statement Replacement
- **API Routes**: Replace all console.log/error statements (100+ files)
- **Components**: Update frontend logging (100+ files) 
- **Utilities**: Library and helper function logging
- **Automated tooling**: Script to detect remaining console statements

---

## Phase 5: CORS Configuration (Days 13-14)

### **Issue Assessment**
- **Current State**: No explicit CORS configuration
- **Risk**: Cross-origin attacks, unauthorized API access
- **Scope**: API-wide CORS policy implementation

### **Implementation Steps**

#### Day 13: CORS Infrastructure
1. **Create CORS utility** (`lib/security/cors.ts`)
   - Environment-based allowed origins
   - Proper credential handling
   - Security header management

2. **API Route Integration**
   - Add CORS headers to all API responses
   - Handle preflight OPTIONS requests
   - Configure per-endpoint CORS policies

#### Day 14: Testing & Validation
- **CORS Policy Testing**: Verify cross-origin restrictions
- **Security Header Validation**: Check proper header implementation  
- **Integration Testing**: End-to-end security validation

---

## Security Research Findings

### **Content Sanitization Assessment**
- **XSS Risk**: Low-Medium (only 1 `dangerouslySetInnerHTML` usage found)
- **User Input Endpoints Identified**:
  - Assessment & Quiz Submissions: 2 major endpoints
  - Project Submissions: Large text content (up to 5MB)
  - File Uploads: Multiple admin and user upload endpoints
  - Admin Forms: Bulk upload and user management

### **Request Size Limit Assessment**
- **Current Configurations**:
  - Next.js Server Actions: 1MB limit
  - R2 Uploads: 500MB default limit
  - No global API route size limits
- **High-Risk Endpoints**:
  - Video uploads (500MB)
  - Project submissions (large text content)
  - Bulk data operations

### **Error Message Exposure Assessment**
- **Critical Findings**:
  - 231 files with console logging
  - 61+ files exposing database error details
  - Supabase errors directly returned to clients
  - Stack traces exposed in error responses
- **Information Disclosure Risks**:
  - Database schema information
  - Internal file paths
  - Authentication system details

### **Console Logging Assessment**
- **Scope**: 231 files with console statements
- **Risk Areas**:
  - API routes exposing sensitive data
  - Authentication flows with user details
  - Database query logging
  - File processing with content exposure

### **CORS Configuration Assessment**
- **Current State**: No explicit CORS policies
- **Missing Protections**:
  - Cross-origin request validation
  - Credential handling policies
  - Preflight request handling

---

## Key Implementation Details

### **Priority Order**
1. **Error Message Sanitization** (Highest impact - prevents information disclosure)
2. **Content Sanitization** (XSS prevention)
3. **Request Size Limits** (DoS prevention) 
4. **Console Log Cleanup** (Data exposure prevention)
5. **CORS Configuration** (Cross-origin security)

### **Risk Mitigation**
- **Incremental Rollout**: Deploy changes gradually with monitoring
- **Feature Flags**: Environment-based toggles for new security features
- **Rollback Plan**: Keep original error handling as fallback
- **Performance Monitoring**: Track impact of sanitization on response times

### **Success Metrics**
- **Zero Information Disclosure**: No database errors exposed to clients
- **XSS Prevention**: All user content properly sanitized
- **Performance Impact**: <50ms additional latency for sanitization
- **Log Cleanliness**: No sensitive data in production logs
- **CORS Compliance**: Proper cross-origin access controls

### **Testing Requirements**
- **Security Testing**: XSS injection attempts, oversized requests
- **Error Handling Testing**: Verify sanitized error responses
- **Performance Testing**: Impact of sanitization on response times
- **Integration Testing**: End-to-end security workflow validation

## Environment Variables Required

Add these to your environment configuration:

```bash
# .env.local
NODE_ENV=production  # Ensure proper environment detection
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://staging.yourdomain.com
MAX_REQUEST_SIZE=10485760  # 10MB default
ENABLE_DETAILED_ERRORS=false  # For production
LOG_LEVEL=error  # Production logging level
```

## Files to be Created

1. `lib/security/sanitization.ts` - Content sanitization utilities
2. `lib/security/error-handling.ts` - Error message sanitization
3. `lib/security/cors.ts` - CORS configuration utilities
4. `lib/logging/secure-logger.ts` - Secure logging implementation
5. `scripts/find-console-logs.ts` - Console statement detection tool

## Files to be Modified

### **High Priority** (Error Sanitization):
- All API routes in `/app/api/` (100+ files)
- Authentication handlers in `/lib/auth/`
- Database interaction utilities

### **Medium Priority** (Content Sanitization):
- User input processing endpoints
- Admin review interfaces
- File upload handlers

### **System-wide** (Console Cleanup):
- 231 files containing console statements
- Frontend components with logging
- Utility libraries

## Performance Impact Assessment

- **Content Sanitization**: ~10-20ms per request with large content
- **Error Sanitization**: ~1-2ms per request (minimal impact)
- **Request Size Validation**: ~5ms per request (early termination benefits)
- **CORS Headers**: <1ms per request (negligible impact)
- **Logging Changes**: Improved performance (reduced I/O in production)

## Compliance Alignment

This plan addresses:
- **OWASP Top 10 2021**: A03 (Injection), A05 (Security Misconfiguration), A06 (Vulnerable Components)
- **GDPR**: Data protection through proper error handling
- **SOC 2**: Security controls and audit trails
- **ISO 27001**: Information security management

---

*Medium Priority Security Implementation Plan v1.0 - Cultus Platform Team*  
*Implementation ready: Yes*  
*Risk level: Medium*  
*Security impact: High*