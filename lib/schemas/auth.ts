import { z } from 'zod';

// Student login schema with remember me
export const AppLoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional().default(false)
});

// Admin login schema with remember me
export const AdminLoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional().default(false)
});

// Type exports for TypeScript
export type AppLoginFormValues = z.infer<typeof AppLoginSchema>;
export type AdminLoginFormValues = z.infer<typeof AdminLoginSchema>;
