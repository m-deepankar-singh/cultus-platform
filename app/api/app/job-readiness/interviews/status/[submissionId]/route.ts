import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { submissionId } = await params;
    console.log('🔍 Fetching submission:', submissionId);

    if (!submissionId) {
      console.log('❌ Missing submissionId');
      return NextResponse.json(
        { error: 'Missing submissionId' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('👤 User:', user?.id);
    console.log('🔍 Looking for submission:', submissionId, 'owned by:', user?.id);

    if (userError || !user) {
      console.log('❌ Unauthorized:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get submission from database - TEMPORARILY REMOVE USER CHECK
    const { data: submission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select(`
        id,
        student_id,
        status,
        ai_feedback,
        analysis_result,
        score,
        passed,
        final_verdict,
        created_at,
        analyzed_at,
        updated_at,
        questions_used,
        background_when_submitted,
        tier_when_submitted
      `)
      .eq('id', submissionId)
      // .eq('student_id', user.id)  // TEMPORARILY DISABLED
      .single();

    console.log('📊 Submission found:', !!submission);
    console.log('❌ Submission error:', submissionError);
    console.log('🔍 Submission student_id:', submission?.student_id);
    console.log('👤 Current user_id:', user.id);

    if (submissionError || !submission) {
      console.log('❌ Submission not found:', submissionError);
      return NextResponse.json(
        { error: 'Submission not found', details: submissionError },
        { status: 404 }
      );
    }

    // Check if user owns this submission
    if (submission.student_id !== user.id) {
      console.log('❌ User does not own this submission');
      return NextResponse.json(
        { error: 'Access denied - submission belongs to different user' },
        { status: 403 }
      );
    }

    console.log('✅ Success - returning submission data');

    // Return submission status and details
    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        feedback: submission.ai_feedback,
        analysis_result: submission.analysis_result,
        score: submission.score,
        passed: submission.passed,
        final_verdict: submission.final_verdict,
        createdAt: submission.created_at,
        analyzedAt: submission.analyzed_at,
        updatedAt: submission.updated_at,
        questionsUsed: submission.questions_used,
        background: submission.background_when_submitted,
        tier: submission.tier_when_submitted
      }
    });

  } catch (error) {
    console.error('💥 Error fetching submission status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 