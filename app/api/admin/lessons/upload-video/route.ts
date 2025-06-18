import { NextRequest, NextResponse } from 'next/server';
import { uploadService } from '@/lib/r2/simple-upload-service';
import { UploadError } from '@/lib/r2/upload-errors';

export async function POST(request: NextRequest) {
  try {
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

    const key = uploadService.generateKey('lessons/videos', file.name);
    
    // Upload file with validation
    const result = await uploadService.uploadFile(
      file, 
      key, 
      file.type,
      {
        allowedTypes: ['video/*'],
        maxSize: 500 * 1024 * 1024, // 500MB for videos
        minSize: 1024 // 1KB minimum
      }
    );

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error('Lesson video upload error:', error);
    
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