import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';

const manualReviewSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  admin_feedback: z.string().min(1, 'Feedback is required')
});

/**
 * Admin endpoint to manually approve or reject an interview submission
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submission ID' },
        { status: 400 }
      );
    }

    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequestUltraFast(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Parse and validate request body
    const body = await req.json();
    const validation = manualReviewSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { status, admin_feedback } = validation.data;

    // Fetch the submission to make sure it exists
    const { data: submission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select('id, student_id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Update the submission with the admin review
    const { error: updateError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .update({
        status: 'completed',
        analysis_result: {
          overall_feedback: admin_feedback,
          status: status,
          reasoning: `Manually ${status.toLowerCase()} by administrator.`,
          admin_reviewed: true,
          admin_id: user.id,
          admin_review_time: new Date().toISOString()
        },
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    // Note: Admin action logging would go here if admin_action_logs table existed
    // For now, the action is logged in the analysis_result field
    

    // If the status is 'Approved', trigger star progression if applicable
    let starLevelUnlocked = false;
    let newStarLevel = '';
    
    if (status === 'Approved') {
      const starResult = await handleFifthStarProgression(submission.student_id, supabase);
      starLevelUnlocked = starResult.unlocked;
      newStarLevel = starResult.newLevel;
    }

    return NextResponse.json({
      success: true,
      message: starLevelUnlocked 
        ? `Interview approved and 5th star awarded! Student completed Job Readiness.`
        : `Interview submission ${status.toLowerCase()} successfully`,
      data: {
        submission_id: submissionId,
        status: status,
        star_level_unlocked: starLevelUnlocked,
        new_star_level: starLevelUnlocked ? newStarLevel : undefined
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process manual review' },
      { status: 500 }
    );
  }
}

/**
 * Handle fifth star progression for successful interview completion
 * Follows same pattern as expert sessions (3rd star) and projects (4th star)
 */
async function handleFifthStarProgression(studentId: string, supabase: any): Promise<{ unlocked: boolean; newLevel: string }> {
  try {
    // Get current star level from database (not JWT claims which might be stale)
    const { data: currentStudentData, error: studentError } = await supabase
      .from('students')
      .select('job_readiness_star_level')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('❌ Error fetching current student star level:', studentError);
      return { unlocked: false, newLevel: '' };
    }

    const currentStarLevel = currentStudentData?.job_readiness_star_level || 'NONE';
    console.log(`🌟 Admin manual review - Student ${studentId} current star level: ${currentStarLevel}`);
    
    if (currentStarLevel === 'FOUR') {
      console.log(`🌟 Student ${studentId} interview manually approved by admin with fourth star. Awarding fifth star!`);
      
      // Update student star level
      const { error: starUpdateError } = await supabase
        .from('students')
        .update({
          job_readiness_star_level: 'FIVE',
          job_readiness_last_updated: new Date().toISOString(),
        })
        .eq('id', studentId);

      if (!starUpdateError) {
        console.log('🎉 Successfully awarded fifth star via admin manual review!');
        return { unlocked: true, newLevel: 'FIVE' };
      } else {
        console.error('❌ Error updating student star level:', starUpdateError);
        return { unlocked: false, newLevel: '' };
      }
    } else {
      console.log(`📝 Student ${studentId} interview approved but current star level is ${currentStarLevel}, not FOUR. No star unlock.`);
      return { unlocked: false, newLevel: '' };
    }
  } catch (error) {
    console.error('Error in handleFifthStarProgression:', error);
    return { unlocked: false, newLevel: '' };
  }
} 