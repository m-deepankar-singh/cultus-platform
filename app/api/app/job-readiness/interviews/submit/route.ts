import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth';
import { analyzeInterviewVideo } from '@/lib/ai/video-analyzer';
import { randomUUID } from 'crypto';

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get formData with the video file
    const formData = await req.formData();
    const videoFile = formData.get('video') as File;
    const interviewQuestionsId = formData.get('interviewQuestionsId') as string;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    if (!interviewQuestionsId) {
      return NextResponse.json(
        { error: 'No interview questions ID provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!videoFile.type.startsWith('video/webm')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only WebM videos are supported.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the maximum limit of 20MB.' },
        { status: 400 }
      );
    }

    // Convert file to arrayBuffer
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = await createClient();

    // Get student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('job_readiness_background_type, job_readiness_tier')
      .eq('user_id', user.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Failed to fetch student details' },
        { status: 500 }
      );
    }

    // Generate unique filename
    const submissionId = randomUUID();
    const filename = `${user.id}_${submissionId}.webm`;
    const storagePath = `interviews/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('interview_recordings')
      .upload(storagePath, buffer, {
        contentType: 'video/webm',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload video' },
        { status: 500 }
      );
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .insert({
        id: submissionId,
        student_id: user.id,
        interview_questions_id: interviewQuestionsId,
        video_storage_path: storagePath,
        status: 'pending_analysis',
        tier_when_submitted: student.job_readiness_tier,
        background_when_submitted: student.job_readiness_background_type
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Submission error:', submissionError);
      // Clean up the uploaded file if submission record creation fails
      await supabase.storage
        .from('interview_recordings')
        .remove([storagePath]);

      return NextResponse.json(
        { error: 'Failed to create submission record' },
        { status: 500 }
      );
    }

    // Trigger asynchronous analysis (don't await)
    analyzeInterviewVideo(submissionId).catch(error => {
      console.error('Error initiating video analysis:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Interview submission received and queued for analysis',
      submissionId
    });

  } catch (error) {
    console.error('Interview submission error:', error);
    return NextResponse.json(
      { error: 'Failed to process interview submission' },
      { status: 500 }
    );
  }
} 