import { NextRequest, NextResponse } from 'next/server';
import { uploadService } from '@/lib/r2/simple-upload-service';
import { UploadError, ValidationError } from '@/lib/r2/upload-errors';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    
    if (!file) {
      return NextResponse.json(
        { 
          error: 'No file provided',
          code: 'NO_FILE_PROVIDED'
        },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { 
          error: 'Session ID is required',
          code: 'MISSING_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Validate session ID format (simple validation)
    if (!/^[a-zA-Z0-9-_]+$/.test(sessionId)) {
      return NextResponse.json(
        { 
          error: 'Invalid session ID format',
          code: 'INVALID_SESSION_ID'
        },
        { status: 400 }
      );
    }

    // Generate key with session ID for organization
    const key = uploadService.generateKey(`expert-sessions/${sessionId}`, file.name);
    
    // Upload file with validation
    const result = await uploadService.uploadFile(
      file, 
      key, 
      file.type,
      {
        allowedTypes: ['video/*'],
        maxSize: 500 * 1024 * 1024, // 500MB for expert session videos
        minSize: 1024 // 1KB minimum
      }
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error('Expert session video upload error:', error);
    
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