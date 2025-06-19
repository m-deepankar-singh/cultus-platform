import { z } from 'zod';

/**
 * Enum representing the type of a learning module.
 */
export const ModuleTypeEnum = z.enum(['Course', 'Assessment']);
export type ModuleType = z.infer<typeof ModuleTypeEnum>;

/**
 * Base schema for module properties.
 */
export const ModuleSchema = z.object({
  product_ids: z.array(z.string().uuid({ message: 'Invalid Product ID' })).optional(),
  name: z.string().min(1, { message: 'Module name is required' }),
  type: ModuleTypeEnum,
  sequence: z.number().int().default(0),
  configuration: z.record(z.unknown()).optional().default({}), 
  // Example configuration for Assessment:
  // { time_limit_minutes: 60, score_per_question: 10 }
  // Example configuration for Course:
  // { optional_reading_url: '...' }
  // Add other common module fields if needed
});

/**
 * Schema for updating an existing module.
 * Allows partial updates.
 */
export const UpdateModuleSchema = ModuleSchema.partial();

/**
 * Schema for validating a module ID (UUID) from route parameters or data.
 */
export const ModuleIdSchema = z.object({
  moduleId: z.string().uuid({ message: 'Invalid Module ID format' })
});

/**
 * Schema for creating or updating a course lesson.
 */
export const CourseLessonSchema = z.object({
  // module_id is typically derived from the route parameter, not included here.
  sequence: z.number().int().min(0, { message: 'Sequence must be non-negative' }),
  title: z.string().min(1, { message: 'Lesson title is required' }),
  video_url: z.union([
    z.string().url(),
    z.literal(''),
    z.null()
  ]).optional().nullable(),
  quiz_id: z.string().uuid({ message: 'Invalid Quiz Question ID' }).optional().nullable(), // FK to course_questions
});

/**
 * Schema for partially updating a course lesson.
 */
export const UpdateCourseLessonSchema = CourseLessonSchema.partial();

/**
 * Schema for validating a lesson ID (UUID) from route parameters.
 */
export const LessonIdSchema = z.object({
  lessonId: z.string().uuid({ message: 'Invalid Lesson ID format' })
});

/**
 * Schema for linking an assessment question to an assessment module.
 */
export const AssessmentQuestionLinkSchema = z.object({
  question_id: z.string().uuid({ message: 'Invalid Assessment Question ID' }) // FK to assessment_questions
});
