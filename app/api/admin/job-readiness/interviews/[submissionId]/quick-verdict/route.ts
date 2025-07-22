import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { authenticateApiRequestUltraFast } from '@/lib/auth/api-auth';

const quickVerdictSchema = z.object({
  admin_verdict_override: z.enum(['approved', 'rejected']),
  override_reason: z.string().optional().default('Quick verdict change via admin toggle'),
});

/**
 * Quick verdict change endpoint for interview submissions
 * Allows admins to quickly toggle between approved/rejected
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
    const authResult = await authenticateApiRequestUltraFast(['Admin', 'Staff']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Parse and validate request body
    const body = await req.json();
    const validation = quickVerdictSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { admin_verdict_override, override_reason } = validation.data;

    // Fetch the submission to make sure it exists and get current data
    const { data: submission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select('id, student_id, ai_verdict, admin_verdict_override, analysis_result')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Update the submission with the admin verdict override
    const updatedAnalysisResult = {
      ...submission.analysis_result,
      admin_verdict_override: admin_verdict_override,
      admin_override_reason: override_reason,
      admin_override_by: user.id,
      admin_override_at: new Date().toISOString(),
      final_verdict: admin_verdict_override, // Admin override becomes final verdict
    };

    const { error: updateError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .update({
        admin_verdict_override: admin_verdict_override,
        final_verdict: admin_verdict_override,
        analysis_result: updatedAnalysisResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission verdict:', updateError);
      return NextResponse.json(
        { error: 'Failed to update verdict' },
        { status: 500 }
      );
    }

    // Check for fifth star unlock if admin approved the interview
    let starLevelUnlocked = false;
    let newStarLevel = '';
    
    if (admin_verdict_override === 'approved') {
      const starResult = await handleFifthStarProgression(submission.student_id, supabase);
      starLevelUnlocked = starResult.unlocked;
      newStarLevel = starResult.newLevel;
    }

    // Note: Admin action logging would go here if admin_action_logs table existed
    // For now, the action is logged in the analysis_result field

    return NextResponse.json({
      success: true,
      message: starLevelUnlocked 
        ? `Interview approved and 5th star awarded! Student completed Job Readiness.`
        : `Interview verdict changed to ${admin_verdict_override}`,
      data: {
        submission_id: submissionId,
        admin_verdict_override,
        final_verdict: admin_verdict_override,
        star_level_unlocked: starLevelUnlocked,
        new_star_level: starLevelUnlocked ? newStarLevel : undefined,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in quick verdict change:', error);
    return NextResponse.json(
      { error: 'Failed to process verdict change' },
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
    console.log(`🌟 Admin approval - Student ${studentId} current star level: ${currentStarLevel}`);
    
    if (currentStarLevel === 'FOUR') {
      console.log(`🌟 Student ${studentId} interview approved by admin with fourth star. Awarding fifth star!`);
      
      // Update student star level
      const { error: starUpdateError } = await supabase
        .from('students')
        .update({
          job_readiness_star_level: 'FIVE',
          job_readiness_last_updated: new Date().toISOString(),
        })
        .eq('id', studentId);

      if (!starUpdateError) {
        console.log('🎉 Successfully awarded fifth star via admin approval!');
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