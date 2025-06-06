/**
 * Expert Session Progress Utility Functions
 * 
 * This file contains helper functions for milestone-based progress tracking,
 * including milestone detection, progress calculation, and trigger evaluation.
 */

import { 
  PROGRESS_MILESTONES, 
  PAUSE_THRESHOLD, 
  SEEK_THRESHOLD, 
  COMPLETION_THRESHOLD,
  SAVE_TRIGGERS,
  type ProgressMilestone,
  type SaveTriggerType 
} from '@/lib/constants/progress-milestones';

/**
 * Calculate the completion percentage based on current time and duration
 */
export const calculateCompletionPercentage = (
  currentTimeSeconds: number, 
  durationSeconds: number
): number => {
  if (durationSeconds <= 0) return 0;
  return Math.min(Math.round((currentTimeSeconds / durationSeconds) * 100), 100);
};

/**
 * Find the next milestone that should be saved based on current progress
 */
export const getNextMilestone = (
  currentPercentage: number, 
  lastSavedMilestone: number = 0
): ProgressMilestone | null => {
  return PROGRESS_MILESTONES.find(
    milestone => milestone > lastSavedMilestone && currentPercentage >= milestone
  ) || null;
};

/**
 * Check if progress has reached a new milestone that needs to be saved
 */
export const shouldSaveMilestone = (
  currentPercentage: number,
  lastSavedMilestone: number = 0
): { shouldSave: boolean; milestone: ProgressMilestone | null } => {
  const nextMilestone = getNextMilestone(currentPercentage, lastSavedMilestone);
  return {
    shouldSave: nextMilestone !== null,
    milestone: nextMilestone
  };
};

/**
 * Check if enough time has passed since pause to trigger a save
 */
export const shouldSaveOnPause = (pauseDurationSeconds: number): boolean => {
  return pauseDurationSeconds >= PAUSE_THRESHOLD;
};

/**
 * Check if seek change is significant enough to trigger a save
 */
export const shouldSaveOnSeek = (
  previousTimeSeconds: number,
  newTimeSeconds: number
): boolean => {
  const seekDistance = Math.abs(newTimeSeconds - previousTimeSeconds);
  return seekDistance >= SEEK_THRESHOLD;
};

/**
 * Check if video should be marked as completed based on percentage
 */
export const shouldMarkAsCompleted = (
  completionPercentage: number,
  forceCompletion: boolean = false
): boolean => {
  return completionPercentage >= COMPLETION_THRESHOLD || forceCompletion;
};

/**
 * Calculate the display progress for smooth UI updates between milestones
 */
export const calculateDisplayProgress = (
  currentTimeSeconds: number,
  durationSeconds: number,
  lastSavedMilestone: number = 0
): number => {
  const currentPercent = calculateCompletionPercentage(currentTimeSeconds, durationSeconds);
  const nextMilestone = PROGRESS_MILESTONES.find(m => m > lastSavedMilestone) || 100;
  
  // Show real-time progress but don't exceed the next milestone threshold
  return Math.min(currentPercent, nextMilestone);
};

/**
 * Determine the appropriate save trigger type based on the situation
 */
export const determineSaveTrigger = (
  currentPercentage: number,
  lastSavedMilestone: number,
  pauseDuration: number = 0,
  seekDistance: number = 0,
  isCompletion: boolean = false,
  isUnloading: boolean = false
): SaveTriggerType | null => {
  if (isUnloading) return SAVE_TRIGGERS.UNLOAD;
  if (isCompletion) return SAVE_TRIGGERS.COMPLETION;
  if (shouldSaveOnSeek(0, seekDistance)) return SAVE_TRIGGERS.SEEK;
  if (shouldSaveOnPause(pauseDuration)) return SAVE_TRIGGERS.PAUSE;
  if (shouldSaveMilestone(currentPercentage, lastSavedMilestone).shouldSave) {
    return SAVE_TRIGGERS.MILESTONE;
  }
  
  return null;
};

/**
 * Create a resume position from saved progress data
 */
export const calculateResumePosition = (
  savedProgressSeconds: number,
  durationSeconds: number
): number => {
  if (durationSeconds <= 0) return 0;
  return Math.max(0, Math.min(savedProgressSeconds, durationSeconds));
};

/**
 * Format time for display (used in resume dialogs)
 */
export const formatTimeForDisplay = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Get all milestones that have been passed for progress visualization
 */
export const getPassedMilestones = (currentPercentage: number): ProgressMilestone[] => {
  return PROGRESS_MILESTONES.filter(milestone => currentPercentage >= milestone);
};

/**
 * Get the milestone markers for progress bar visualization
 */
export const getMilestoneMarkers = (): { position: number; milestone: ProgressMilestone }[] => {
  return PROGRESS_MILESTONES.map(milestone => ({
    position: milestone,
    milestone
  }));
}; 