import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/app/job-readiness/expert-sessions/{sessionId}/watch-progress
 * Update student's watch progress for a specific expert session video
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Validate request body - support both old and new parameter names for compatibility
    const { 
      current_time_seconds, 
      total_duration_seconds,
      watch_time_seconds,
      completion_percentage,
      video_duration,
      force_completion
    } = body;

    // Use new parameter names if provided, otherwise fall back to old names
    const watchTimeSeconds = watch_time_seconds !== undefined ? watch_time_seconds : current_time_seconds;
    const videoDurationSeconds = video_duration !== undefined ? video_duration : total_duration_seconds;
    const providedCompletionPercentage = completion_percentage;

    if (typeof watchTimeSeconds !== 'number' || watchTimeSeconds < 0) {
      return NextResponse.json({ 
        error: 'watch_time_seconds (or current_time_seconds) must be a non-negative number' 
      }, { status: 400 });
    }

    if (typeof videoDurationSeconds !== 'number' || videoDurationSeconds <= 0) {
      return NextResponse.json({ 
        error: 'video_duration (or total_duration_seconds) must be a positive number' 
      }, { status: 400 });
    }

    // Verify expert session exists and is active
    const { data: expertSession, error: sessionError } = await supabase
      .from('job_readiness_expert_sessions')
      .select('id, video_duration, is_active')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !expertSession) {
      return NextResponse.json({ 
        error: 'Expert session not found or is not active' 
      }, { status: 404 });
    }

    // Calculate completion percentage - use provided percentage if available, otherwise calculate
    const calculatedCompletionPercentage = Math.min(
      Math.round((watchTimeSeconds / videoDurationSeconds) * 100), 
      100
    );
    const completionPercentage = providedCompletionPercentage !== undefined ? 
      Math.min(Math.max(providedCompletionPercentage, 0), 100) : 
      calculatedCompletionPercentage;

    // Check if session should be marked as completed (95% threshold or force completion)
    const completionThreshold = 95;
    const isCompleted = completionPercentage >= completionThreshold || force_completion === true;

    // Prepare update data
    const updateData: any = {
      student_id: student.id,
      expert_session_id: sessionId,
      watch_time_seconds: watchTimeSeconds,
      completion_percentage: completionPercentage,
      is_completed: isCompleted
    };

    // Add completion timestamp if session is completed
    if (isCompleted) {
      updateData.completed_at = new Date().toISOString();
    }

    // Upsert progress record
    const { data: progressRecord, error: progressError } = await supabase
      .from('job_readiness_expert_session_progress')
      .upsert(updateData, {
        onConflict: 'student_id, expert_session_id'
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error updating progress:', progressError);
      return NextResponse.json({ 
        error: 'Failed to update watch progress' 
      }, { status: 500 });
    }

    // Get updated count of completed sessions for this student
    const { data: completedSessions, error: countError } = await supabase
      .from('job_readiness_expert_session_progress')
      .select('expert_session_id')
      .eq('student_id', student.id)
      .eq('is_completed', true);

    if (countError) {
      console.error('Error counting completed sessions:', countError);
    }

    const completedSessionsCount = completedSessions?.length || 0;
    const requiredSessions = 5;
    const thirdStarUnlocked = completedSessionsCount >= requiredSessions;

    // If this completion unlocks the 3rd star, we might want to update student progress
    // This would typically trigger other module unlocks (Projects, etc.)
    if (isCompleted && !progressRecord.is_completed && thirdStarUnlocked) {
      // Here you could trigger additional logic to unlock Star 3 and Projects module
      // For now, we'll just log this event
      console.log(`Student ${student.id} has completed ${completedSessionsCount} expert sessions and may have unlocked Star 3`);
    }

    return NextResponse.json({
      message: 'Watch progress updated successfully',
      progress: {
        expert_session_id: sessionId,
        watch_time_seconds: watchTimeSeconds,
        completion_percentage: completionPercentage,
        is_completed: isCompleted,
        completed_at: progressRecord.completed_at,
        session_just_completed: isCompleted && !progressRecord.is_completed
      },
      overall_progress: {
        completed_sessions_count: completedSessionsCount,
        required_sessions: requiredSessions,
        progress_percentage: Math.round((completedSessionsCount / requiredSessions) * 100),
        third_star_unlocked: thirdStarUnlocked
      }
    });

  } catch (error) {
    console.error('Unexpected error in watch-progress POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 