import { createClient } from '@/lib/supabase/server';

// Module types in order of progression
export const JOB_READINESS_MODULE_ORDER = [
  'assessment',     // Star 0 -> unlocks automatically for enrolled students
  'course',         // Star 1 -> unlocked after assessments
  'expert_session', // Star 2 -> unlocked after courses
  'project',        // Star 3 -> unlocked after expert sessions
  'interview'       // Star 4 -> unlocked after projects
];

export type JobReadinessModuleType = typeof JOB_READINESS_MODULE_ORDER[number];

export const JOB_READINESS_STAR_LEVELS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'] as const;
export type JobReadinessStarLevel = typeof JOB_READINESS_STAR_LEVELS[number];

export const JOB_READINESS_TIERS = ['BRONZE', 'SILVER', 'GOLD'] as const;
export type JobReadinessTier = typeof JOB_READINESS_TIERS[number];

/**
 * Maps module types to the star level required to unlock them
 */
export const MODULE_TYPE_TO_REQUIRED_STAR_MAP: Record<JobReadinessModuleType, JobReadinessStarLevel | null> = {
  'assessment': null, // Always unlocked for enrolled students
  'course': 'ONE',
  'expert_session': 'TWO',
  'project': 'THREE',
  'interview': 'FOUR'
};

/**
 * Maps star levels to the module type that unlocks them
 * Note: ZERO is not included as it represents no completed modules
 */
export const STAR_LEVEL_TO_COMPLETED_MODULE_MAP: Record<Exclude<JobReadinessStarLevel, 'ZERO'>, JobReadinessModuleType> = {
  'ONE': 'assessment',
  'TWO': 'course',
  'THREE': 'expert_session',
  'FOUR': 'project',
  'FIVE': 'interview'
};

/**
 * Check if a student has access to a specific module type based on their current star level
 * 
 * @param studentId - The student's ID
 * @param moduleType - The type of module to check access for
 * @returns Object with access status and details
 */
export async function checkModuleAccess(
  studentId: string,
  moduleType: JobReadinessModuleType
) {
  try {
    const supabase = await createClient();
    
    // Get the student's current star level and tier
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('job_readiness_star_level, job_readiness_tier')
      .eq('id', studentId)
      .single();
      
    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return {
        has_access: false,
        error: 'Student not found',
        current_star_level: null,
        current_tier: null,
        required_star_level: MODULE_TYPE_TO_REQUIRED_STAR_MAP[moduleType]
      };
    }
    
    // Get the student's current star level
    const currentStarLevel = student.job_readiness_star_level as JobReadinessStarLevel || null;
    const currentTier = student.job_readiness_tier as JobReadinessTier || 'BRONZE';
    
    // Assessment module is always accessible to enrolled students
    if (moduleType === 'assessment') {
      return {
        has_access: true,
        current_star_level: currentStarLevel,
        current_tier: currentTier,
        required_star_level: null
      };
    }
    
    // Get the required star level for this module type
    const requiredStarLevel = MODULE_TYPE_TO_REQUIRED_STAR_MAP[moduleType];
    
    // If no required star level is defined, module is accessible
    if (requiredStarLevel === null) {
      return {
        has_access: true,
        current_star_level: currentStarLevel,
        current_tier: currentTier,
        required_star_level: null
      };
    }
    
    // If student has no star level yet, they only have access to assessments
    if (!currentStarLevel) {
      return {
        has_access: false,
        current_star_level: null,
        current_tier: currentTier,
        required_star_level: requiredStarLevel,
        error: `This module requires completing previous modules to reach Star ${requiredStarLevel}`
      };
    }
    
    // Find the indices in the star levels array for comparison
    const currentStarIndex = JOB_READINESS_STAR_LEVELS.indexOf(currentStarLevel);
    const requiredStarIndex = JOB_READINESS_STAR_LEVELS.indexOf(requiredStarLevel);
    
    // Check if the student's star level is equal to or higher than the required level
    const hasAccess = currentStarIndex >= requiredStarIndex;
    
    return {
      has_access: hasAccess,
      current_star_level: currentStarLevel,
      current_tier: currentTier,
      required_star_level: requiredStarLevel,
      error: hasAccess ? undefined : `This module requires Star ${requiredStarLevel}, but your current level is Star ${currentStarLevel}`
    };
  } catch (error) {
    console.error('Error checking module access:', error);
    return {
      has_access: false,
      error: 'Internal server error',
      current_star_level: null,
      current_tier: null,
      required_star_level: MODULE_TYPE_TO_REQUIRED_STAR_MAP[moduleType]
    };
  }
}

/**
 * Utility function to create a test route that can be used in Postman
 * Returns the module access status for the current user and specified module type
 */
export async function getModuleAccessForCurrentUser(
  userId: string, 
  moduleType: JobReadinessModuleType
) {
  const accessStatus = await checkModuleAccess(userId, moduleType);
  
  return {
    module_type: moduleType,
    ...accessStatus,
    module_order: JOB_READINESS_MODULE_ORDER,
    module_star_requirements: MODULE_TYPE_TO_REQUIRED_STAR_MAP
  };
} 