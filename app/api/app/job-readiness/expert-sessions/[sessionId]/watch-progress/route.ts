import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

    // 2. Authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // 4. Get student information with enhanced validation
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students')
      .select('id, client_id, is_active')
      .eq('id', user.id)
      .single();

    if (studentFetchError) {
      console.error('Student Fetch Error:', studentFetchError);
      if (studentFetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Forbidden: Student record not found' },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: 'Internal Server Error: Could not fetch student record' },
        { status: 500 },
      );
    }

    if (!studentRecord.is_active) {
      return NextResponse.json(
        { error: 'Forbidden: Student account is inactive' },
        { status: 403 },
      );
    }

    const studentId = user.id;
    const clientId = studentRecord.client_id;

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
    const jobReadinessProducts = assignedProducts.filter(
      (item: any) => item.products.type === 'JOB_READINESS'
    );

    if (jobReadinessProducts.length === 0) {
      return NextResponse.json({ 
        error: 'This expert session is not assigned to any Job Readiness products' 
      }, { status: 404 });
    }

    // 7. Verify enrollment - student must be enrolled in at least one of the session's products
    let enrollmentVerified = false;
    
    if (product_id) {
      // If specific product_id provided, verify against it
      const sessionProductIds = jobReadinessProducts.map(item => item.product_id);
      if (sessionProductIds.includes(product_id)) {
        const { count: enrollmentCount, error: enrollmentError } = await supabase
          .from('client_product_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('product_id', product_id);

        if (!enrollmentError && enrollmentCount && enrollmentCount > 0) {
          enrollmentVerified = true;
        }
      }
    } else {
      // Check enrollment in any of the session's assigned products
      for (const productItem of jobReadinessProducts) {
        const { count: enrollmentCount, error: enrollmentError } = await supabase
          .from('client_product_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('product_id', productItem.product_id);

        if (!enrollmentError && enrollmentCount && enrollmentCount > 0) {
          enrollmentVerified = true;
          break;
        }
      }
    }

    if (!enrollmentVerified) {
      return NextResponse.json({ 
        error: 'Forbidden: Student not enrolled in any Job Readiness product that includes this expert session' 
      }, { status: 403 });
    }

    // 8. Get existing progress to check if session was already completed
    const { data: existingProgress, error: existingProgressError } = await supabase
      .from('job_readiness_expert_session_progress')
      .select('completion_percentage, is_completed, completed_at, last_milestone_reached')
      .eq('student_id', studentId)
      .eq('expert_session_id', validSessionId)
      .maybeSingle();

    if (existingProgressError && existingProgressError.code !== 'PGRST116') {
      console.error('Error checking existing progress:', existingProgressError);
      return NextResponse.json({ 
        error: 'Failed to check existing progress' 
      }, { status: 500 });
    }

    const wasAlreadyCompleted = existingProgress?.is_completed || false;

    // 9. Calculate completion percentage - use provided percentage if available, otherwise calculate
    const calculatedCompletionPercentage = Math.min(
      Math.round((watchTimeSeconds / videoDurationSeconds) * 100), 
      100
    );
    const finalCompletionPercentage = completion_percentage !== undefined ? 
      Math.min(Math.max(completion_percentage, 0), 100) : 
      calculatedCompletionPercentage;

    // Check if session should be marked as completed (95% threshold or force completion)
    const completionThreshold = 95;
    const isCompleted = finalCompletionPercentage >= completionThreshold || force_completion === true;

    // Prepare update data
    const updateData: any = {
      student_id: studentId,
      expert_session_id: validSessionId,
      watch_time_seconds: watchTimeSeconds,
      completion_percentage: finalCompletionPercentage,
      is_completed: isCompleted,
      updated_at: new Date().toISOString()
    };

    // Add milestone tracking if provided
    if (milestone !== undefined) {
      // Only update if this milestone is higher than the previously saved one
      const currentMilestone = existingProgress?.last_milestone_reached || 0;
      const milestoneInt = Math.floor(milestone); // Ensure integer for database
      if (milestoneInt > currentMilestone) {
        updateData.last_milestone_reached = milestoneInt;
        console.log(`Updating milestone from ${currentMilestone}% to ${milestoneInt}%`);
      } else {
        console.log(`Milestone ${milestoneInt}% not saved (current: ${currentMilestone}%)`);
      }
    }

    // Add completion timestamp if session is newly completed
    if (isCompleted && !wasAlreadyCompleted) {
      updateData.completed_at = new Date().toISOString();
    } else if (isCompleted && existingProgress?.completed_at) {
      // Keep existing completion timestamp
      updateData.completed_at = existingProgress.completed_at;
    }

    // 10. Upsert progress record
    const { data: progressRecord, error: progressError } = await supabase
      .from('job_readiness_expert_session_progress')
      .upsert(updateData, {
        onConflict: 'student_id, expert_session_id'
      })
      .select('completion_percentage, is_completed, completed_at, last_milestone_reached')
      .single();

    if (progressError) {
      console.error('Error updating progress:', progressError);
      return NextResponse.json({ 
        error: 'Failed to update watch progress' 
      }, { status: 500 });
    }

    // 11. Get updated count of completed sessions for star level progression
    const { data: completedSessions, error: countError } = await supabase
      .from('job_readiness_expert_session_progress')
      .select('expert_session_id')
      .eq('student_id', studentId)
      .eq('is_completed', true);

    if (countError) {
      console.error('Error counting completed sessions:', countError);
      return NextResponse.json({ 
        error: 'Failed to count completed sessions' 
      }, { status: 500 });
    }

    const completedSessionsCount = completedSessions?.length || 0;
    const requiredSessions = 5;
    const thirdStarUnlocked = completedSessionsCount >= requiredSessions;

    // 12. Check for star level progression AFTER saving progress (like course implementation)
    let starLevelUnlocked = false;
    let newStarLevel = undefined;
    
    // Only check if this session was just completed and we meet the requirements
    if (isCompleted && !wasAlreadyCompleted && thirdStarUnlocked) {
      console.log(`Expert session ${validSessionId} completed for student ${studentId}. Checking for star level progression...`);
      
      // Get student's current star level
      const { data: currentStudentData, error: studentDataError } = await supabase
        .from('students')
        .select('job_readiness_star_level')
        .eq('id', studentId)
        .single();

      if (!studentDataError && currentStudentData) {
        const currentStarLevel = currentStudentData.job_readiness_star_level;
        console.log(`Current star level: ${currentStarLevel}`);

        // Only award third star if student has second star but not third star yet
        if (currentStarLevel === 'TWO') {
          console.log('Student has second star, checking if enough expert sessions completed...');
          console.log(`Completed ${completedSessionsCount} expert sessions, required: ${requiredSessions}`);

          if (completedSessionsCount >= requiredSessions) {
            console.log('🌟 Sufficient expert sessions completed! Awarding third star...');
            
            starLevelUnlocked = true;
            newStarLevel = 'THREE';
            
            console.log(`Updating student ${studentId} with star level: THREE`);
            
            const { error: updateStudentError } = await supabase
              .from('students')
              .update({
                job_readiness_star_level: 'THREE',
                job_readiness_last_updated: new Date().toISOString(),
              })
              .eq('id', studentId);

            if (updateStudentError) {
              console.error('Error updating student star level:', updateStudentError);
              // Continue - don't fail the progress save
              starLevelUnlocked = false;
              newStarLevel = undefined;
            } else {
              console.log('🎉 Successfully awarded third star!');
            }
          } else {
            console.log(`Not enough expert sessions completed yet. Completed: ${completedSessionsCount}, Required: ${requiredSessions}`);
          }
        } else {
          console.log(`Student already has star level ${currentStarLevel}, no progression needed for expert sessions`);
        }
      } else {
        console.error('Error fetching current student data:', studentDataError);
      }
    }

    // 13. Return enhanced success response
    let message = 'Watch progress updated successfully';
    if (isCompleted && !wasAlreadyCompleted) {
      message += ` 🎉 Expert session completed!`;
      if (starLevelUnlocked) {
        message += ` 🌟 Congratulations! You've completed ${requiredSessions} expert sessions and unlocked your third star!`;
      }
    }

    const response: WatchProgressResponse = {
      success: true,
      message,
      progress: {
        expert_session_id: validSessionId,
        watch_time_seconds: watchTimeSeconds,
        completion_percentage: finalCompletionPercentage,
        is_completed: isCompleted,
        completed_at: progressRecord.completed_at,
        session_just_completed: isCompleted && !wasAlreadyCompleted,
        last_milestone_reached: progressRecord.last_milestone_reached,
        trigger_type: trigger_type
      },
      overall_progress: {
        completed_sessions_count: completedSessionsCount,
        required_sessions: requiredSessions,
        progress_percentage: Math.round((completedSessionsCount / requiredSessions) * 100),
        third_star_unlocked: thirdStarUnlocked
      },
      star_level_unlocked: starLevelUnlocked,
      new_star_level: newStarLevel
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in watch-progress POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 