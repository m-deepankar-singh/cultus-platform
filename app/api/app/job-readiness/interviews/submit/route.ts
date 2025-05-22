import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/app/job-readiness/interviews/submit
 * Submit a recorded interview video for AI evaluation
 * Successful submissions unlock Star 5 and complete the Job Readiness program
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    // Validate request body
    const { 
      product_id, 
      video_storage_path
    } = body;
    
    if (!product_id || !video_storage_path) {
      return NextResponse.json({ 
        error: 'Product ID and video storage path are required' 
      }, { status: 400 });
    }

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student profile for the current user
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_background_type
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check if the student has unlocked interviews
    // Interviews are unlocked after star level FOUR (completed projects)
    const starLevel = student.job_readiness_star_level || 'ONE';
    const hasUnlockedInterviews = ['FIVE'].includes(starLevel);

    if (!hasUnlockedInterviews) {
      return NextResponse.json({ 
        error: 'Interviews are locked until you complete projects (Star 4)',
        current_star_level: starLevel,
        required_star_level: 'FOUR',
        is_unlocked: false
      }, { status: 403 });
    }

    // In a real implementation, this would call the AI service to analyze the interview video
    // For a placeholder, we'll simulate a successful analysis
    const submissionData = {
      student_id: user.id,
      product_id,
      video_storage_path,
      score: 90, // Placeholder score
      passed: true, // Placeholder result
      timestamp: new Date().toISOString()
    };
    
    // Save the submission to the database
    const { data: savedSubmission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .insert(submissionData)
      .select()
      .single();
      
    if (submissionError) {
      console.error('Error saving interview submission:', submissionError);
      return NextResponse.json({ error: 'Failed to save interview submission' }, { status: 500 });
    }

    // If this is the student's first successful submission, update their star level
    if (savedSubmission.passed && starLevel === 'FOUR') {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          job_readiness_star_level: 'FIVE',
          job_readiness_last_updated: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Error updating star level:', updateError);
        // Continue anyway, not a blocking error
      }
    }

    // Return submission results with detailed feedback
    return NextResponse.json({
      submission: savedSubmission,
      analysis: {
        strengths: [
          "Clear communication and articulation",
          "Strong technical knowledge demonstration",
          "Good examples to support answers"
        ],
        areas_for_improvement: [
          "Consider structuring answers with the STAR method",
          "Provide more quantifiable results in examples"
        ],
        overall_impression: "Very positive impression with strong communication skills and technical background."
      },
      score: savedSubmission.score,
      passed: savedSubmission.passed,
      star_level_updated: starLevel === 'FOUR' && savedSubmission.passed,
      new_star_level: savedSubmission.passed ? 'FIVE' : starLevel,
      program_completed: savedSubmission.passed
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness interviews submit POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 