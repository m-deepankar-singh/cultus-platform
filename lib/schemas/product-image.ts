import { z } from 'zod';

// Max file size for product images (5MB)
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Allowed image types for products (you can customize this list)
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif' // Added GIF as an example, remove if not needed
];

// Schema for validating product image uploads
export const ProductImageSchema = z.instanceof(File)
  .refine((file) => file.size > 0, {
    message: 'Image file cannot be empty.',
  })
  .refine((file) => file.size <= MAX_IMAGE_SIZE_BYTES, {
    message: `Image size exceeds the maximum limit of ${MAX_IMAGE_SIZE_MB}MB.`,
  })
  .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), {
    message: `Invalid file type. Only ${ALLOWED_IMAGE_TYPES.map(type => type.replace('image/', '')).join(', ')} allowed.`,
  });

// (Optional) Type for product image upload response, if you need a specific one
// export interface ProductImageUploadResponse {
//   path: string;
//   publicUrl: string;
// } 