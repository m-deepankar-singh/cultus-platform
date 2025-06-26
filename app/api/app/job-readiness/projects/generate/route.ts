import { NextRequest, NextResponse } from 'next/server';
import { generateProject } from '@/lib/ai/project-generator';
import { authenticateApiRequestWithRateLimit } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

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
    
    // JWT-based authentication with rate limiting (AI cost protection)
    const authResult = await authenticateApiRequestWithRateLimit(
      request,
      ['student'],
      RATE_LIMIT_CONFIGS.AI_PROJECT_GENERATION
    );
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;
    
    // Get the associated student record - specific fields needed for project generation
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
    
    // First, check if the student has already submitted a SUCCESSFUL project for this product
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('job_readiness_ai_project_submissions')
      .select('*')
      .eq('student_id', studentId)
      .eq('product_id', productId)
      .not('submission_content', 'is', null) // Only check for actual submissions
      .order('created_at', { ascending: false }) // Get the most recent submission
      .limit(1)
      .maybeSingle();
    
    // If there's already a successful submitted project, return it
    if (!submissionError && existingSubmission && existingSubmission.passed) {
      return NextResponse.json({
        success: true,
        project: {
          id: existingSubmission.id,
          title: existingSubmission.project_title,
          description: existingSubmission.project_description,
          tasks: existingSubmission.tasks || [],
          deliverables: existingSubmission.deliverables || [],
          submission_type: existingSubmission.submission_type,
          status: 'submitted',
          score: existingSubmission.score,
          passed: existingSubmission.passed,
          feedback: existingSubmission.feedback ? JSON.parse(existingSubmission.feedback) : null,
          content_optimized: existingSubmission.content_truncated || false,
          storage_info: existingSubmission.content_truncated ? {
            optimized: true,
            message: "This was a large code submission that was optimized for storage efficiency.",
            original_length: existingSubmission.original_content_length || 0
          } : null
        },
        message: "You have already successfully completed this project."
      }, { status: 200 });
    }
    
    // For failed submissions or no submissions, generate a new project
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