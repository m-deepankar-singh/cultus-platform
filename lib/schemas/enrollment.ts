import { z } from 'zod';

/**
 * Schema for validating manual student enrollment data.
 */
export const EnrollStudentSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  full_name: z.string().min(1, { message: 'Full name is required' }),
  // Option to send Supabase invite email upon enrollment
  send_invite: z.boolean().optional().default(true),
});

/**
 * Schema for validating bulk student enrollment data.
 */
export const BulkEnrollStudentSchema = z.object({
  // Array of student details, omitting send_invite per student
  students: z.array(EnrollStudentSchema.omit({ send_invite: true }))
    .min(1, { message: 'At least one student is required for bulk enrollment' }),
  // Global setting to send invites for the entire batch
  send_invite: z.boolean().optional().default(true),
});

/**
 * Schema for validating a student ID (UUID format).
 * Used for identifying specific student records.
 */
export const StudentIdSchema = z.string().uuid({ message: 'Invalid Student ID format.' });

/**
 * Enrollment schemas.
 */
export const EnrollmentSchemas = {
  EnrollStudentSchema,
  BulkEnrollStudentSchema,
  StudentIdSchema,
};
