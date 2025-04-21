import { z } from 'zod';

// Schema for creating a new product
export const ProductSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true).optional(),
  // Add other relevant product fields here if needed
});

// Schema for updating an existing product (allows partial updates)
export const UpdateProductSchema = ProductSchema.partial();

// Schema for validating a product ID (UUID) from route parameters
export const ProductIdSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid Product ID format' })
}); 