import { z } from 'zod';

// --- File Validation Schema ---

// 🔥 REMOVED: File size limits for raw video uploads
const ALLOWED_FILE_TYPES = ['video/webm', 'video/mp4']; // Support WebM and MP4

export const UploadFileSchema = z.instanceof(File)
  .refine((file) => file.size > 0, {
    message: 'File cannot be empty.',
  })
  .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
    message: `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} allowed.`,
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
