import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/job-readiness/submissions
 * Fetch all job readiness submissions (both interviews and projects) for admin review
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role - use case insensitive comparison
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.role || !(profile.role.toLowerCase() === 'admin')) {
      console.log('User role check failed:', { user_id: user.id, role: profile?.role });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const clientId = searchParams.get('clientId');
    const submissionType = searchParams.get('submissionType'); // 'project', 'interview', or undefined for all
    const reviewStatus = searchParams.get('reviewStatus'); // 'pending', 'approved', 'rejected', or undefined for all
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    let interviewSubmissions: any[] = [];
    let projectSubmissions: any[] = [];

    // Fetch interview submissions if not filtered out
    if (!submissionType || submissionType === 'interview') {
      const interviewQuery = supabase
        .from('job_readiness_ai_interview_submissions')
        .select(`
          id,
          student_id,
          interview_questions_id,
          video_storage_path,
          status,
          tier_when_submitted,
          background_when_submitted,
          analysis_result,
          created_at,
          analyzed_at,
          students!inner(
            id,
            first_name,
            last_name,
            email,
            client_id,
            products!inner(
              id,
              name,
              description
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (productId) {
        interviewQuery.eq('students.products.id', productId);
      }
      if (clientId) {
        interviewQuery.eq('students.client_id', clientId);
      }
      if (search) {
        interviewQuery.or(`students.first_name.ilike.%${search}%,students.last_name.ilike.%${search}%,students.email.ilike.%${search}%`);
      }
      if (reviewStatus) {
        // Map review status to actual submission status
        if (reviewStatus === 'pending') {
          interviewQuery.eq('status', 'pending_analysis');
        } else if (reviewStatus === 'approved') {
          interviewQuery.contains('analysis_result', { status: 'Approved' });
        } else if (reviewStatus === 'rejected') {
          interviewQuery.contains('analysis_result', { status: 'Rejected' });
        }
      }

      const { data: interviews, error: interviewError } = await interviewQuery
        .range(offset, offset + pageSize - 1);

      if (interviewError) {
        console.error('Error fetching interview submissions:', interviewError);
      } else {
        interviewSubmissions = interviews || [];
      }
    }

    // Fetch project submissions if not filtered out
    if (!submissionType || submissionType === 'project') {
      const projectQuery = supabase
        .from('job_readiness_ai_project_submissions')
        .select(`
          id,
          student_id,
          product_id,
          background_type,
          project_type,
          project_title,
          project_description,
          submission_type,
          submission_content,
          submission_url,
          score,
          passed,
          feedback,
          created_at,
          students!inner(
            id,
            first_name,
            last_name,
            email,
            client_id
          ),
          products!inner(
            id,
            name,
            description
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (productId) {
        projectQuery.eq('product_id', productId);
      }
      if (clientId) {
        projectQuery.eq('students.client_id', clientId);
      }
      if (search) {
        projectQuery.or(`students.first_name.ilike.%${search}%,students.last_name.ilike.%${search}%,students.email.ilike.%${search}%`);
      }
      // Projects don't have manual review status, they're auto-graded

      const { data: projects, error: projectError } = await projectQuery
        .range(offset, offset + pageSize - 1);

      if (projectError) {
        console.error('Error fetching project submissions:', projectError);
      } else {
        projectSubmissions = projects || [];
      }
    }

    // Transform and combine submissions
    const transformedSubmissions: any[] = [];

    // Transform interview submissions
    interviewSubmissions.forEach((submission: any) => {
      const analysisResult = submission.analysis_result || {};
      const isManuallyReviewed = analysisResult.admin_reviewed || false;
      const manualReviewStatus = isManuallyReviewed 
        ? (analysisResult.status === 'Approved' ? 'approved' : 'rejected')
        : (submission.status === 'pending_analysis' ? 'pending' : 'not_required');

      transformedSubmissions.push({
        id: submission.id,
        student_id: submission.student_id,
        product_id: submission.students?.products?.id || null,
        submission_type: 'interview',
        submission_date: submission.created_at,
        score: analysisResult.confidence_score || undefined,
        ai_grade_status: submission.status === 'completed' ? 'completed' : 
                        submission.status === 'pending_analysis' ? 'pending' : 'failed',
        manual_review_status: manualReviewStatus,
        reviewer_id: analysisResult.admin_id || undefined,
        admin_feedback: analysisResult.overall_feedback || undefined,
        review_date: analysisResult.admin_review_time || submission.analyzed_at || undefined,
        student: {
          id: submission.students?.id,
          first_name: submission.students?.first_name,
          last_name: submission.students?.last_name,
          email: submission.students?.email,
        },
        product: {
          id: submission.students?.products?.id,
          name: submission.students?.products?.name,
          description: submission.students?.products?.description,
        },
        interview_submission: {
          video_storage_path: submission.video_storage_path,
          passed: analysisResult.status === 'Approved',
          feedback: analysisResult.overall_feedback,
        }
      });
    });

    // Transform project submissions
    projectSubmissions.forEach((submission: any) => {
      transformedSubmissions.push({
        id: submission.id,
        student_id: submission.student_id,
        product_id: submission.product_id,
        submission_type: 'project',
        submission_date: submission.created_at,
        score: submission.score,
        ai_grade_status: 'completed', // Projects are auto-graded immediately
        manual_review_status: 'not_required', // Projects don't require manual review
        reviewer_id: undefined,
        admin_feedback: undefined,
        review_date: undefined,
        student: {
          id: submission.students?.id,
          first_name: submission.students?.first_name,
          last_name: submission.students?.last_name,
          email: submission.students?.email,
        },
        product: {
          id: submission.products?.id,
          name: submission.products?.name,
          description: submission.products?.description,
        },
        project_submission: {
          background_type: submission.background_type,
          project_type: submission.project_type,
          submission_content: submission.submission_content,
          submission_url: submission.submission_url,
          passed: submission.passed,
          feedback: submission.feedback,
        }
      });
    });

    // Sort combined submissions by date (newest first)
    transformedSubmissions.sort((a, b) => 
      new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime()
    );

    // Apply pagination to combined results
    const startIndex = offset;
    const endIndex = offset + pageSize;
    const paginatedSubmissions = transformedSubmissions.slice(startIndex, endIndex);

    return NextResponse.json({
      submissions: paginatedSubmissions,
      pagination: {
        page,
        pageSize,
        total: transformedSubmissions.length,
        totalPages: Math.ceil(transformedSubmissions.length / pageSize),
      }
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
} 