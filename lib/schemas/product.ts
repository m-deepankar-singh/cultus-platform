import { z } from 'zod';

// Schema for creating a new product
export const ProductSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  description: z.string().optional().nullable(),
  image_url: z.union([
    z.string().url({ message: "Invalid image URL format" }),
    z.null()
  ]).optional(),
  // is_active: z.boolean().default(true).optional(), // Removed is_active
  // Add other relevant product fields here if needed
});

// Schema for updating an existing product (allows partial updates)
// UpdateProductSchema will automatically inherit changes from ProductSchema
export const UpdateProductSchema = ProductSchema.partial();

// Schema for validating a product ID (UUID) from route parameters
export const ProductIdSchema = z.object({
  productId: z.string().uuid({
    message: 'Product ID must be a valid UUID',
  }),
});

export const ProductAssignmentSchema = z.object({
  product_id: z.string().uuid({
    message: 'Product ID must be a valid UUID',
  }),
});

export type ProductFormData = z.infer<typeof ProductSchema>; 