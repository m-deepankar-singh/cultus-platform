import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  bucket: string;
  expiresIn: number;
}

export interface UploadConfig {
  bucket: string;
  keyPrefix: string;
  maxSizeBytes: number;
  allowedTypes: string[];
  expiresInSeconds?: number;
}

export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  config: UploadConfig
): Promise<PresignedUploadResult> {
  try {
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

    console.log('Generating presigned URL for:', {
      bucket: config.bucket,
      key,
      contentType,
      expiresIn
    });

    // FIRST_EDIT
    // Replace the existing r2Client initialization and env validation logic with flexible handling
    const accountId = process.env.R2_ACCOUNT_ID || (process.env.R2_ENDPOINT?.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/)?.[1]);

    const r2Endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (!r2Endpoint) {
      throw new Error('R2 endpoint is not configured. Set R2_ENDPOINT or R2_ACCOUNT_ID in env.');
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY env vars are missing');
    }

    const r2Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
      // Add metadata for validation
      Metadata: {
        'uploaded-by': 'cultus-platform',
        'max-size': config.maxSizeBytes.toString(),
        'upload-timestamp': timestamp.toString(),
      },
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { 
      expiresIn 
    });

    // Generate public URL - use the same domain structure as the upload URL for consistency
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
      : accountId
        ? `https://${config.bucket}.${accountId}.r2.cloudflarestorage.com/${key}`
        : `${r2Endpoint.replace(/\/$/, '')}/${key}`;

    console.log('Generated URLs:', {
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
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

// Predefined configurations for different upload types
export const UPLOAD_CONFIGS: Record<string, UploadConfig> = {
  expertSessions: {
    bucket: 'cultus-public-assets',
    keyPrefix: 'expert-sessions',
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/mov', 'video/*'],
    expiresInSeconds: 600, // 10 minutes for large uploads
  },
  lessonVideos: {
    bucket: 'cultus-public-assets',
    keyPrefix: 'lessons',
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/mov', 'video/*'],
    expiresInSeconds: 600, // 10 minutes
  },
  interviewRecordings: {
    bucket: 'cultus-public-assets',
    keyPrefix: 'interviews',
    maxSizeBytes: 200 * 1024 * 1024, // 200MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/*'],
    expiresInSeconds: 300, // 5 minutes
  },
}; 