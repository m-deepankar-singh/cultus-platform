import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    const studentId = user.id;

    // Parse JSON request body (replaces FormData parsing)
    const body = await request.json();
    const { video_url, video_storage_path, questions, backgroundId } = body;

    if (!video_url || !video_storage_path || !questions) {
      return NextResponse.json(
        { error: 'Missing required fields: video_url, video_storage_path, or questions' },
        { status: 400 }
      );
    }

    // Use a default product ID since we don't have a specific product for interviews yet
    const DEFAULT_PRODUCT_ID = '820b2dc4-e503-42f1-ab2a-fe47c331b335'; // "Unassigned Product"

    // Create submission record using pre-uploaded video data
    const submissionId = crypto.randomUUID();
    
    console.log('Creating interview submission with pre-uploaded video:', video_storage_path);

    // Get current student data for tier and background tracking
    const { data: studentData } = await supabase
      .from('students')
      .select('job_readiness_tier, job_readiness_background_type')
      .eq('id', studentId)
      .single();

    // Save submission to database using pre-uploaded video data
    const { data: submission, error: insertError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .insert({
        id: submissionId,
        student_id: studentId,
        product_id: DEFAULT_PRODUCT_ID,
        video_storage_path,
        video_url,
        questions_used: questions,
        status: 'submitted',
        tier_when_submitted: studentData?.job_readiness_tier || 'BRONZE',
        background_when_submitted: studentData?.job_readiness_background_type || 'COMPUTER_SCIENCE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save submission:', insertError);
      
      return NextResponse.json(
        { error: 'Failed to save submission to database' },
        { status: 500 }
      );
    }

    console.log('Interview submission saved successfully:', submission.id);

    // Trigger async video analysis directly (no HTTP call needed)
    try {
      // Import the analysis function and call it directly
      const { analyzeInterview } = await import('../analyze/analyze-function');
      
      // Don't await this - let it run in background
      analyzeInterview(submission.id, user.id).catch(error => {
        console.error('Failed to trigger video analysis:', error);
      });
      
      console.log('Video analysis triggered for submission:', submission.id);
    } catch (triggerError) {
      console.warn('Failed to trigger video analysis:', triggerError);
    }

    // Create response with cache invalidation headers
    const response = NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'Interview submitted successfully. Analysis will begin shortly.',
      // Add a timestamp to help with cache busting
      timestamp: Date.now()
    });

    // Add cache invalidation headers to ensure frontend refreshes
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    // Custom header to signal frontend to invalidate interview cache
    response.headers.set('X-Interview-Cache-Invalidate', 'true');

    return response;

  } catch (error) {
    console.error('Error in interview submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 