import { NextRequest, NextResponse } from 'next/server';
import { uploadService } from '@/lib/r2/simple-upload-service';
import { UploadError } from '@/lib/r2/upload-errors';
import { authenticateApiRequestWithRateLimitSecure } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { securityLogger, SecurityEventType, SecuritySeverity, SecurityCategory } from '@/lib/security';

export async function POST(request: NextRequest) {
  // Log product image upload attempt
  securityLogger.logEvent({
    eventType: SecurityEventType.FILE_UPLOAD,
    severity: SecuritySeverity.INFO,
    category: SecurityCategory.FILE_OPERATIONS,
    endpoint: '/api/admin/products/upload-image',
    method: 'POST',
    details: {
      uploadType: 'product_image',
      stage: 'attempt'
    }
  }, request);

  try {
    // JWT-based authentication with rate limiting (bandwidth protection)
    const authResult = await authenticateApiRequestWithRateLimitSecure(
      request,
      ['Admin', 'Staff'],
      RATE_LIMIT_CONFIGS.UPLOAD_IMAGE
    );
    if ('error' in authResult) {
      securityLogger.logEvent({
        eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.AUTHORIZATION,
        endpoint: '/api/admin/products/upload-image',
        method: 'POST',
        details: {
          uploadType: 'product_image',
          error: authResult.error
        }
      }, request);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      securityLogger.logEvent({
        eventType: SecurityEventType.FILE_UPLOAD,
        severity: SecuritySeverity.WARNING,
        category: SecurityCategory.FILE_OPERATIONS,
        userId: authResult.user.id,
        userRole: authResult.claims.user_role,
        endpoint: '/api/admin/products/upload-image',
        method: 'POST',
        details: {
          uploadType: 'product_image',
          error: 'No file provided',
          stage: 'validation_failed'
        }
      }, request);
      return NextResponse.json(
        { 
          error: 'No file provided',
          code: 'NO_FILE_PROVIDED'
        },
        { status: 400 }
      );
    }

    // Generate unique key
    const key = uploadService.generateKey('products', file.name);
    
    // Upload file with validation
    const result = await uploadService.uploadFile(
      file,
      key,
      file.type,
      {
        allowedTypes: ['image/*'],
        maxSize: 5 * 1024 * 1024, // 5MB
        minSize: 100 // 100 bytes minimum
      }
    );

    securityLogger.logEvent({
      eventType: SecurityEventType.FILE_UPLOAD,
      severity: SecuritySeverity.INFO,
      category: SecurityCategory.FILE_OPERATIONS,
      userId: authResult.user.id,
      userRole: authResult.claims.user_role,
      endpoint: '/api/admin/products/upload-image',
      method: 'POST',
      details: {
        uploadType: 'product_image',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageKey: result.key,
        stage: 'success'
      }
    }, request);

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    
    securityLogger.logEvent({
      eventType: SecurityEventType.FILE_UPLOAD,
      severity: SecuritySeverity.CRITICAL,
      category: SecurityCategory.FILE_OPERATIONS,
      endpoint: '/api/admin/products/upload-image',
      method: 'POST',
      details: {
        uploadType: 'product_image',
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'failed'
      }
    }, request);
    
    if (error instanceof UploadError) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        error: 'Upload failed due to an unexpected error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
} 