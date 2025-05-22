import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProject } from '@/lib/ai/project-generator';

/**
 * Generates a real-world project for a student
 * 
 * GET /api/app/job-readiness/projects/generate?productId=123
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Get student ID from authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the associated student record - in this app, the student ID is the same as the auth user ID
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, job_readiness_background_type, job_readiness_tier')
      .eq('id', user.id)
      .single();
      
    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student record not found' },
        { status: 404 }
      );
    }
    
    // Output debug info to help with troubleshooting
    console.log('Found student:', {
      id: student.id,
      background: student.job_readiness_background_type,
      tier: student.job_readiness_tier
    });
    
    const studentId = student.id;
    
    // First, check if the student has already submitted a project for this product
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('job_readiness_ai_project_submissions')
      .select('*')
      .eq('student_id', studentId)
      .eq('product_id', productId)
      .not('submission_content', 'is', null) // Only check for actual submissions
      .single();
    
    // If there's already a submitted project, return it
    if (!submissionError && existingSubmission) {
      return NextResponse.json({
        success: true,
        project: {
          id: existingSubmission.id,
          title: existingSubmission.project_title,
          description: existingSubmission.project_description,
          tasks: existingSubmission.tasks || [],
          deliverables: existingSubmission.deliverables || [],
          submission_type: existingSubmission.submission_type || 'text_input',
          status: 'submitted',
          submission_content: existingSubmission.submission_content,
          submission_url: existingSubmission.submission_url,
          score: existingSubmission.score,
          passed: existingSubmission.passed,
          feedback: existingSubmission.feedback
        },
        message: "You have already submitted a project. No new projects will be generated."
      });
    }
    
    // If no submitted project exists, generate a new one
    const projectDetails = await generateProject(studentId, productId);
    
    if (!projectDetails) {
      return NextResponse.json(
        { error: 'Failed to generate project' },
        { status: 500 }
      );
    }
    
    // Return the freshly generated project (not cached)
    return NextResponse.json({
      success: true,
      project: {
        title: projectDetails.title,
        description: projectDetails.description,
        tasks: projectDetails.tasks || [],
        deliverables: projectDetails.deliverables || [],
        submission_type: projectDetails.submission_type || 'text_input',
        status: 'new'
      },
      message: "This is a newly generated project. It will change on refresh until you submit your answer."
    });
    
  } catch (error) {
    console.error('Error generating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 