import { Upload } from '@aws-sdk/lib-storage';
import { s3Client } from './s3-client';
import { 
  UploadError, 
  ValidationError, 
  FileTypeError, 
  FileSizeError, 
  PathTraversalError,
  createS3Error 
} from './upload-errors';
import { 
  validateUploadKey, 
  generateSecureKey, 
  sanitizeFilename 
} from '@/lib/utils/path-security';
import { 
  validateFileComprehensive,
  validateFileSignature,
  validateSVGContent,
  type ValidationResult 
} from '@/lib/security/file-signature-validator';
import { 
  getCurrentSecurityLevel,
  validateFileSecurityPolicy,
  getFileTypeConfig 
} from '@/lib/security/file-validation-config';

export interface UploadResult {
  url: string;
  key: string;
}

export interface ValidationOptions {
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  minSize?: number; // in bytes
  enableSignatureValidation?: boolean;
  enableSVGSecurityValidation?: boolean;
  enableStructureValidation?: boolean;
  uploadContext?: string;
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

  private async validateFile(file: File | Buffer, options: ValidationOptions = {}): Promise<ValidationResult | void> {
    const {
      allowedTypes = [],
      maxSize = 500 * 1024 * 1024, // 500MB default
      minSize = 0,
      enableSignatureValidation = true,
      enableSVGSecurityValidation = true,
      enableStructureValidation = true,
      uploadContext = 'default'
    } = options;

    const securityLevel = getCurrentSecurityLevel();
    
    // Get file size
    const fileSize = file instanceof File ? file.size : file.length;
    
    // Validate file size
    if (fileSize > maxSize) {
      throw new FileSizeError(maxSize, fileSize);
    }
    
    if (fileSize < minSize) {
      throw new ValidationError(`File too small. Minimum size: ${minSize} bytes, received: ${fileSize} bytes`);
    }
    
    // Basic MIME type validation (legacy support)
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

    // Enhanced security validation for File objects
    if (file instanceof File && (enableSignatureValidation || securityLevel.enforceSignatureValidation)) {
      // Security policy validation
      const policyValidation = validateFileSecurityPolicy(
        file.name,
        file.type,
        file.size,
        uploadContext
      );

      if (!policyValidation.isAllowed) {
        console.warn('Security policy violation:', {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          context: uploadContext,
          violations: policyValidation.violations,
          timestamp: new Date().toISOString()
        });

        throw new ValidationError(
          `Security policy violation: ${policyValidation.violations.join(', ')}`,
          'SECURITY_POLICY_VIOLATION',
          { 
            violations: policyValidation.violations,
            warnings: policyValidation.warnings 
          }
        );
      }

      // Comprehensive file validation
      const validationResult = await validateFileComprehensive(file, {
        allowedTypes,
        maxSize,
        minSize,
        enableStructureValidation: enableStructureValidation && securityLevel.enableContentInspection,
        enableSVGSecurityValidation: enableSVGSecurityValidation && securityLevel.allowSVGUploads
      });

      if (!validationResult.isValid) {
        // Log security incidents
        if (securityLevel.enableSecurityLogging) {
          console.warn('File validation failed with security implications:', {
            filename: file.name,
            claimedType: file.type,
            detectedType: validationResult.detectedType,
            errors: validationResult.errors,
            securityFlags: validationResult.securityFlags,
            confidence: validationResult.confidence,
            uploadContext,
            timestamp: new Date().toISOString(),
            metadata: validationResult.metadata
          });
        }

        // Create appropriate error based on security flags
        if (validationResult.securityFlags.includes('MIME_TYPE_SPOOFING')) {
          throw new FileTypeError(
            allowedTypes,
            file.type,
            `File signature validation failed. Claimed type: ${file.type}, detected: ${validationResult.detectedType || 'unknown'}`,
            'MIME_TYPE_SPOOFING',
            {
              detectedType: validationResult.detectedType,
              securityFlags: validationResult.securityFlags,
              confidence: validationResult.confidence
            }
          );
        }

        if (validationResult.securityFlags.includes('UNSAFE_SVG_CONTENT')) {
          throw new ValidationError(
            'SVG file contains potentially dangerous content',
            'UNSAFE_SVG_CONTENT',
            {
              errors: validationResult.errors,
              securityFlags: validationResult.securityFlags
            }
          );
        }

        throw new ValidationError(
          `File validation failed: ${validationResult.errors.join(', ')}`,
          'FILE_VALIDATION_FAILED',
          {
            errors: validationResult.errors,
            securityFlags: validationResult.securityFlags,
            detectedType: validationResult.detectedType
          }
        );
      }

      return validationResult;
    }

    // Return void for Buffer objects or when enhanced validation is disabled
    return;
  }

  async uploadFile(
    file: File | Buffer,
    key: string,
    contentType?: string,
    validationOptions?: ValidationOptions
  ): Promise<UploadResult> {
    try {
      // Validate the file first (now async for enhanced security)
      if (validationOptions) {
        await this.validateFile(file, validationOptions);
      }

      // Comprehensive path validation to prevent CVE-2025-004
      const keyValidation = validateUploadKey(key);
      if (!keyValidation.isValid) {
        // Log security issues for monitoring
        if (keyValidation.securityIssues.length > 0) {
          console.warn('Security violation in file upload:', {
            key,
            securityIssues: keyValidation.securityIssues,
            errors: keyValidation.errors,
            timestamp: new Date().toISOString(),
          });
          
          throw new PathTraversalError(
            keyValidation.errors.join(', '),
            keyValidation.securityIssues,
            { originalKey: key }
          );
        }
        
        throw new ValidationError(`Invalid file key: ${keyValidation.errors.join(', ')}`);
      }
      
      // Use sanitized key for upload
      const sanitizedKey = keyValidation.sanitized || key;



      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.bucketName,
          Key: sanitizedKey,
          Body: file,
          ContentType: contentType || (file instanceof File ? file.type : 'application/octet-stream'),
        },
      });

      await upload.done();

      // Use public URL for file access, not upload endpoint
      // If no public URL is configured, construct a basic URL from the bucket name
      let url: string;
      if (this.publicUrl) {
        url = `${this.publicUrl}/${sanitizedKey}`;
      } else {
        // Fallback: construct URL from S3 endpoint and bucket
        const endpoint = process.env.R2_ENDPOINT || '';
        url = endpoint ? `${endpoint}/${this.bucketName}/${sanitizedKey}` : `https://${this.bucketName}.r2.dev/${sanitizedKey}`;
      }
      
      return {
        url,
        key: sanitizedKey,
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
    try {
      // Use the secure key generation function
      return generateSecureKey(prefix, filename);
    } catch (error) {
      // Fallback to safe default if secure generation fails
      console.warn('Secure key generation failed, using fallback:', error);
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const safeFilename = sanitizeFilename(filename);
      const extension = safeFilename.split('.').pop() || 'bin';
      const safeName = safeFilename.replace(/\.[^.]*$/, '') || 'file';
      return `${prefix}/${timestamp}_${randomId}_${safeName}.${extension}`;
    }
  }
}

export const uploadService = new SimpleUploadService(); 