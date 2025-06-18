# Expert Sessions Enhanced Video Implementation Plan

## Overview

This plan outlines the implementation of enhanced video functionality for Job Readiness Expert Sessions, bringing the robust video experience from courses while maintaining controlled sequential viewing (no scrubbing) and lightweight database operations.

## Key Requirements

- **Controlled Sequential Viewing**: Users cannot scrub/seek through videos
- **Milestone-Based Progress**: Resume only from milestone checkpoints (10%, 25%, 50%, 75%, 90%, 95%, 100%)
- **Lightweight Database Operations**: Maintain current 4-6 queries per save (vs 6-10 in courses)
- **Enhanced UX**: Better video player, loading states, and progress visualization
- **Backward Compatibility**: Existing expert sessions continue to work

## Implementation Strategy

### Phase 1: Database Schema Enhancement (Minimal)
### Phase 2: Backend API Enhancement
### Phase 3: Enhanced Video Player Component
### Phase 4: Progress Context and State Management
### Phase 5: Integration and Testing
### Phase 6: Deployment and Migration

---

## Phase 1: Database Schema Enhancement

### 1.1 Add Resume Milestone Field

**File**: New migration in `supabase/migrations/`

```sql
-- Add resume milestone tracking to expert sessions progress
ALTER TABLE job_readiness_expert_session_progress 
ADD COLUMN resume_from_milestone INTEGER DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_expert_session_progress_resume 
ON job_readiness_expert_session_progress(student_id, expert_session_id, resume_from_milestone);

-- Update existing records to have proper resume milestones
UPDATE job_readiness_expert_session_progress 
SET resume_from_milestone = last_milestone_reached 
WHERE resume_from_milestone IS NULL;
```

**Estimated Time**: 1 hour
**DB Impact**: Minimal - one new column, backward compatible

### 1.2 Add Video Session Tracking (Optional)

```sql
-- Track video viewing sessions for analytics
ALTER TABLE job_readiness_expert_session_progress 
ADD COLUMN session_data JSONB DEFAULT '{}';

-- Example session_data structure:
-- {
--   "sessions": [
--     {
--       "started_at": "2024-01-15T10:00:00Z",
--       "ended_at": "2024-01-15T10:15:00Z", 
--       "milestones_reached": [10, 25],
--       "pauses": 2
--     }
--   ]
-- }
```

**Estimated Time**: 30 minutes

---

## Phase 2: Backend API Enhancement

### 2.1 Enhance Watch Progress API

**File**: `app/api/app/job-readiness/expert-sessions/[sessionId]/watch-progress/route.ts`

**Changes**:
- Add `resume_from_milestone` field support
- Enhance response with resume capabilities
- Add pause session tracking
- Keep existing milestone system

```typescript
// Enhanced request schema
const WatchProgressSchema = z.object({
  // Existing fields (keep all)
  watch_time_seconds: z.number().min(0).optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  video_duration: z.number().min(1).optional(),
  trigger_type: z.enum(['milestone', 'pause', 'seek', 'completion', 'unload']).optional(),
  milestone: z.number().min(0).max(100).optional(),
  
  // New fields
  resume_from_milestone: z.number().min(0).max(100).optional(),
  session_started: z.boolean().optional(),
  session_ended: z.boolean().optional(),
  pause_duration: z.number().min(0).optional()
});

// Enhanced response
interface WatchProgressResponse {
  // Existing fields (keep all)
  success: boolean;
  message: string;
  progress: {
    expert_session_id: string;
    watch_time_seconds: number;
    completion_percentage: number;
    is_completed: boolean;
    completed_at: string | null;
    session_just_completed: boolean;
    last_milestone_reached: number;
    
    // New fields
    resume_from_milestone: number;
    can_resume: boolean;
    resume_position_seconds: number; // Calculated from milestone
  };
  // Keep existing overall_progress and star fields
}
```

**Key Implementation Points**:
1. Calculate `resume_position_seconds` from milestone percentage and video duration
2. Update `resume_from_milestone` when user reaches new milestones
3. Maintain all existing star progression logic
4. Keep backward compatibility with old API calls

**Estimated Time**: 3 hours

### 2.2 Enhance Expert Sessions List API

**File**: `app/api/app/job-readiness/expert-sessions/route.ts`

**Changes**:
- Return resume information for each session
- Add video session analytics
- Enhance progress data

```typescript
// Enhanced session response
interface ExpertSessionWithProgress {
  // Existing fields (keep all)
  id: string;
  title: string;
  description: string;
  video_url: string;
  video_duration: number;
  created_at: string;
  
  // Enhanced student progress
  student_progress: {
    watch_time_seconds: number;
    completion_percentage: number;
    is_completed: boolean;
    completed_at: string | null;
    last_milestone_reached: number;
    
    // New resume functionality
    can_resume: boolean;
    resume_from_milestone: number;
    resume_position_seconds: number;
    milestones_unlocked: number[]; // [10, 25, 50] etc.
  };
}
```

**Estimated Time**: 2 hours

---

## Phase 3: Enhanced Video Player Component

### 3.1 Create ExpertSessionPlayer Component

**File**: `components/job-readiness/expert-sessions/ExpertSessionPlayer.tsx`

**Based on**: Course video player architecture but with controlled viewing

**Key Features**:
- **No scrubbing**: Disable seek bar interaction
- **No skip controls**: Remove forward/backward buttons
- **Milestone-based resume**: Start from last milestone
- **Enhanced loading states**: Better UX feedback
- **Silent progress saving**: Background milestone detection
- **Sequential viewing enforcement**: Prevent seeking via multiple methods

```typescript
interface ExpertSessionPlayerProps {
  sessionId: string;
  videoUrl: string;
  videoDuration: number;
  initialProgress: {
    resume_from_milestone: number;
    milestones_unlocked: number[];
    watch_time_seconds: number;
  };
  onMilestoneReached: (milestone: number) => void;
  onCompletion: () => void;
}

// Key implementation details:
// 1. Disable video element seeking: onSeeking handler
// 2. Pointer events disabled on progress bar
// 3. Resume from milestone position only
// 4. Milestone markers on progress bar (read-only)
// 5. Silent background progress saves
```

**Estimated Time**: 6 hours

### 3.2 Create Milestone Progress Indicator

**File**: `components/job-readiness/expert-sessions/MilestoneProgressBar.tsx`

**Features**:
- Visual milestone markers at 10%, 25%, 50%, 75%, 90%, 95%, 100%
- Show unlocked vs locked milestones
- Current position indicator
- No interactive elements (read-only)

**Estimated Time**: 2 hours

### 3.3 Create Video Controls Component

**File**: `components/job-readiness/expert-sessions/ExpertSessionControls.tsx`

**Allowed Controls**:
- Play/Pause button
- Volume control
- Fullscreen toggle
- **Disabled Controls**:
- No seek bar interaction
- No skip buttons
- No playback speed controls

**Estimated Time**: 2 hours

---

## Phase 4: Progress Context and State Management

### 4.1 Create Expert Session Progress Context

**File**: `components/job-readiness/expert-sessions/contexts/ExpertSessionProgressContext.tsx`

**Responsibilities**:
- Track milestone progress across session
- Handle background progress saves
- Manage resume state
- Provide progress updates to UI components
- Handle star level unlock notifications

```typescript
interface ExpertSessionProgressContextValue {
  // Progress state
  currentMilestone: number;
  milestonesUnlocked: number[];
  watchTimeSeconds: number;
  canResume: boolean;
  resumeFromMilestone: number;
  
  // Actions
  updateProgress: (data: ProgressUpdate) => Promise<void>;
  markMilestoneReached: (milestone: number) => Promise<void>;
  completeSession: () => Promise<void>;
  
  // UI state
  isSaving: boolean;
  hasError: boolean;
  justCompletedSession: boolean;
  starLevelUnlocked: boolean;
}
```

**Estimated Time**: 4 hours

### 4.2 Create Custom Hooks

**File**: `hooks/expert-sessions/useExpertSessionProgress.ts`

```typescript
export function useExpertSessionProgress(sessionId: string) {
  // Handle all progress tracking logic
  // Milestone detection
  // Background saves
  // Error handling
}

export function useExpertSessionPlayer(sessionId: string, videoRef: RefObject<HTMLVideoElement>) {
  // Handle video player specific logic
  // Pause detection
  // Milestone calculations
  // Sequential viewing enforcement
}
```

**Estimated Time**: 3 hours

---

## Phase 5: Integration and Testing

### 5.1 Update Expert Session Page

**File**: `app/(app)/app/job-readiness/expert-sessions/[sessionId]/page.tsx`

**Changes**:
- Replace existing video component with ExpertSessionPlayer
- Add progress context provider
- Integrate milestone-based resume
- Add enhanced loading states

**Estimated Time**: 3 hours

### 5.2 Update Expert Sessions List Page

**File**: `app/(app)/app/job-readiness/expert-sessions/page.tsx`

**Changes**:
- Show resume information for each session
- Display milestone progress
- Add "Resume from X%" functionality

**Estimated Time**: 2 hours

### 5.3 Testing Strategy

#### Unit Tests
- ExpertSessionPlayer component
- Progress context logic
- Milestone calculation utilities
- API endpoint validation

#### Integration Tests
- End-to-end video viewing flow
- Milestone progress tracking
- Resume functionality
- Star level progression
- Sequential viewing enforcement

#### Performance Tests
- Database query optimization
- Video loading performance
- Progress save frequency

**Estimated Time**: 8 hours

---

## Phase 6: Deployment and Migration

### 6.1 Database Migration

1. **Run schema migration** in staging environment
2. **Test existing expert sessions** continue to work
3. **Verify new features** work correctly
4. **Performance testing** under load

### 6.2 Feature Flag Implementation

```typescript
// Feature flag for enhanced video player
const useEnhancedVideoPlayer = process.env.NEXT_PUBLIC_ENHANCED_EXPERT_SESSIONS === 'true';

// Conditional rendering
{useEnhancedVideoPlayer ? (
  <ExpertSessionPlayer {...props} />
) : (
  <LegacyVideoPlayer {...props} />
)}
```

### 6.3 Rollout Strategy

1. **Internal testing**: Admin and test accounts
2. **Beta testing**: Small group of students
3. **Gradual rollout**: 25% → 50% → 100%
4. **Monitoring**: Track performance and user experience

**Estimated Time**: 4 hours

---

## Technical Specifications

### Database Queries per Save
- **Current**: 4-6 queries
- **Enhanced**: 4-6 queries (same!)
- **Courses (for comparison)**: 6-10 queries

### Video Player Constraints
```typescript
// Video element constraints
const videoConstraints = {
  seeking: false,           // onSeeking handler prevents
  scrubbing: false,         // pointer-events: none on progress bar
  skipControls: false,      // no forward/backward buttons
  playbackSpeed: false,     // locked to 1x speed
  chapters: false,          // no chapter navigation
};

// Allowed interactions
const allowedControls = {
  playPause: true,
  volume: true, 
  fullscreen: true,
  milestoneResume: true,    // only from milestone positions
};
```

### Milestone Positions
```typescript
const MILESTONES = [10, 25, 50, 75, 90, 95, 100]; // percentages
const COMPLETION_THRESHOLD = 95; // 95% for completion
const MIN_WATCH_TIME = 30; // seconds before milestone counts
```

---

## Timeline Estimate

| Phase | Description | Time |
|-------|-------------|------|
| 1 | Database Schema | 1.5 hours |
| 2 | Backend API Enhancement | 5 hours |
| 3 | Enhanced Video Player | 10 hours |
| 4 | Progress Context & Hooks | 7 hours |
| 5 | Integration & Testing | 13 hours |
| 6 | Deployment & Migration | 4 hours |
| **Total** | **Complete Implementation** | **40.5 hours** |

## Success Criteria

✅ **Functional Requirements**:
- Users cannot scrub through expert session videos
- Sequential viewing is enforced
- Resume works from milestone positions only
- All existing expert session functionality preserved
- Star progression continues to work

✅ **Performance Requirements**:
- Database queries remain at 4-6 per save
- Video loading performance maintained
- No regression in existing functionality

✅ **User Experience Requirements**:
- Enhanced video player with better UX
- Clear milestone progress visualization
- Smooth resume functionality
- Better loading and error states

## Risk Mitigation

1. **Backward Compatibility**: Feature flags and gradual rollout
2. **Performance**: Maintain query count, add monitoring
3. **User Experience**: Extensive testing before rollout
4. **Data Migration**: Careful schema changes with rollback plan

---

## Next Steps

1. **Review and approve** this implementation plan
2. **Set up development environment** with feature flags
3. **Begin Phase 1**: Database schema enhancement
4. **Parallel development**: Start frontend components while backend is being enhanced
5. **Continuous testing** throughout implementation 