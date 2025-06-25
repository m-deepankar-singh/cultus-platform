import { PresignedUploadResult, UploadConfig } from './presigned-upload-service';

// Check if we're running in Cloudflare Workers
const isCloudflareWorkers = typeof globalThis !== 'undefined' && 'R2_BUCKET' in globalThis;

export async function generatePresignedUploadUrlWorkers(
  filename: string,
  contentType: string,
  config: UploadConfig
): Promise<PresignedUploadResult> {
  // If we're in Cloudflare Workers, use R2 bindings for better performance
  if (isCloudflareWorkers && typeof globalThis.R2_BUCKET !== 'undefined') {
    return generateWithR2Binding(filename, contentType, config);
  }
  
  // Fallback to AWS SDK approach (for Vercel and local development)
  const { generatePresignedUploadUrl } = await import('./presigned-upload-service');
  return generatePresignedUploadUrl(filename, contentType, config);
}

async function generateWithR2Binding(
  filename: string,
  contentType: string,
  config: UploadConfig
): Promise<PresignedUploadResult> {
  // Generate unique key
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${config.keyPrefix}/${timestamp}_${randomString}_${sanitizedFilename}`;

  // Validate content type
  const isValidType = config.allowedTypes.some(type => 
    type.endsWith('/*') 
      ? contentType.startsWith(type.slice(0, -2))
      : contentType === type
  );

  if (!isValidType) {
    throw new Error(`Invalid file type: ${contentType}. Allowed: ${config.allowedTypes.join(', ')}`);
  }

  const expiresIn = config.expiresInSeconds || 300; // 5 minutes default

  try {
    // Use Cloudflare Workers R2 binding
    const r2Bucket = globalThis.R2_BUCKET as R2Bucket;
    
    // Generate presigned URL using R2 binding
    const uploadUrl = await r2Bucket.createPresignedUrl('PUT', key, {
      expiresIn,
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        'uploaded-by': 'cultus-platform',
        'max-size': config.maxSizeBytes.toString(),
        'upload-timestamp': timestamp.toString(),
      },
    });

    // Generate public URL
    const publicUrl = `https://${config.bucket}.${process.env.R2_ACCOUNT_ID || 'your-account'}.r2.dev/${key}`;

    console.log('Generated URLs with R2 binding:', {
      uploadUrl: uploadUrl.substring(0, 100) + '...',
      publicUrl,
      key
    });

    return {
      uploadUrl,
      publicUrl,
      key,
      bucket: config.bucket,
      expiresIn,
    };
  } catch (error) {
    console.error('Error generating presigned URL with R2 binding:', error);
    throw error;
  }
}

// Type definition for R2 binding (for TypeScript)
declare global {
  var R2_BUCKET: R2Bucket;
}

interface R2Bucket {
  createPresignedUrl(
    method: string,
    key: string,
    options: {
      expiresIn: number;
      httpMetadata?: {
        contentType: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<string>;
} 