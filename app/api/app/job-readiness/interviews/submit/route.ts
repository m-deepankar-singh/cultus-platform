import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';
import { uploadService } from '@/lib/r2/simple-upload-service';

export async function POST(request: NextRequest) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    const studentId = user.id;

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const questionsJson = formData.get('questions') as string;

    if (!videoFile || !questionsJson) {
      return NextResponse.json(
        { error: 'Missing required fields: video or questions' },
        { status: 400 }
      );
    }

    // Parse questions
    const questions = JSON.parse(questionsJson);

    // Use a default product ID since we don't have a specific product for interviews yet
    const DEFAULT_PRODUCT_ID = '820b2dc4-e503-42f1-ab2a-fe47c331b335'; // "Unassigned Product"

    // Create submission record first to get the ID
    const submissionId = crypto.randomUUID();
    
    // Upload video to R2 Storage using the same approach as the working admin endpoint
    console.log('Uploading video to R2 Storage...');
    
    // Use the exact same upload logic as the working admin endpoints
    const key = uploadService.generateKey(`interviews/${submissionId}`, videoFile.name);
    
    const uploadResult = await uploadService.uploadFile(
      videoFile, 
      key, 
      videoFile.type,
      {
        allowedTypes: ['video/*'],
        maxSize: 200 * 1024 * 1024, // 200MB for interview videos
        minSize: 1024 // 1KB minimum
      }
    );
    
    console.log('Video uploaded successfully to R2:', uploadResult.key);

    // Get current student data for tier and background tracking
    const { data: studentData } = await supabase
      .from('students')
      .select('job_readiness_tier, job_readiness_background_type')
      .eq('id', studentId)
      .single();

    // Save submission to database using correct table
    const { data: submission, error: insertError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .insert({
        id: submissionId,
        student_id: studentId,
        product_id: DEFAULT_PRODUCT_ID,
        video_storage_path: uploadResult.key,
        video_url: uploadResult.url,
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
      
      // Note: S3 file cleanup temporarily disabled during migration
      // TODO: Implement S3 file deletion in future phase if needed
      console.warn('Database insert failed, uploaded video cleanup skipped:', uploadResult.key);
      
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

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: 'Interview submitted successfully. Analysis will begin shortly.'
    });

  } catch (error) {
    console.error('Error in interview submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 