import { Upload } from '@aws-sdk/lib-storage';
import { s3Client } from './s3-client';
import { 
  UploadError, 
  ValidationError, 
  FileTypeError, 
  FileSizeError, 
  ConfigurationError,
  createS3Error 
} from './upload-errors';

export interface UploadResult {
  url: string;
  key: string;
}

export interface ValidationOptions {
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  minSize?: number; // in bytes
}

export class SimpleUploadService {
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Use the new R2 environment variables from the migration
    this.bucketName = process.env.R2_PUBLIC_BUCKET || 'cultus-public-assets';
    this.publicUrl = process.env.R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_URL || '';
    
    // Validate required environment variables - but don't throw errors, just log warnings
    if (!this.bucketName) {
      console.warn('R2_PUBLIC_BUCKET environment variable not set, using default: cultus-public-assets');
      this.bucketName = 'cultus-public-assets';
    }
    if (!this.publicUrl) {
      console.warn('R2_PUBLIC_DOMAIN environment variable not set. Files will use bucket endpoint for access.');
      // Don't throw error - the service can still work without public URL
      this.publicUrl = '';
    }
  }

  private validateFile(file: File | Buffer, options: ValidationOptions = {}): void {
    const {
      allowedTypes = [],
      maxSize = 500 * 1024 * 1024, // 500MB default
      minSize = 0
    } = options;

    // Get file size
    const fileSize = file instanceof File ? file.size : file.length;
    
    // Validate file size
    if (fileSize > maxSize) {
      throw new FileSizeError(maxSize, fileSize);
    }
    
    if (fileSize < minSize) {
      throw new ValidationError(`File too small. Minimum size: ${minSize} bytes, received: ${fileSize} bytes`);
    }
    
    // Validate file type (only for File objects)
    if (file instanceof File && allowedTypes.length > 0) {
      const fileType = file.type;
      const isValidType = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.slice(0, -1));
        }
        return fileType === type;
      });
      
      if (!isValidType) {
        throw new FileTypeError(allowedTypes, fileType);
      }
    }
  }

  async uploadFile(
    file: File | Buffer,
    key: string,
    contentType?: string,
    validationOptions?: ValidationOptions
  ): Promise<UploadResult> {
    try {
      // Validate the file first
      if (validationOptions) {
        this.validateFile(file, validationOptions);
      }

      // Validate key format
      if (!key || key.includes('..') || key.startsWith('/') || key.endsWith('/')) {
        throw new ValidationError('Invalid file key format');
      }



      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: file,
          ContentType: contentType || (file instanceof File ? file.type : 'application/octet-stream'),
        },
      });

      await upload.done();

      // Use public URL for file access, not upload endpoint
      // If no public URL is configured, construct a basic URL from the bucket name
      let url: string;
      if (this.publicUrl) {
        url = `${this.publicUrl}/${key}`;
      } else {
        // Fallback: construct URL from S3 endpoint and bucket
        const endpoint = process.env.R2_ENDPOINT || '';
        url = endpoint ? `${endpoint}/${this.bucketName}/${key}` : `https://${this.bucketName}.r2.dev/${key}`;
      }
      
      return {
        url,
        key,
      };
    } catch (error) {
      // If it's already one of our custom errors, re-throw it
      if (error instanceof UploadError) {
        throw error;
      }

      // Convert AWS/S3 errors to our custom errors
      throw createS3Error(error);
    }
  }

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const extension = filename.split('.').pop();
    return `${prefix}/${timestamp}_${randomId}.${extension}`;
  }
}

export const uploadService = new SimpleUploadService(); 