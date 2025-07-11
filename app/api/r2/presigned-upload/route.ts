import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { generatePresignedUploadUrl, UPLOAD_CONFIGS } from '@/lib/r2/presigned-upload-service';
import { z } from 'zod';

const requestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  uploadType: z.enum(['expertSessions', 'lessonVideos', 'interviewRecordings']),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateApiRequestSecure(['Admin', 'student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { filename, contentType, uploadType, metadata } = requestSchema.parse(body);

    // Get upload configuration
    const config = UPLOAD_CONFIGS[uploadType];
    if (!config) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    // For expert sessions and lessons, require admin role
    if (['expertSessions', 'lessonVideos'].includes(uploadType)) {
      const { user, supabase } = authResult;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role?.toLowerCase() !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    // Check environment variables
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      console.error('Missing R2 credentials (R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY)');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (!process.env.R2_ENDPOINT && !process.env.R2_ACCOUNT_ID) {
      console.error('Missing R2 endpoint configuration (R2_ENDPOINT or R2_ACCOUNT_ID)');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Generate presigned URL
    const result = await generatePresignedUploadUrl(filename, contentType, config);

    return NextResponse.json({
      success: true,
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      key: result.key,
      bucket: result.bucket,
      expiresIn: result.expiresIn,
      metadata: {
        filename,
        contentType,
        uploadType,
        maxSize: config.maxSizeBytes,
        ...metadata,
      },
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }

    // Enhanced error logging
    return NextResponse.json({ 
      error: 'Failed to generate upload URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 