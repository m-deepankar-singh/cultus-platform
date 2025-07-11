import { z } from 'zod';
import { validateFileComprehensive, validateSVGContent } from '@/lib/security/file-signature-validator';

// Max file size for client logos (1MB)
const MAX_LOGO_SIZE_MB = 1;
const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;

// Allowed image types for client logos
const ALLOWED_LOGO_TYPES = [
  'image/png', 
  'image/jpeg', 
  'image/jpg', 
  'image/webp', 
  'image/svg+xml'
];

// Schema for validating client logo uploads
export const ClientLogoSchema = z.instanceof(File)
  .refine((file) => file.size > 0, {
    message: 'Logo file cannot be empty.',
  })
  .refine((file) => file.size <= MAX_LOGO_SIZE_BYTES, {
    message: `Logo size exceeds the maximum limit of ${MAX_LOGO_SIZE_MB}MB.`,
  })
  .refine((file) => ALLOWED_LOGO_TYPES.includes(file.type), {
    message: `Invalid file type. Only ${ALLOWED_LOGO_TYPES.map(type => type.replace('image/', '')).join(', ')} allowed.`,
  })
  .refine(async (file) => {
    // Enhanced security validation with file signature checking
    try {
      const validationResult = await validateFileComprehensive(file, {
        allowedTypes: ALLOWED_LOGO_TYPES,
        maxSize: MAX_LOGO_SIZE_BYTES,
        minSize: 100, // 100 bytes minimum
        enableStructureValidation: true,
        enableSVGSecurityValidation: true
      });
      
      return validationResult.isValid;
    } catch (error) {
      console.warn('Client logo validation failed:', error);
      return false;
    }
  }, {
    message: 'Logo validation failed. The file may be corrupted, contain malicious content, or not be a valid image format.',
  });

// Type for client logo upload response
export interface ClientLogoUploadResponse {
  path: string;
  publicUrl: string;
} 