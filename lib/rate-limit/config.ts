import { RateLimitConfig } from './vercel-kv';

export interface RateLimitRule extends RateLimitConfig {
  id: string;
  description: string;
  useIP?: boolean; // Whether to use IP address instead of user ID
  requiredRoles?: string[]; // Required roles for this endpoint
}

/**
 * Rate limiting configurations for different endpoint categories
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication Routes (Strict Security)
  AUTH_LOGIN: {
    id: 'auth_login',
    description: 'Login attempts',
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    useIP: true, // IP-based to prevent account takeover
    keyPrefix: 'auth_login'
  } as RateLimitRule,

  AUTH_VALIDATION: {
    id: 'auth_validation',
    description: 'Auth validation requests',
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    useIP: false, // User-based
    keyPrefix: 'auth_validation'
  } as RateLimitRule,

  PASSWORD_RESET: {
    id: 'password_reset',
    description: 'Password reset requests',
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: true, // IP-based to prevent abuse
    keyPrefix: 'password_reset'
  } as RateLimitRule,

  // AI-Powered Routes (Cost Protection)
  AI_INTERVIEW_ANALYSIS: {
    id: 'ai_interview_analysis',
    description: 'AI interview analysis',
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['student'],
    keyPrefix: 'ai_interview'
  } as RateLimitRule,

  AI_PROJECT_GENERATION: {
    id: 'ai_project_generation',
    description: 'AI project generation',
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['student'],
    keyPrefix: 'ai_project'
  } as RateLimitRule,

  AI_ASSESSMENT: {
    id: 'ai_assessment',
    description: 'AI assessment generation',
    limit: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['student'],
    keyPrefix: 'ai_assessment'
  } as RateLimitRule,

  // File Upload Routes (Bandwidth Control)
  UPLOAD_IMAGE: {
    id: 'upload_image',
    description: 'Image uploads',
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    keyPrefix: 'upload_image'
  } as RateLimitRule,

  UPLOAD_VIDEO: {
    id: 'upload_video',
    description: 'Video uploads',
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    keyPrefix: 'upload_video'
  } as RateLimitRule,

  UPLOAD_BULK: {
    id: 'upload_bulk',
    description: 'Bulk uploads',
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['Admin', 'Staff'],
    keyPrefix: 'upload_bulk'
  } as RateLimitRule,

  // Admin Routes (Operational Protection)
  ADMIN_EXPORT: {
    id: 'admin_export',
    description: 'Data export',
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['Admin', 'Staff'],
    keyPrefix: 'admin_export'
  } as RateLimitRule,

  ADMIN_ANALYTICS: {
    id: 'admin_analytics',
    description: 'Analytics requests',
    limit: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['Admin', 'Staff', 'Viewer'],
    keyPrefix: 'admin_analytics'
  } as RateLimitRule,

  ADMIN_BULK_OPS: {
    id: 'admin_bulk_ops',
    description: 'Bulk operations',
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['Admin', 'Staff'],
    keyPrefix: 'admin_bulk'
  } as RateLimitRule,

  // Student App Routes (Fair Usage)
  STUDENT_CONTENT: {
    id: 'student_content',
    description: 'Content access',
    limit: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['student'],
    keyPrefix: 'student_content'
  } as RateLimitRule,

  STUDENT_PROGRESS: {
    id: 'student_progress',
    description: 'Progress tracking',
    limit: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['student'],
    keyPrefix: 'student_progress'
  } as RateLimitRule,

  STUDENT_SUBMISSION: {
    id: 'student_submission',
    description: 'Assessment submission',
    limit: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    requiredRoles: ['student'],
    keyPrefix: 'student_submission'
  } as RateLimitRule,

  // General API Routes
  GENERAL_API: {
    id: 'general_api',
    description: 'General API access',
    limit: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    useIP: false,
    keyPrefix: 'general_api'
  } as RateLimitRule
} as const;

/**
 * Get rate limit config by endpoint pattern
 */
export function getRateLimitConfigByEndpoint(pathname: string): RateLimitRule | null {
  // Authentication routes
  if (pathname.includes('/auth/login')) {
    return RATE_LIMIT_CONFIGS.AUTH_LOGIN;
  }
  if (pathname.includes('/auth/me') || pathname.includes('/auth/logout')) {
    return RATE_LIMIT_CONFIGS.AUTH_VALIDATION;
  }
  
  // AI-powered routes
  if (pathname.includes('/interviews/analyze')) {
    return RATE_LIMIT_CONFIGS.AI_INTERVIEW_ANALYSIS;
  }
  if (pathname.includes('/projects/generate')) {
    return RATE_LIMIT_CONFIGS.AI_PROJECT_GENERATION;
  }
  if (pathname.includes('/assessments') && pathname.includes('/submit')) {
    return RATE_LIMIT_CONFIGS.AI_ASSESSMENT;
  }

  // Upload routes
  if (pathname.includes('/upload-image')) {
    return RATE_LIMIT_CONFIGS.UPLOAD_IMAGE;
  }
  if (pathname.includes('/upload-video')) {
    return RATE_LIMIT_CONFIGS.UPLOAD_VIDEO;
  }
  if (pathname.includes('/bulk-upload')) {
    return RATE_LIMIT_CONFIGS.UPLOAD_BULK;
  }

  // Admin routes
  if (pathname.includes('/admin/') && pathname.includes('/export')) {
    return RATE_LIMIT_CONFIGS.ADMIN_EXPORT;
  }
  if (pathname.includes('/admin/analytics')) {
    return RATE_LIMIT_CONFIGS.ADMIN_ANALYTICS;
  }
  if (pathname.includes('/admin/') && pathname.includes('/bulk')) {
    return RATE_LIMIT_CONFIGS.ADMIN_BULK_OPS;
  }

  // Student routes
  if (pathname.includes('/app/') && (pathname.includes('/courses') || pathname.includes('/content'))) {
    return RATE_LIMIT_CONFIGS.STUDENT_CONTENT;
  }
  if (pathname.includes('/app/progress')) {
    return RATE_LIMIT_CONFIGS.STUDENT_PROGRESS;
  }
  if (pathname.includes('/app/') && pathname.includes('/submit')) {
    return RATE_LIMIT_CONFIGS.STUDENT_SUBMISSION;
  }

  // Default for other API routes
  if (pathname.startsWith('/api/')) {
    return RATE_LIMIT_CONFIGS.GENERAL_API;
  }

  return null;
}

/**
 * Role-based rate limit multipliers
 * Higher tier users get higher limits
 */
export const ROLE_MULTIPLIERS = {
  'Admin': 2.0,
  'Staff': 1.5,
  'Client Staff': 1.2,
  'Viewer': 1.0,
  'student': 1.0
} as const;

/**
 * Apply role-based multiplier to rate limit config
 */
export function applyRoleMultiplier(config: RateLimitRule, userRole: string): RateLimitRule {
  const multiplier = ROLE_MULTIPLIERS[userRole as keyof typeof ROLE_MULTIPLIERS] || 1.0;
  
  return {
    ...config,
    limit: Math.ceil(config.limit * multiplier)
  };
}