# Session Cleanup Implementation Plan

## 🎯 Problem Statement

**Issue:** Browser crashes during live interviews leave sessions orphaned, preventing users from starting new interviews and causing resource leaks.

**Current Behavior:**
- ✅ Graceful disconnects (tab close, navigation) work perfectly
- ✅ Network disconnections handled with reconnection attempts
- ✅ Inactivity timeouts (10 minutes) trigger automatic cleanup
- ❌ **Browser process crashes** leave sessions stuck without cleanup

**Impact:**
- Users cannot start new interviews ("session already active")
- Resources remain allocated indefinitely
- System appears broken to users after crashes

## 🏗️ Solution Architecture

**Approach:** Ultra-simple database-backed session tracking with automatic cleanup
- **Philosophy:** Minimal code changes, maximum reliability
- **Strategy:** Leverage existing infrastructure completely
- **Fallback:** Manual "clear stuck session" for users

## 📊 Current System Analysis

### Database Infrastructure (Verified via Supabase MCP)
- **Project:** Cultus (meizvwwhasispvfbprck) - ACTIVE_HEALTHY
- **Region:** ap-southeast-1
- **Existing Tables:** `job_readiness_ai_interview_submissions` (23 columns)
- **Extensions:** pg_cron not available (use alternative cleanup)
- **Security:** RLS enabled on all interview tables

### Existing Session Manager
- **File:** `lib/ai/simple-session-manager.ts`
- **Cleanup Interval:** 60 seconds
- **Inactivity Timeout:** 5 minutes (INACTIVITY_TIMEOUT)
- **Max Session Duration:** 10 minutes (MAX_SESSION_DURATION)
- **Current Capability:** In-memory session tracking only

## 🛠️ Implementation Plan

### Phase 1: Database Schema (10 minutes)

**Migration File:** `supabase/migrations/20250124_interview_session_tracking.sql`

```sql
-- Create session tracking table
CREATE TABLE IF NOT EXISTS active_interview_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS to match existing security patterns
ALTER TABLE active_interview_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own sessions
CREATE POLICY "Users can manage their own interview sessions" 
ON active_interview_sessions
FOR ALL 
USING (auth.uid() = user_id);

-- Index for efficient cleanup queries
CREATE INDEX idx_active_sessions_created_at 
ON active_interview_sessions(created_at);

-- Index for user lookups
CREATE INDEX idx_active_sessions_user_id 
ON active_interview_sessions(user_id);

-- Add helpful comments
COMMENT ON TABLE active_interview_sessions IS 'Tracks active interview sessions to prevent orphaned sessions from browser crashes';
COMMENT ON COLUMN active_interview_sessions.user_id IS 'Student conducting the interview';
COMMENT ON COLUMN active_interview_sessions.session_id IS 'Unique session identifier from LiveInterviewContext';
COMMENT ON COLUMN active_interview_sessions.status IS 'Session status: active (in progress) or completing (cleanup in progress)';
```

**Apply Migration:**
```bash
# Use Supabase MCP to apply migration
mcp__supabase__apply_migration --project_id meizvwwhasispvfbprck --name interview_session_tracking --query [above_sql]
```

### Phase 2: Session Registration (30 minutes)

**File:** `components/job-readiness/contexts/LiveInterviewContext.tsx`

**Location 1: Session Creation in `startInterview()` function (around line 644)**
```typescript
const startInterview = useCallback(async (questions: InterviewQuestion[]) => {
  console.log('🎯 startInterview called with questions:', questions);
  
  // Store questions immediately
  setGeneratedQuestions(questions);
  setPendingQuestions(questions);
  
  // 🆕 Register session in database for crash recovery
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.from('active_interview_sessions').upsert({
      user_id: user.id, // Assuming user is available in context
      session_id: sessionIdRef.current,
      status: 'active'
    });
    console.log('✅ Session registered in database:', sessionIdRef.current);
  } catch (error) {
    console.warn('⚠️ Failed to register session in database:', error);
    // Don't block interview start - this is just for crash recovery
  }
  
  // ... rest of existing startInterview logic
}, [connected, error, connect]);
```

**Location 2: Session Cleanup in `disconnect()` function (around line 419)**
```typescript
const disconnect = useCallback(() => {
  console.log('🔌 Disconnecting WebSocket and cleaning up resources');
  
  // 🆕 Clean up database session record
  const cleanupDatabaseSession = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('active_interview_sessions')
        .delete()
        .eq('user_id', user.id); // Assuming user is available
      console.log('✅ Database session cleaned up');
    } catch (error) {
      console.warn('⚠️ Failed to cleanup database session:', error);
    }
  };
  
  // Clear all session timers
  clearSessionTimers();
  
  // ... existing disconnect logic ...
  
  // Clean up database session (don't await to avoid blocking)
  cleanupDatabaseSession();
  
  console.log('✅ All interview resources cleaned up');
}, [client, recording, screenRecorder, audioRecorder, stopTimer, clearSessionTimers]);
```

**Location 3: Session Cleanup in `submitInterview()` function (around line 355)**
```typescript
const submitInterview = useCallback(async (): Promise<string | null> => {
  if (!recording || !screenRecorder) return null;
  
  try {
    setUploading(true);
    setUploadProgress(0);
    
    // 🆕 Mark session as completing in database
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('active_interview_sessions')
        .update({ status: 'completing' })
        .eq('user_id', user.id);
    } catch (error) {
      console.warn('⚠️ Failed to update session status:', error);
    }
    
    // ... existing submission logic ...
    
    // 🆕 Remove session from database after successful submission
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase
        .from('active_interview_sessions')
        .delete()
        .eq('user_id', user.id);
      console.log('✅ Session removed after successful submission');
    } catch (error) {
      console.warn('⚠️ Failed to remove session after submission:', error);
    }
    
    return null; // Will be handled by upload callback
    
  } catch (err) {
    // ... existing error handling ...
  }
}, [recording, screenRecorder, backgroundId, generatedQuestions, stopTimer, uploadFile]);
```

### Phase 3: Pre-Interview Session Check (30 minutes)

**File:** `app/(app)/app/job-readiness/interviews/page.tsx`

**Add session check component before interview start:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth'; // Assuming auth hook exists
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 🆕 Add stuck session detection component
function StuckSessionCheck({ onSessionCleared }: { onSessionCleared: () => void }) {
  const { user } = useAuth();
  const [hasStuckSession, setHasStuckSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Check for existing stuck session
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: existingSession } = await supabase
          .from('active_interview_sessions')
          .select('created_at, session_id')
          .eq('user_id', user.id)
          .single();

        if (existingSession) {
          console.log('🔍 Found existing session:', existingSession.session_id);
          setHasStuckSession(true);
        }
      } catch (error) {
        // No session found - this is good
        console.log('✅ No stuck session detected');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [user]);

  const clearStuckSession = async () => {
    if (!user) return;

    setClearing(true);
    try {
      const supabase = createClient();
      await supabase
        .from('active_interview_sessions')
        .delete()
        .eq('user_id', user.id);
      
      console.log('✅ Stuck session cleared');
      setHasStuckSession(false);
      onSessionCleared();
    } catch (error) {
      console.error('❌ Failed to clear stuck session:', error);
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Checking for active sessions...</div>;
  }

  if (!hasStuckSession) {
    return null;
  }

  return (
    <Card className="p-6 mb-6 border-amber-200 bg-amber-50">
      <div className="flex items-start space-x-4">
        <div className="text-amber-600">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800">Previous Session Detected</h3>
          <p className="text-amber-700 mt-1">
            It looks like your previous interview session didn't close properly. 
            This can happen if your browser crashed or lost connection.
          </p>
          <Button 
            onClick={clearStuckSession}
            disabled={clearing}
            className="mt-3"
            variant="outline"
          >
            {clearing ? 'Clearing...' : 'Clear Previous Session & Continue'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// 🆕 Integrate into existing interview page component
export default function InterviewsPage() {
  const [sessionCleared, setSessionCleared] = useState(false);

  return (
    <div className="container mx-auto py-8">
      {/* Add stuck session check at the top */}
      <StuckSessionCheck onSessionCleared={() => setSessionCleared(true)} />
      
      {/* Rest of existing interview page content */}
      {/* ... existing JSX ... */}
    </div>
  );
}
```

### Phase 4: Automatic Database Cleanup (20 minutes)

**File:** `lib/ai/simple-session-manager.ts`

**Enhance existing cleanup function (around line 96):**
```typescript
/**
 * Check for inactive sessions and disconnect them
 */
private async checkInactiveSessions(): void {
  const now = Date.now();
  const sessionsToRemove: string[] = [];

  // ... existing in-memory cleanup logic ...

  // Remove disconnected sessions
  sessionsToRemove.forEach(sessionId => {
    this.sessions.delete(sessionId);
  });

  if (sessionsToRemove.length > 0) {
    console.log(`🧹 Cleaned up ${sessionsToRemove.length} inactive sessions`);
  }

  // 🆕 Add database cleanup for orphaned sessions
  await this.cleanupDatabaseSessions();
}

// 🆕 Add new method for database cleanup
private async cleanupDatabaseSessions(): void {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Clean up sessions older than 15 minutes (more generous than in-memory timeout)
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('active_interview_sessions')
      .delete()
      .lt('created_at', cutoffTime)
      .select('user_id, session_id');

    if (error) {
      console.warn('⚠️ Database session cleanup failed:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`🗑️ Cleaned up ${data.length} orphaned database sessions:`, 
        data.map(s => s.session_id));
    }
  } catch (error) {
    console.warn('⚠️ Database session cleanup error:', error);
    // Don't throw - this is background cleanup
  }
}
```

## 🧪 Testing Strategy

### Manual Testing Checklist

**Test 1: Normal Interview Flow**
- [ ] Start interview → Verify record created in `active_interview_sessions`
- [ ] Complete interview → Verify record removed from `active_interview_sessions`
- [ ] Check for any console errors during normal flow

**Test 2: Browser Crash Simulation**
- [ ] Start interview → Force close browser tab (Cmd+W / Ctrl+W)
- [ ] Reopen application → Verify "Previous Session Detected" message appears
- [ ] Click "Clear Previous Session" → Verify can start new interview
- [ ] Complete new interview normally

**Test 3: Network Disconnection**
- [ ] Start interview → Disconnect network for 30 seconds
- [ ] Reconnect network → Verify automatic recovery works
- [ ] Complete interview → Verify database cleanup happens

**Test 4: Automatic Cleanup**
- [ ] Start interview → Force close browser (simulate crash)
- [ ] Wait 16 minutes → Check database: `SELECT * FROM active_interview_sessions`
- [ ] Verify old session was automatically cleaned up

**Test 5: Multiple Users**
- [ ] User A starts interview (don't close)
- [ ] User B starts interview → Verify no interference
- [ ] Both users complete → Verify separate cleanup

### Database Verification Queries

**Check active sessions:**
```sql
SELECT 
  user_id, 
  session_id, 
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as age_minutes
FROM active_interview_sessions 
ORDER BY created_at DESC;
```

**Verify cleanup is working:**
```sql
-- Should return 0 rows after 15+ minutes
SELECT COUNT(*) as old_sessions 
FROM active_interview_sessions 
WHERE created_at < NOW() - INTERVAL '15 minutes';
```

## 🚀 Deployment Plan

### Pre-Deployment
1. **Apply database migration** using Supabase MCP
2. **Verify migration** in development environment
3. **Code review** all changes
4. **Unit test** session manager enhancements

### Deployment Steps
1. **Deploy during low-traffic hours** (if possible)
2. **Monitor active_interview_sessions table** size after deployment
3. **Watch application logs** for session cleanup messages
4. **Test crash recovery** with real users immediately after deploy

### Rollback Plan
```sql
-- Emergency rollback: drop the table
DROP TABLE IF EXISTS active_interview_sessions CASCADE;
```
- **Risk:** Very low (only adds functionality, doesn't change existing behavior)
- **Impact:** System returns to original state (no crash recovery)

### Monitoring
- **Database size:** Monitor `active_interview_sessions` table growth
- **Cleanup effectiveness:** Check for sessions older than 15 minutes
- **User experience:** Monitor support tickets about "can't start interview"

## 📊 Success Metrics

### Functional Requirements
- ✅ Users never blocked by stuck sessions after browser crashes
- ✅ Database session records cleaned up within 15 minutes maximum
- ✅ Normal interview flow unchanged and working perfectly
- ✅ Zero permanent resource leaks

### Performance Requirements
- ✅ Database operations add <50ms overhead per interview
- ✅ Cleanup runs efficiently without impacting system performance
- ✅ Table size remains small (< 100 active sessions typically)

### User Experience
- ✅ Clear, helpful messaging when stuck session detected
- ✅ One-click recovery from browser crash scenarios
- ✅ No technical jargon in user-facing messages

## 🕒 Implementation Timeline

### Day 1: Setup & Core Implementation (90 minutes)
- **0:00-0:10** Apply database migration via Supabase MCP
- **0:10-0:40** Add session registration to `LiveInterviewContext.tsx`
- **0:40-1:10** Add pre-interview session check to interviews page
- **1:10-1:30** Enhance session manager with database cleanup

### Day 1: Testing & Verification (30 minutes)
- **1:30-1:45** Manual testing of normal flow
- **1:45-2:00** Browser crash simulation and recovery testing

### Day 2: Deployment (if needed)
- Monitor in production
- Verify cleanup is working
- Address any edge cases

**Total Effort: 2 hours development + testing**

## 🔧 Maintenance

### Ongoing Monitoring
- **Weekly:** Check `active_interview_sessions` table size
- **Monthly:** Verify automatic cleanup is working (no old records)
- **As needed:** Review logs for cleanup effectiveness

### Potential Enhancements (Future)
- Add session duration tracking for analytics
- Implement session transfer between devices
- Add admin dashboard for session monitoring

## 📚 References

### Database Schema
- **Table:** `active_interview_sessions`
- **Primary Key:** `user_id` (one session per user)
- **Indexes:** `created_at` (cleanup), `user_id` (lookups)
- **Security:** RLS enabled, user can only see their own sessions

### Key Files Modified
1. `supabase/migrations/20250124_interview_session_tracking.sql` - Database schema
2. `components/job-readiness/contexts/LiveInterviewContext.tsx` - Session registration
3. `app/(app)/app/job-readiness/interviews/page.tsx` - Stuck session detection
4. `lib/ai/simple-session-manager.ts` - Automatic database cleanup

### Related Systems
- **Session Manager:** Handles in-memory session tracking and timeouts
- **Interview Submissions:** Stores completed interview data
- **Authentication:** Provides user context for session association

---

**This implementation provides bulletproof protection against browser crash scenarios while maintaining the existing excellent user experience and system reliability.**