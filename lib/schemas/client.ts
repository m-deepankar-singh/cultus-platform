import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().min(1, { message: 'Client name is required' }),
  contact_email: z.string().email({ message: 'Invalid contact email' }).optional().nullable(),
  address: z.string().optional().nullable(),
  logo_url: z.union([
    z.string().url({ message: 'Invalid URL format' }),
    z.string().length(0), // Allow empty string
    z.null()
  ]).optional().nullable(),
  is_active: z.boolean().default(true).optional(),
});

// Option 1: Reuse with partial
export const UpdateClientSchema = ClientSchema.partial();

// Option 2: Define explicitly if different validation needed for update
// export const UpdateClientSchema = z.object({ ... });

export const ClientIdSchema = z.object({
  clientId: z.string().uuid({ message: 'Invalid Client ID format' })
}); 