/**
 * API Data Selection Utilities
 * 
 * Predefined field selections for different API contexts to optimize data transfer.
 * Replaces inefficient select('*') patterns with specific column selections.
 * 
 * Performance Benefits:
 * - Reduces data transfer costs
 * - Faster query execution
 * - Lower memory usage
 * - Improved network performance
 */

// Client data selections
export const CLIENT_SELECTORS = {
  // For listing clients (dashboard, admin panel)
  LIST: 'id, name, is_active, created_at, logo_url',
  
  // For listing clients with products (dashboard, admin panel) - optimized for N+1 prevention
  LIST_WITH_PRODUCTS: `
    id, name, contact_email, is_active, created_at, logo_url,
    client_product_assignments(
      product_id,
      products(id, name, type, description)
    )
  `,
  
  // For client detail view
  DETAIL: 'id, name, contact_email, address, is_active, created_at, updated_at, logo_url',
  
  // For dropdown/select components
  DROPDOWN: 'id, name, is_active',
  
  // For reports and analytics
  ANALYTICS: 'id, name, created_at, is_active'
} as const;

// User/Profile data selections
export const USER_SELECTORS = {
  // For user listing (matches profiles table schema)
  LIST: 'id, full_name, role, client_id, is_active, status, updated_at',
  
  // For user profile detail (matches profiles table schema)
  DETAIL: 'id, full_name, role, client_id, is_active, status, is_enrolled, updated_at',
  
  // For authentication/session contexts
  AUTH: 'id, role, client_id, is_active',
  
  // For user dropdowns
  DROPDOWN: 'id, full_name, role'
} as const;

// Product data selections
export const PRODUCT_SELECTORS = {
  // For product listing (matches products table schema)
  LIST: 'id, name, type, description, created_at, updated_at',
  
  // For product detail view (matches products table schema)
  DETAIL: 'id, name, type, description, image_url, created_by, created_at, updated_at',
  
  // For product assignment/selection
  ASSIGNMENT: 'id, name, type, description'
} as const;

// Expert session data selections
export const SESSION_SELECTORS = {
  // For session listing (optimized for performance)
  LIST: 'id, title, description, video_duration, is_active, created_at',
  
  // For session detail view
  DETAIL: 'id, title, description, video_url, video_duration, is_active, created_at, updated_at',
  
  // For progress tracking
  PROGRESS: 'id, title, video_duration'
} as const;

// Module data selections
export const MODULE_SELECTORS = {
  // For module listing (admin/course management)
  LIST: 'id, name, type, sequence, created_at, updated_at',
  
  // For module detail view
  DETAIL: 'id, name, type, sequence, configuration, product_id, created_at, updated_at',
  
  // For admin management (includes creator info)
  ADMIN: 'id, name, type, sequence, configuration, product_id, created_by, created_at, updated_at',
  
  // For student progress/course view
  STUDENT: 'id, name, type, sequence, configuration'
} as const;

// Lesson data selections
export const LESSON_SELECTORS = {
  // For lesson listing
  LIST: 'id, title, description, sequence, has_quiz, created_at',
  
  // For lesson detail view 
  DETAIL: 'id, title, description, video_url, sequence, has_quiz, quiz_data, created_at, updated_at',
  
  // For progress tracking
  PROGRESS: 'id, title, sequence, has_quiz',
  
  // For student lesson player
  PLAYER: 'id, title, description, video_url, has_quiz, quiz_data'
} as const;

// Student data selections (Job Readiness specific)
export const STUDENT_SELECTORS = {
  // For student listing (optimized - 16 cols reduced to 7)
  LIST: 'id, full_name, email, client_id, is_active, last_login_at, created_at',
  
  // For student detail view (includes job readiness fields)
  DETAIL: 'id, full_name, email, phone_number, client_id, is_active, star_rating, job_readiness_star_level, job_readiness_tier, job_readiness_background_type, created_at, updated_at',
  
  // For progress reports (minimal fields for performance)
  PROGRESS: 'id, full_name, job_readiness_star_level, job_readiness_tier, last_login_at',
  
  // For admin management 
  ADMIN: 'id, full_name, email, phone_number, client_id, is_active, job_readiness_star_level, job_readiness_tier, job_readiness_background_type, created_at, updated_at, last_login_at'
} as const;

// Question Bank data selections
export const QUESTION_BANK_SELECTORS = {
  // For question listing (includes fields needed by frontend Question interface)
  LIST: 'id, question_text, question_type, options, correct_answer, difficulty, topic, created_by, created_at, updated_at',
  
  // For question detail/edit (matches assessment_questions table schema)
  DETAIL: 'id, question_text, question_type, options, correct_answer, difficulty, topic, created_by, created_at, updated_at',
  
  // For question assignment (minimal fields for selection)
  ASSIGNMENT: 'id, question_text, question_type, difficulty, topic'
} as const;

// Student Module Progress data selections
export const STUDENT_MODULE_PROGRESS_SELECTORS = {
  // For progress listing (minimal fields for performance)
  LIST: 'student_id, module_id, status, progress_percentage, last_updated',
  
  // For progress detail view
  DETAIL: 'student_id, module_id, status, score, progress_details, progress_percentage, last_updated, completed_at',
  
  // For progress summary reports
  SUMMARY: 'student_id, module_id, status, progress_percentage, completed_at'
} as const;

// Learner/Student data selections
export const LEARNER_SELECTORS = {
  // For learner listing
  LIST: 'id, full_name, email, client_id, is_active, created_at, last_login_at',
  
  // For learner detail view
  DETAIL: 'id, full_name, email, phone_number, client_id, is_active, created_at, updated_at, last_login_at, star_rating',
  
  // For progress reports
  PROGRESS: 'id, full_name, email, client_id, star_rating, last_login_at'
} as const;

/**
 * Helper function to get selector by context
 * Provides type safety and consistent selection patterns
 * 
 * @param entity - The entity type (client, user, product, etc.)
 * @param context - The usage context (list, detail, dropdown, etc.)
 * @returns The appropriate field selection string
 */
export function getSelector(
  entity: 'client' | 'user' | 'product' | 'session' | 'learner' | 'module' | 'lesson' | 'student' | 'question_bank',
  context: string
): string {
  const selectors = {
    client: CLIENT_SELECTORS,
    user: USER_SELECTORS,
    product: PRODUCT_SELECTORS,
    session: SESSION_SELECTORS,
    learner: LEARNER_SELECTORS,
    module: MODULE_SELECTORS,
    lesson: LESSON_SELECTORS,
    student: STUDENT_SELECTORS,
    question_bank: QUESTION_BANK_SELECTORS
  };

  const entitySelectors = selectors[entity];
  const selector = (entitySelectors as any)[context.toUpperCase()];
  
  if (!selector) {
    console.warn(`No selector found for ${entity}.${context}, falling back to basic fields`);
    return 'id, created_at, updated_at';
  }
  
  return selector;
}

/**
 * Type-safe selector access with autocomplete support
 */
export const SELECTORS = {
  CLIENT: CLIENT_SELECTORS,
  USER: USER_SELECTORS,
  PRODUCT: PRODUCT_SELECTORS,
  SESSION: SESSION_SELECTORS,
  LEARNER: LEARNER_SELECTORS,
  MODULE: MODULE_SELECTORS,
  LESSON: LESSON_SELECTORS,
  STUDENT: STUDENT_SELECTORS,
  QUESTION_BANK: QUESTION_BANK_SELECTORS
} as const; 