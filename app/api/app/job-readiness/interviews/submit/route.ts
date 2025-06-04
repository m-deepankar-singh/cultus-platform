import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = user.id;

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const questionsJson = formData.get('questions') as string;
    const backgroundId = formData.get('backgroundId') as string; // Keep this for backward compatibility

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
    
    // Generate storage path for video
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const videoPath = `interviews/${studentId}/${submissionId}/${timestamp}.webm`;

    // Upload video to Supabase Storage
    console.log('Uploading video to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interview_recordings')
      .upload(videoPath, videoFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload video:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload video to storage' },
        { status: 500 }
      );
    }

    console.log('Video uploaded successfully:', uploadData.path);

    // Get the public URL for the video
    const { data: { publicUrl } } = supabase.storage
      .from('interview_recordings')
      .getPublicUrl(uploadData.path);

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
        video_storage_path: uploadData.path,
        video_url: publicUrl,
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
      
      // Try to clean up uploaded video if database insert failed
      try {
        await supabase.storage
          .from('interview_recordings')
          .remove([uploadData.path]);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded video:', cleanupError);
      }
      
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