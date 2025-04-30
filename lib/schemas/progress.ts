import { z } from 'zod';

// Schema for updating LESSON progress (Student PATCH body)
export const LessonProgressUpdateSchema = z.object({
  lesson_id: z.string().uuid({ message: 'Invalid Lesson ID' }), // Assuming tracking per lesson based on the doc
  status: z.enum(['in-progress', 'completed']).optional(), // Likely needs alignment with DB enum
  progress_percentage: z.number().min(0).max(100).optional(),
  // Add other updatable fields if needed
});

// Schema for updating MODULE progress (Student PATCH body for course module)
export const ModuleProgressUpdateSchema = z.object({
  status: z.enum(['NotStarted', 'InProgress', 'Completed']).optional(),
  score: z.number().min(0).max(100).nullable().optional(),
});

// Schema for submitting assessment answers (Student POST body)
export const AssessmentSubmissionSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])), // Record<questionId, selectedOptionId(s)>
  duration_seconds: z.number().int().optional(),
});

// Schema for querying progress (Client Staff GET query params)
export const ProgressQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(), // Added for Admin use
  // Add date range filters? (Consider adding later if needed)
});

// Schema for querying aggregated reports (Viewer GET query params)
export const ReportQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  // Add date range filters? (Consider adding later if needed)
});

// --- New Schema for Viewer Reports ---
export const ViewerReportQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export type LessonProgressUpdate = z.infer<typeof LessonProgressUpdateSchema>;
export type ModuleProgressUpdate = z.infer<typeof ModuleProgressUpdateSchema>;
export type AssessmentSubmission = z.infer<typeof AssessmentSubmissionSchema>;
export type ProgressQuery = z.infer<typeof ProgressQuerySchema>;
export type ViewerReportQuery = z.infer<typeof ViewerReportQuerySchema>;
