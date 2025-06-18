/**
 * TypeScript interfaces for Expert Session Milestone-Based Progress System
 * 
 * This file defines all the types and interfaces used in the milestone progress tracking system.
 */

import { type SaveTriggerType, type ProgressMilestone } from '@/lib/constants/progress-milestones';

// Base progress data that exists in database
export interface ExpertSessionProgressRecord {
  id: string;
  student_id: string;
  expert_session_id: string;
  watch_time_seconds: number;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  last_milestone_reached?: number; // Phase 1: Milestone tracking
  
  // Phase 2: Enhanced video functionality
  resume_from_milestone?: number;
  session_data?: SessionTrackingData;
}

// Phase 2: Session tracking data structure
export interface SessionTrackingData {
  sessions?: Array<{
    started_at: string;
    ended_at?: string;
    milestones_reached: number[];
    pauses: number;
    pause_time: number; // Total pause time in seconds
  }>;
}

// Progress data sent to API for milestone tracking
export interface MilestoneProgressData {
  current_time_seconds: number;
  total_duration_seconds: number;
  milestone_reached?: ProgressMilestone;
  trigger_type: SaveTriggerType;
  force_completion?: boolean;
  seek_from_seconds?: number; // For tracking seek behavior
  pause_duration_seconds?: number; // For tracking pause behavior
  
  // Phase 2: Enhanced video fields
  resume_from_milestone?: number;
  session_started?: boolean;
  session_ended?: boolean;
  pause_duration?: number; // Duration of pause in seconds
}

// Legacy progress data format (for backward compatibility)
export interface LegacyProgressData {
  current_time_seconds: number;
  total_duration_seconds: number;
  force_completion?: boolean;
}

// Enhanced API response with milestone information
export interface MilestoneProgressResponse {
  success: boolean;
  message: string;
  progress: {
    expert_session_id: string;
    watch_time_seconds: number;
    completion_percentage: number;
    is_completed: boolean;
    completed_at: string | null;
    session_just_completed: boolean;
    milestone_reached?: ProgressMilestone;
    trigger_type: SaveTriggerType;
    last_milestone_reached?: number;
    
    // Phase 2: Enhanced resume functionality
    resume_from_milestone: number;
    can_resume: boolean;
    resume_position_seconds: number; // Calculated from milestone
  };
  overall_progress: {
    completed_sessions_count: number;
    required_sessions: number;
    progress_percentage: number;
    third_star_unlocked: boolean;
  };
  star_level_unlocked?: boolean;
  new_star_level?: string;
}

// Frontend state for milestone tracking
export interface MilestoneTrackingState {
  lastMilestoneSaved: number;
  pauseStartTime: number | null;
  pauseDuration: number;
  lastSeekPosition: number;
  pendingMilestone: ProgressMilestone | null;
  isTrackingProgress: boolean;
}

// Expert session with enhanced progress tracking
export interface ExpertSessionWithMilestones {
  id: string;
  title: string;
  description: string;
  video_url: string;
  video_duration: number;
  created_at: string;
  student_progress: {
    watch_time_seconds: number;
    completion_percentage: number;
    is_completed: boolean;
    completed_at: string | null;
    last_milestone_reached?: ProgressMilestone;
    milestones_reached?: ProgressMilestone[];
    
    // Phase 2: Enhanced resume functionality
    can_resume: boolean;
    resume_from_milestone: number;
    resume_position_seconds: number;
    milestones_unlocked: number[];
  };
}

// Progress update event data
export interface ProgressUpdateEvent {
  sessionId: string;
  currentTime: number;
  duration: number;
  triggerType: SaveTriggerType;
  milestone?: ProgressMilestone;
  forceCompletion?: boolean;
}

// Milestone achievement notification data
export interface MilestoneAchievement {
  milestone: ProgressMilestone;
  sessionId: string;
  sessionTitle: string;
  timestamp: string;
  isCompletion: boolean;
}

// Progress visualization data for UI components
export interface ProgressVisualization {
  currentPercentage: number;
  displayPercentage: number;
  passedMilestones: ProgressMilestone[];
  nextMilestone: ProgressMilestone | null;
  milestoneMarkers: Array<{
    position: number;
    milestone: ProgressMilestone;
    isReached: boolean;
  }>;
}

// Local storage backup data
export interface LocalProgressBackup {
  sessionId: string;
  watchTimeSeconds: number;
  completionPercentage: number;
  lastMilestone: ProgressMilestone;
  timestamp: number;
  triggerType: SaveTriggerType;
}

// Resume dialog options
export interface ResumeOptions {
  resumeFromSaved: {
    position: number;
    formattedTime: string;
    percentage: number;
  };
  startFromBeginning: boolean;
  lastMilestone?: ProgressMilestone;
}

// Progress tracking configuration
export interface ProgressTrackingConfig {
  enableMilestones: boolean;
  enableLegacyFallback: boolean;
  enableLocalBackup: boolean;
  enableResumeDialog: boolean;
  milestoneNotifications: boolean;
  debugMode: boolean;
}

// Video player props with milestone support
export interface ExpertSessionPlayerProps {
  session: ExpertSessionWithMilestones;
  onProgressUpdate: (event: ProgressUpdateEvent) => void;
  isUpdatingProgress?: boolean;
  trackingConfig?: Partial<ProgressTrackingConfig>;
}

// Hook return type for milestone progress
export interface UseMilestoneProgressReturn {
  trackingState: MilestoneTrackingState;
  updateProgress: (event: ProgressUpdateEvent) => void;
  saveMilestone: (milestone: ProgressMilestone, currentTime: number, duration: number) => void;
  checkMilestone: (currentTime: number, duration: number) => void;
  handlePause: () => void;
  handlePlay: () => void;
  handleSeek: (newTime: number) => void;
  handleUnload: () => void;
  isLoading: boolean;
  error: string | null;
} 