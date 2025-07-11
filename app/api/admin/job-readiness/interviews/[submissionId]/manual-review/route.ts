import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';

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
    const authResult = await authenticateApiRequestSecure(['Admin']);
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
    

    // If the status is 'Approved', trigger tier promotion if applicable
    if (status === 'Approved') {
      await handleApprovedInterview(submission.student_id, supabase);
    }

    return NextResponse.json({
      success: true,
      message: `Interview submission ${status.toLowerCase()} successfully`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process manual review' },
      { status: 500 }
    );
  }
}

/**
 * Handles approved interviews, potentially promoting the student's tier
 */
async function handleApprovedInterview(studentId: string, supabase: any): Promise<void> {
  try {
    // Get current student tier
    const { data: student, error } = await supabase
      .from('students')
      .select('job_readiness_tier')
      .eq('id', studentId)
      .single();
    
    if (error || !student) {
      return;
    }
    
    // Logic for tier promotion could be implemented here
    // For example, from THREE to FOUR upon successful interview
    if (student.job_readiness_tier === 'THREE') {
      await supabase
        .from('students')
        .update({ job_readiness_tier: 'FOUR' })
        .eq('id', studentId);
    }
  } catch (error) {
  }
} 