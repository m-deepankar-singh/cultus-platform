import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';

/**
 * Retrieves the analysis results for a submitted interview
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submissionId } = params;

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submission ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the submission with analysis results
    const { data: submission, error } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select(`
        id,
        student_id,
        status,
        analysis_result,
        created_at,
        analyzed_at
      `)
      .eq('id', submissionId)
      .single();

    if (error) {
      console.error('Error fetching submission:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve submission' },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Check if the user owns this submission or is an admin
    if (submission.student_id !== user.id) {
      // TODO: Check if user is admin when admin access is needed
      return NextResponse.json(
        { error: 'You do not have permission to view this submission' },
        { status: 403 }
      );
    }

    // Format the response based on the submission status
    const response: any = {
      id: submission.id,
      status: submission.status,
      createdAt: submission.created_at
    };

    // Add analysis results if available
    if (submission.status === 'completed') {
      response.analysis = submission.analysis_result;
      response.analyzedAt = submission.analyzed_at;
    } 
    else if (submission.status === 'pending_manual_review') {
      response.message = 'Your interview is being reviewed manually. Results will be available soon.';
    }
    else if (submission.status === 'analysis_failed') {
      response.message = 'There was an issue analyzing your interview. Please contact support if this persists.';
    }
    else {
      response.message = 'Your interview is still being processed. Please check back later.';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error retrieving analysis:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analysis results' },
      { status: 500 }
    );
  }
} 