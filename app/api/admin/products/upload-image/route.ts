import { NextRequest, NextResponse } from 'next/server';
import { uploadService } from '@/lib/r2/simple-upload-service';
import { UploadError } from '@/lib/r2/upload-errors';
import { authenticateApiRequestWithRateLimitSecure } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // JWT-based authentication with rate limiting (bandwidth protection)
    const authResult = await authenticateApiRequestWithRateLimitSecure(
      request,
      ['Admin', 'Staff'],
      RATE_LIMIT_CONFIGS.UPLOAD_IMAGE
    );
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
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

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    
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