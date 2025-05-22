import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { gradeProject } from '@/lib/ai/project-grader';

/**
 * POST /api/app/job-readiness/projects/submit
 * Submit a completed project for evaluation
 * Successful submissions unlock Star 4 and the Interview module
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    // Validate request body - both project details and submission are required
    const { 
      product_id,
      project_title,
      project_description,
      tasks,
      deliverables,
      submission_type,
      submission_content,
      submission_url
    } = body;
    
    if (!product_id || !project_title || !project_description) {
      return NextResponse.json({ 
        error: 'Product ID and project details are required' 
      }, { status: 400 });
    }
    
    // Validate submission based on submission type
    if (submission_type === 'github_url' && !submission_url) {
      return NextResponse.json({ 
        error: 'GitHub URL is required for code repository submissions' 
      }, { status: 400 });
    }
    
    if (submission_type === 'text_input' && !submission_content) {
      return NextResponse.json({ 
        error: 'Submission content is required for text submissions' 
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

    // Log student data for debugging
    console.log('Student data for project submission:', {
      id: student.id,
      background: student.job_readiness_background_type,
      tier: student.job_readiness_tier,
      starLevel: student.job_readiness_star_level
    });

    // Check if the student has already submitted a project for this product
    const { data: existingSubmission, error: existingError } = await supabase
      .from('job_readiness_ai_project_submissions')
      .select('id')
      .eq('student_id', user.id)
      .eq('product_id', product_id)
      .not('submission_content', 'is', null) // Only check for actual submissions
      .maybeSingle();
    
    if (existingSubmission) {
      return NextResponse.json({ 
        error: 'You have already submitted a project for this product',
        submission_id: existingSubmission.id
      }, { status: 400 });
    }

    // Check if the student has unlocked projects
    // Projects are unlocked after star level THREE (completed expert sessions)
    const starLevel = student.job_readiness_star_level || 'ONE';
    const hasUnlockedProjects = ['THREE', 'FOUR', 'FIVE'].includes(starLevel);

    if (!hasUnlockedProjects) {
      return NextResponse.json({ 
        error: 'Projects are locked until you complete expert sessions (Star 3)',
        current_star_level: starLevel,
        required_star_level: 'THREE',
        is_unlocked: false
      }, { status: 403 });
    }

    // Determine project type based on background (fallback if no mapping exists)
    let projectType = 'CASE_STUDY'; // Default
    
    if (student.job_readiness_background_type === 'COMPUTER_SCIENCE' || 
        student.job_readiness_background_type === 'ENGINEERING' ||
        student.job_readiness_background_type === 'DATA_SCIENCE') {
      projectType = 'CODING_PROJECT';
    }
    
    // Try to fetch background project mapping if available (but don't require it)
    if (student.job_readiness_background_type) {
      const { data: backgroundProjectMapping } = await supabase
        .from('job_readiness_background_project_types')
        .select('project_type')
        .eq('background_type', student.job_readiness_background_type)
        .maybeSingle();
      
      // If we have a mapping, use that project type
      if (backgroundProjectMapping?.project_type) {
        projectType = backgroundProjectMapping.project_type;
      }
    }

    // Use the AI project grader to evaluate the submission
    const submissionData = {
      projectTitle: project_title,
      projectDescription: project_description,
      tasks: Array.isArray(tasks) ? tasks : [],
      deliverables: Array.isArray(deliverables) ? deliverables : [],
      submissionType: submission_type,
      submissionContent: submission_content,
      submissionUrl: submission_url,
      studentBackground: student.job_readiness_background_type || 'GENERAL',
      studentTier: student.job_readiness_tier || 'BRONZE'
    };
    
    // Grade the project using the AI service
    console.log('Grading project submission...');
    const gradingResult = await gradeProject(submissionData);
    console.log('Project grading result:', {
      score: gradingResult.score,
      passed: gradingResult.passed
    });
    
    // Define the passing threshold
    const PASSING_SCORE_THRESHOLD = 80;
    
    // Save both the project details and the submission to the database
    const dbSubmissionData = {
      student_id: user.id,
      product_id,
      background_type: student.job_readiness_background_type,
      project_type: projectType,
      project_title,
      project_description,
      tasks,
      deliverables,
      submission_type,
      submission_content: submission_content || null,
      submission_url: submission_url || null,
      score: gradingResult.score,
      passed: gradingResult.passed,
      feedback: JSON.stringify({
        summary: gradingResult.feedback.summary,
        strengths: gradingResult.feedback.strengths,
        weaknesses: gradingResult.feedback.weaknesses,
        improvements: gradingResult.feedback.improvements
      })
    };
    
    // Save the submission to the database
    const { data: savedSubmission, error: submissionError } = await supabase
      .from('job_readiness_ai_project_submissions')
      .insert(dbSubmissionData)
      .select()
      .single();
      
    if (submissionError) {
      console.error('Error saving project submission:', submissionError);
      return NextResponse.json({ error: 'Failed to save project submission' }, { status: 500 });
    }

    // If this is a successful submission (score >= 80) from a student at star level THREE,
    // promote them to star level FOUR to unlock interviews
    let starLevelUpdated = false;
    let newStarLevel = starLevel;
    
    if (gradingResult.passed && starLevel === 'THREE') {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          job_readiness_star_level: 'FOUR',
          job_readiness_last_updated: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) {
        console.error('Error updating star level:', updateError);
        // Continue anyway, not a blocking error
      } else {
        starLevelUpdated = true;
        newStarLevel = 'FOUR';
        console.log(`Student ${user.id} promoted to star level FOUR after passing project with score ${gradingResult.score}`);
      }
    }

    // Return submission results with detailed feedback
    return NextResponse.json({
      success: true,
      submission: {
        id: savedSubmission.id,
        project_title: savedSubmission.project_title,
        project_description: savedSubmission.project_description,
        tasks: savedSubmission.tasks,
        deliverables: savedSubmission.deliverables,
        submission_type: savedSubmission.submission_type,
        submission_content: savedSubmission.submission_content,
        submission_url: savedSubmission.submission_url,
        score: savedSubmission.score,
        passed: savedSubmission.passed
      },
      feedback: {
        summary: gradingResult.feedback.summary,
        strengths: gradingResult.feedback.strengths,
        weaknesses: gradingResult.feedback.weaknesses,
        improvements: gradingResult.feedback.improvements
      },
      star_level_updated: starLevelUpdated,
      new_star_level: newStarLevel,
      passing_threshold: PASSING_SCORE_THRESHOLD
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness projects submit POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 