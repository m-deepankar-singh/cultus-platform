import { z } from 'zod';

/**
 * Schema for validating the product ID in the product assignment request body.
 * Used when assigning a product to a client.
 */
export const ProductAssignmentSchema = z.object({
  product_id: z.string().uuid({ message: 'Invalid Product ID' }),
});
