import { z } from 'zod';

// Define user roles used in the application
export const USER_ROLES = ['Admin', 'Staff', 'Viewer', 'Client Staff', 'Student'] as const;
export type UserRole = typeof USER_ROLES[number];

export const CreateUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  role: z.enum(USER_ROLES),
  client_id: z.string().uuid({ message: 'Invalid Client ID' }).optional().nullable(),
  // Add other required fields for profile creation
  full_name: z.string().min(1, { message: 'Full name is required' }),
}).refine(data => {
  // Make client_id required if role is Client Staff
  if (data.role === 'Client Staff') {
    return !!data.client_id;
  }
  return true;
}, {
  message: 'Client ID is required for Client Staff role',
  path: ['client_id'],
});

export const UpdateUserSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  client_id: z.string().uuid({ message: 'Invalid Client ID' }).optional().nullable(),
  full_name: z.string().min(1, { message: 'Full name cannot be empty' }).optional(),
  // Add other updatable profile fields as optional
}).refine(() => {
    // This refinement logic depends heavily on business rules.
    // Example: Ensure client_id is present if role is set to 'Client Staff'.
    // If updating *to* 'Client Staff', client_id should likely be provided in the *same* update.
    // If updating *away* from 'Client Staff', decide whether client_id should be nullified.
    // The current placeholder logic allows updates as long as the schema types are valid.
    // A more robust implementation would fetch the current user state before validating.
    return true; // Placeholder - adjust based on specific update requirements
}, {
    // Add appropriate message and path if refinement fails
    message: 'Client ID handling based on role is invalid',
    path: ['client_id'], // Adjust path as needed
});

export const UserIdSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid User ID format' })
}); 