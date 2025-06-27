import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/admin/job-readiness/projects
 * Fetch project submissions for admin review with project-specific filters
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries for auth)
    const authResult = await authenticateApiRequest(['Admin']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { user, claims, supabase } = authResult;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status'); // draft, submitted, graded
    const backgroundType = searchParams.get('backgroundType');
    const projectType = searchParams.get('projectType');
    const submissionType = searchParams.get('submissionType'); // text_input, url_submission, file_upload
    const scoreRange = searchParams.get('scoreRange'); // low (0-50), medium (50-75), high (75-100)
    const contentSize = searchParams.get('contentSize'); // small, medium, large
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Build project query
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
        tasks,
        deliverables,
        store_submission_content,
        content_truncated,
        original_content_length,
        status,
        created_at,
        updated_at,
        students(
          id,
          full_name,
          email,
          client_id,
          job_readiness_tier,
          job_readiness_background_type
        ),
        products(
          id,
          name,
          description,
          type
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
    if (status) {
      projectQuery.eq('status', status);
    }
    if (backgroundType) {
      projectQuery.eq('background_type', backgroundType);
    }
    if (projectType) {
      projectQuery.eq('project_type', projectType);
    }
    if (submissionType) {
      projectQuery.eq('submission_type', submissionType);
    }
    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      projectQuery.or(`students.full_name.ilike.%${escapedSearch}%,students.email.ilike.%${escapedSearch}%,project_title.ilike.%${escapedSearch}%`);
    }
    if (dateFrom) {
      projectQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      projectQuery.lte('created_at', dateTo);
    }
    if (scoreRange) {
      if (scoreRange === 'low') {
        projectQuery.lte('score', 50);
      } else if (scoreRange === 'medium') {
        projectQuery.gt('score', 50).lte('score', 75);
      } else if (scoreRange === 'high') {
        projectQuery.gt('score', 75);
      }
    }
    if (contentSize) {
      if (contentSize === 'small') {
        projectQuery.lte('original_content_length', 1000);
      } else if (contentSize === 'medium') {
        projectQuery.gt('original_content_length', 1000).lte('original_content_length', 5000);
      } else if (contentSize === 'large') {
        projectQuery.gt('original_content_length', 5000);
      }
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('job_readiness_ai_project_submissions')
      .select('*', { count: 'exact', head: true });

    // Execute query with pagination
    const { data: projects, error: projectError } = await projectQuery
      .range(offset, offset + pageSize - 1);

    if (projectError) {
      console.error('Error fetching project submissions:', projectError);
      return NextResponse.json(
        { error: 'Failed to fetch project submissions' },
        { status: 500 }
      );
    }

    // Transform project submissions for frontend
    const transformedProjects = (projects || []).map((submission: any) => {
      // Split full_name into first_name and last_name for compatibility
      const nameParts = (submission.students?.full_name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Determine content size category
      const contentLength = submission.original_content_length || 0;
      let contentSizeCategory = 'small';
      if (contentLength > 5000) contentSizeCategory = 'large';
      else if (contentLength > 1000) contentSizeCategory = 'medium';

      return {
        id: submission.id,
        student_id: submission.student_id,
        product_id: submission.product_id,
        background_type: submission.background_type,
        project_type: submission.project_type,
        project_title: submission.project_title,
        project_description: submission.project_description,
        submission_type: submission.submission_type,
        submission_content: submission.submission_content,
        submission_url: submission.submission_url,
        score: submission.score,
        passed: submission.passed,
        feedback: submission.feedback,
        tasks: submission.tasks,
        deliverables: submission.deliverables,
        store_submission_content: submission.store_submission_content,
        content_truncated: submission.content_truncated,
        original_content_length: submission.original_content_length,
        status: submission.status,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        student: {
          id: submission.students?.id,
          first_name: firstName,
          last_name: lastName,
          full_name: submission.students?.full_name,
          email: submission.students?.email,
          current_tier: submission.students?.job_readiness_tier,
          background_type: submission.students?.job_readiness_background_type,
        },
        product: {
          id: submission.products?.id,
          name: submission.products?.name,
          description: submission.products?.description,
          type: submission.products?.type,
        },
        // Project-specific metadata
        is_auto_graded: true, // Projects are auto-graded
        has_content: !!submission.submission_content,
        has_url: !!submission.submission_url,
        content_size_category: contentSizeCategory,
        task_count: submission.tasks ? Object.keys(submission.tasks).length : 0,
        deliverable_count: submission.deliverables ? Object.keys(submission.deliverables).length : 0,
        grade_category: submission.score >= 75 ? 'high' : submission.score >= 50 ? 'medium' : 'low',
      };
    });

    return NextResponse.json({
      submissions: transformedProjects,
      pagination: {
        page,
        pageSize,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize),
      },
      filters: {
        availableStatuses: ['draft', 'submitted', 'graded'],
        availableProjectTypes: ['case_study', 'coding_project', 'design_project', 'analysis_project'],
        availableSubmissionTypes: ['text_input', 'url_submission', 'file_upload'],
        availableScoreRanges: ['low', 'medium', 'high'],
        availableContentSizes: ['small', 'medium', 'large'],
      }
    });

  } catch (error) {
    console.error('Error fetching project submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project submissions' },
      { status: 500 }
    );
  }
} 