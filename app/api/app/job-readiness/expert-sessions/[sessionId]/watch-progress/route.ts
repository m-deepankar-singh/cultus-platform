import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Schema for watch progress validation with milestone support and backward compatibility
const WatchProgressSchema = z.object({
  current_time_seconds: z.number().min(0).optional(),
  total_duration_seconds: z.number().min(1).optional(),
  watch_time_seconds: z.number().min(0).optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
  video_duration: z.number().min(1).optional(),
  force_completion: z.boolean().optional().default(false),
  product_id: z.string().uuid().optional(), // For enrollment verification
  
  // New milestone-based fields
  trigger_type: z.enum(['milestone', 'pause', 'seek', 'completion', 'unload']).optional(),
  milestone: z.number().min(0).max(100).optional()
}).refine(
  (data) => {
    // Either new format (watch_time_seconds + video_duration) or old format (current_time_seconds + total_duration_seconds) must be provided
    const hasNewFormat = data.watch_time_seconds !== undefined && data.video_duration !== undefined;
    const hasOldFormat = data.current_time_seconds !== undefined && data.total_duration_seconds !== undefined;
    return hasNewFormat || hasOldFormat;
  },
  {
    message: "Either (watch_time_seconds and video_duration) or (current_time_seconds and total_duration_seconds) must be provided"
  }
);

const SessionIdSchema = z.string().uuid({ message: 'Invalid Session ID format' });

interface WatchProgressResponse {
  success: boolean;
  message: string;
  progress: {
    expert_session_id: string;
    watch_time_seconds: number;
    completion_percentage: number;
    is_completed: boolean;
    completed_at: string | null;
    session_just_completed: boolean;
    last_milestone_reached?: number;
    trigger_type?: string;
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

/**
 * POST /api/app/job-readiness/expert-sessions/{sessionId}/watch-progress
 * Update student's watch progress for a specific expert session video
 * Robust implementation with proper validation, enrollment checking, and star progression
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // 1. Validate sessionId
    const { sessionId } = await params;
    const sessionIdValidation = SessionIdSchema.safeParse(sessionId);
    if (!sessionIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Session ID format', details: sessionIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validSessionId = sessionIdValidation.data;

    // 2. JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // 3. Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = WatchProgressSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid watch progress data',
          details: validation.error.format()
        },
        { status: 400 }
      );
    }

    const { 
      current_time_seconds, 
      total_duration_seconds,
      watch_time_seconds,
      completion_percentage,
      video_duration,
      force_completion,
      product_id,
      trigger_type,
      milestone
    } = validation.data;

    // Use new parameter names if provided, otherwise fall back to old names for backward compatibility
    // Ensure we convert to integers to match database schema
    const watchTimeSeconds = Math.floor(watch_time_seconds !== undefined ? watch_time_seconds : current_time_seconds || 0);
    const videoDurationSeconds = Math.floor(video_duration !== undefined ? video_duration : total_duration_seconds || 0);

    if (!videoDurationSeconds || videoDurationSeconds <= 0) {
      return NextResponse.json({ 
        error: 'video_duration (or total_duration_seconds) must be a positive number' 
      }, { status: 400 });
    }

    // Log milestone debugging information
    if (trigger_type && milestone !== undefined) {
      console.log(`Milestone progress save: Session ${validSessionId}, Student ${user.id}`);
      console.log(`  - Trigger: ${trigger_type}`);
      console.log(`  - Milestone: ${milestone}%`);
      console.log(`  - Watch time: ${watchTimeSeconds}s / ${videoDurationSeconds}s`);
      console.log(`  - Calculated completion: ${Math.round((watchTimeSeconds / videoDurationSeconds) * 100)}%`);
    }

    // Check if student account is active (from JWT claims)
    if (!claims.profile_is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 }
      );
    }

    // Get client_id from JWT claims instead of database lookup
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Forbidden: Student not linked to a client' },
        { status: 403 }
      );
    }

    const studentId = user.id;

    // 5. Verify expert session exists and get associated products
    const { data: expertSessionData, error: sessionError } = await supabase
      .from('job_readiness_expert_sessions')
      .select(`
        id, 
        title,
        video_duration, 
        is_active,
        job_readiness_expert_session_products (
          product_id,
          products (
            id, 
            name, 
            type
          )
        )
      `)
      .eq('id', validSessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !expertSessionData) {
      console.error(`Error fetching expert session ${validSessionId}:`, sessionError);
      return NextResponse.json({ 
        error: 'Expert session not found or is not active' 
      }, { status: 404 });
    }

    // 6. Verify this session is assigned to Job Readiness products
    const assignedProducts = expertSessionData.job_readiness_expert_session_products || [];
    
    if (assignedProducts.length === 0) {
      return NextResponse.json({ 
        error: 'Expert session not assigned to any Job Readiness products' 
      }, { status: 404 });
    }

    // 7. Verify enrollment - check if student's client has access to at least one of the products
    const productIds = assignedProducts.map((p: any) => p.product_id);
    
    const { data: clientAssignments, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('product_id')
      .eq('client_id', clientId)
      .in('product_id', productIds);

    if (assignmentError || !clientAssignments || clientAssignments.length === 0) {
      return NextResponse.json({ 
        error: 'Forbidden: Student not enrolled in any Job Readiness product containing this expert session' 
      }, { status: 403 });
    }

    // 8. Calculate completion details
    const calculatedCompletionPercentage = Math.round((watchTimeSeconds / videoDurationSeconds) * 100);
    const finalCompletionPercentage = completion_percentage !== undefined ? completion_percentage : calculatedCompletionPercentage;
    const isCompleted = finalCompletionPercentage >= 95 || force_completion; // 95% threshold or forced completion

    // 9. Get current progress to check if this is a new completion
    const { data: existingProgress, error: existingProgressError } = await supabase
      .from('job_readiness_expert_session_progress')
      .select('watch_time_seconds, completion_percentage, is_completed, last_milestone_reached')
      .eq('student_id', studentId)
      .eq('expert_session_id', validSessionId)
      .maybeSingle();

    const wasAlreadyCompleted = existingProgress?.is_completed || false;
    const sessionJustCompleted = isCompleted && !wasAlreadyCompleted;

    // Get current milestone for comparison
    const currentMilestone = existingProgress?.last_milestone_reached || 0;
    const newMilestone = milestone !== undefined ? Math.max(milestone, currentMilestone) : currentMilestone;

    // 10. Update progress
    const progressData = {
      student_id: studentId,
      expert_session_id: validSessionId,
      watch_time_seconds: Math.max(watchTimeSeconds, existingProgress?.watch_time_seconds || 0),
      completion_percentage: Math.max(finalCompletionPercentage, existingProgress?.completion_percentage || 0),
      is_completed: isCompleted,
      completed_at: isCompleted && !wasAlreadyCompleted ? new Date().toISOString() : existingProgress?.completed_at || null,
      last_milestone_reached: newMilestone,
      updated_at: new Date().toISOString()
    };

    const { error: progressUpdateError } = await supabase
      .from('job_readiness_expert_session_progress')
      .upsert(progressData, {
        onConflict: 'student_id,expert_session_id'
      });

    if (progressUpdateError) {
      console.error('Error updating expert session progress:', progressUpdateError);
      return NextResponse.json(
        { error: 'Failed to update watch progress', details: progressUpdateError.message },
        { status: 500 }
      );
    }

    // 11. Calculate overall expert session progress across all sessions
    const { data: allSessionsProgress, error: allProgressError } = await supabase
      .from('job_readiness_expert_session_progress')
      .select('expert_session_id, is_completed')
      .eq('student_id', studentId);

    const completedSessionsCount = allSessionsProgress?.filter((p: any) => p.is_completed).length || 0;
    const requiredSessions = 5; // Job Readiness requirement
    const overallProgressPercentage = Math.round((completedSessionsCount / requiredSessions) * 100);

    // 12. Check for third star unlock (requires 5 completed expert sessions)
    let starLevelUnlocked = false;
    let newStarLevel = '';
    let thirdStarUnlocked = false;

    if (sessionJustCompleted && completedSessionsCount >= requiredSessions) {
      // Get current star level from JWT claims
      const currentStarLevel = claims.job_readiness_star_level || 'NONE';
      
      if (currentStarLevel === 'TWO') {
        console.log(`🌟 Student ${studentId} completed 5+ expert sessions with second star. Awarding third star!`);
        
        // Update student star level
        const { error: starUpdateError } = await supabase
          .from('students')
          .update({
            job_readiness_star_level: 'THREE',
            job_readiness_last_updated: new Date().toISOString(),
          })
          .eq('id', studentId);

        if (!starUpdateError) {
          starLevelUnlocked = true;
          newStarLevel = 'THREE';
          thirdStarUnlocked = true;
          console.log('🎉 Successfully awarded third star!');
        } else {
          console.error('Error updating student star level:', starUpdateError);
        }
      } else {
        console.log(`Student ${studentId} completed 5+ expert sessions but current star level is ${currentStarLevel}, not TWO. No star unlock.`);
      }
    }

    const response: WatchProgressResponse = {
      success: true,
      message: sessionJustCompleted 
        ? (thirdStarUnlocked 
            ? `🎉 Expert session completed! You've unlocked your third star!` 
            : `Expert session completed successfully!`)
        : 'Watch progress updated successfully',
      progress: {
        expert_session_id: validSessionId,
        watch_time_seconds: progressData.watch_time_seconds,
        completion_percentage: progressData.completion_percentage,
        is_completed: progressData.is_completed,
        completed_at: progressData.completed_at,
        session_just_completed: sessionJustCompleted,
        last_milestone_reached: newMilestone,
        trigger_type: trigger_type
      },
      overall_progress: {
        completed_sessions_count: completedSessionsCount,
        required_sessions: requiredSessions,
        progress_percentage: overallProgressPercentage,
        third_star_unlocked: thirdStarUnlocked
      },
      star_level_unlocked: starLevelUnlocked,
      new_star_level: starLevelUnlocked ? newStarLevel : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in expert session watch progress:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
} 