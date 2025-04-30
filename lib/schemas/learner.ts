import { z } from 'zod';

/**
 * Schema for validating query parameters when listing learners.
 */
export const LearnerListQuerySchema = z.object({
  /** Search term to filter learners by name or email. */
  search: z.string().optional(),

  /** Optional Client ID to filter learners for a specific client (primarily for Admin use). */
  clientId: z.string().uuid({ message: 'Invalid Client ID format' }).optional(),

  /** Filter learners based on their active status. */
  isActive: z.enum(['true', 'false'], { message: "isActive must be 'true' or 'false'" }).optional(),

  // Potential future filters like productId could be added here.
  // productId: z.string().uuid().optional(),
});

// Note: UserIdSchema (for validating learner/student IDs in route parameters)
// is imported from './user.ts' where needed in the API routes.
