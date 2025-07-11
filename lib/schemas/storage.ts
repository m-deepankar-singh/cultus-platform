import { z } from 'zod';
import { validateFileComprehensive } from '@/lib/security/file-signature-validator';

// --- File Validation Schema ---

// 🔥 REMOVED: File size limits for raw video uploads
const ALLOWED_FILE_TYPES = ['video/webm', 'video/mp4']; // Support WebM and MP4

export const UploadFileSchema = z.instanceof(File)
  .refine((file) => file.size > 0, {
    message: 'File cannot be empty.',
  })
  .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
    message: `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} allowed.`,
  })
  .refine(async (file) => {
    // Enhanced security validation with file signature checking
    try {
      const validationResult = await validateFileComprehensive(file, {
        allowedTypes: ALLOWED_FILE_TYPES,
        maxSize: 500 * 1024 * 1024, // 500MB
        minSize: 1024, // 1KB
        enableStructureValidation: true,
        enableSVGSecurityValidation: false // Not applicable for videos
      });
      
      return validationResult.isValid;
    } catch (error) {
      console.warn('Video file validation failed:', error);
      return false;
    }
  }, {
    message: 'File validation failed. The file may be corrupted or not a valid video format.',
  });

// For backward compatibility, export a validation function
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  try {
    UploadFileSchema.parse(file);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Unknown validation error' };
  }
}

// --- Optional Metadata Schema (as shown in plan) ---

/*
 * Optional schema for validating additional metadata sent with the upload.
 * Uncomment and adapt if needed.
 */
// export const UploadMetadataSchema = z.object({
//   moduleId: z.string().uuid({ message: 'Invalid Module ID format' }).optional(),
//   // Add other metadata fields as needed
// });
