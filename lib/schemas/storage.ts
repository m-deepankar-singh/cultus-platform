import { z } from 'zod';

// --- File Validation Schema ---

const MAX_FILE_SIZE_MB = 1000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['video/mp4']; // Currently only allowing MP4 as per plan

export const UploadFileSchema = z.instanceof(File)
  .refine((file) => file.size > 0, {
    message: 'File cannot be empty.',
  })
  .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, {
    message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB.`,
  })
  .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
    message: `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} allowed.`,
  });


// --- Optional Metadata Schema (as shown in plan) ---

/*
 * Optional schema for validating additional metadata sent with the upload.
 * Uncomment and adapt if needed.
 */
// export const UploadMetadataSchema = z.object({
//   moduleId: z.string().uuid({ message: 'Invalid Module ID format' }).optional(),
//   // Add other metadata fields as needed
// });
