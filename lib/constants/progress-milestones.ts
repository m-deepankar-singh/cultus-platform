/**
 * Expert Session Progress Milestone Configuration
 * 
 * This file defines the milestone system for expert session video progress tracking.
 * Milestones are used to reduce database writes while maintaining accurate progress tracking.
 */

// Milestone percentages where progress will be saved to database
export const PROGRESS_MILESTONES = [10, 25, 50, 75, 90, 95, 100] as const;

// Thresholds for additional save triggers
export const PAUSE_THRESHOLD = 30; // Seconds of pause before saving progress
export const SEEK_THRESHOLD = 10; // Seconds of seeking before saving progress
export const COMPLETION_THRESHOLD = 100; // Percentage threshold for marking as completed

// Progress save trigger types
export const SAVE_TRIGGERS = {
  MILESTONE: 'milestone',
  PAUSE: 'pause', 
  SEEK: 'seek',
  COMPLETION: 'completion',
  UNLOAD: 'unload'
} as const;

// Type definitions for milestone system
export type ProgressMilestone = typeof PROGRESS_MILESTONES[number];
export type SaveTriggerType = typeof SAVE_TRIGGERS[keyof typeof SAVE_TRIGGERS];

// Configuration object for easy access
export const MILESTONE_CONFIG = {
  milestones: PROGRESS_MILESTONES,
  pauseThreshold: PAUSE_THRESHOLD,
  seekThreshold: SEEK_THRESHOLD,
  completionThreshold: COMPLETION_THRESHOLD,
  triggers: SAVE_TRIGGERS
} as const;

// Validation helpers
export const isMilestone = (percentage: number): percentage is ProgressMilestone => {
  return PROGRESS_MILESTONES.includes(percentage as ProgressMilestone);
};

export const isValidTrigger = (trigger: string): trigger is SaveTriggerType => {
  return Object.values(SAVE_TRIGGERS).includes(trigger as SaveTriggerType);
}; 