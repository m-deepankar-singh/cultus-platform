import { z } from 'zod';

export const QuestionBankType = z.enum(['course', 'assessment']);

// Base schema for common fields
const BaseQuestionSchema = z.object({
  question_text: z.string().min(1, { message: 'Question text is required' }),
  question_type: z.enum(['MCQ', 'MSQ']), // Multiple Choice Question, Multi-Select Question
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2, { message: 'At least two options required' }),
  tags: z.array(z.string()).optional().default([]),
  // Add other relevant fields like explanation, difficulty, etc.
});

// --- Core Schemas (without refinements) ---
const MCQCoreSchema = BaseQuestionSchema.extend({
  question_type: z.literal('MCQ'),
  correct_answer: z.string({ required_error: 'Correct answer ID is required for MCQ' }), // ID of the correct option
});

const MSQCoreSchema = BaseQuestionSchema.extend({
  question_type: z.literal('MSQ'),
  correct_answers: z.array(z.string()).min(1, { message: 'At least one correct answer ID is required for MSQ' }), // IDs of correct options
});

// --- Schemas with Refinements ---

// Schema for MCQ with refinement
export const MCQSchema = MCQCoreSchema.refine(data => data.options.some(opt => opt.id === data.correct_answer), {
  message: 'Correct answer ID must match one of the option IDs',
  path: ['correct_answer'],
});

// Schema for MSQ with refinement
export const MSQSchema = MSQCoreSchema.refine(data => data.correct_answers.every(ans => data.options.some(opt => opt.id === ans)), {
  message: 'All correct answer IDs must match option IDs',
  path: ['correct_answers'],
});

// Union schema for basic validation (using CORE schemas for discriminatedUnion)
// Refinements need to be checked separately if required after this base validation
export const QuestionSchema = z.discriminatedUnion('question_type', [
  MCQCoreSchema, // Use core schema
  MSQCoreSchema, // Use core schema
]);

// --- API Schemas ---

// Schema for creating a question via API (extends CORE schemas, includes bank_type)
const MCQApiSchema = MCQCoreSchema.extend({
    bank_type: QuestionBankType,
});
const MSQApiSchema = MSQCoreSchema.extend({
    bank_type: QuestionBankType,
});
export const QuestionApiSchema = z.discriminatedUnion('question_type', [
    MCQApiSchema,
    MSQApiSchema,
]);

// Schema for updating a question via API (content fields optional, includes bank_type)
// Note: Refinements are complex on partial data and might need adjustment based on update logic.
// Keeping them simple for now by omitting them on the partial schemas.
const UpdateMCQApiSchema = BaseQuestionSchema.partial().extend({
    question_type: z.literal('MCQ'),
    correct_answer: z.string().optional(),
    bank_type: QuestionBankType,
});
const UpdateMSQApiSchema = BaseQuestionSchema.partial().extend({
    question_type: z.literal('MSQ'),
    correct_answers: z.array(z.string()).min(1).optional(), // Keep min(1) if present, but allow undefined
    bank_type: QuestionBankType,
});
export const UpdateQuestionApiSchema = z.discriminatedUnion('question_type', [
    UpdateMCQApiSchema,
    UpdateMSQApiSchema,
]);

// --- ID and Query Schemas ---

export const QuestionIdSchema = z.object({
  questionId: z.string().uuid({ message: 'Invalid Question ID format' })
});

export const QuestionBankQuerySchema = z.object({
    type: QuestionBankType,
    // Add other query params like search, tags etc. as optional strings
    search: z.string().optional(),
    tag: z.string().optional(),
}); 