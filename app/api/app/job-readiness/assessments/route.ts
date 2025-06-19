
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Type for assessment data from database
interface AssessmentData {
  id: string;
  name: string;
  type: string;
  configuration: any;
  sequence: number;
  student_module_progress?: Array<{
    student_id: string;
    module_id: string;
    status: string;
    progress_percentage: number | null;
    progress_details: any;
    completed_at: string | null;
    last_updated: string;
  }>;
  assessment_module_questions?: Array<{
    module_id: string;
    question_id: string;
    sequence: number;
  }>;
}

/**
 * GET /api/app/job-readiness/assessments
 * Get assessments for the Job Readiness product using the module-based system
 * These are tier-determining assessments that work with the module system
 */
export async function GET(req: NextRequest) {
  try {
    // JWT-based authentication (replaces getUser() + student record lookup)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    const assessmentType = url.searchParams.get('assessmentType'); // Optional filter: initial_tier, skill_specific, promotion

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if student account is active (from JWT claims)
    if (!claims.profile_is_active) {
      return NextResponse.json({ error: 'Student account is inactive' }, { status: 403 });
    }

    // Get client_id from JWT claims instead of database lookup
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json({ error: 'Student not linked to a client' }, { status: 403 });
    }

    // Verify the product is a Job Readiness product assigned to the student's client
    const { data: productData, error: productDataError } = await supabase
      .from('products')
      .select('id, name, type')
      .eq('id', productId)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productDataError || !productData) {
      return NextResponse.json({ error: 'Job Readiness product not found' }, { status: 404 });
    }

    const { data: clientProduct, error: clientProductError } = await supabase
      .from('client_product_assignments')
      .select('client_id, product_id')
      .eq('client_id', clientId)
      .eq('product_id', productId)
      .maybeSingle();

    if (clientProductError) {
      console.error('Error verifying client product assignment:', clientProductError);
      return NextResponse.json({ error: 'Failed to verify product access' }, { status: 500 });
    }

    if (!clientProduct) {
      return NextResponse.json({ error: 'This Job Readiness product is not available for your client' }, { status: 403 });
    }

    // Get assessment modules for this Job Readiness product
    const { data: assessments, error: assessmentsError } = await supabase
      .from('modules')
      .select(`
        id,
        name,
        type,
        configuration,
        sequence,
        module_product_assignments!inner (
          product_id
        ),
        student_module_progress (
          student_id,
          module_id,
          status,
          progress_percentage,
          progress_details,
          completed_at,
          last_updated
        ),
        assessment_module_questions (
          module_id,
          question_id,
          sequence
        )
      `)
      .eq('module_product_assignments.product_id', productId)
      .eq('type', 'Assessment')
      .eq('student_module_progress.student_id', user.id)
      .order('sequence', { ascending: true });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }

    // Get Job Readiness product configuration for tier determination
    const { data: productConfig, error: productConfigError } = await supabase
      .from('job_readiness_products')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (productConfigError && productConfigError.code !== 'PGRST116') {
      console.error('Error fetching product config:', productConfigError);
      return NextResponse.json({ error: 'Failed to fetch product configuration' }, { status: 500 });
    }

    // Default configuration values if no specific job readiness configuration exists
    const defaultConfig = {
      bronze_assessment_min_score: 0,
      bronze_assessment_max_score: 60,
      silver_assessment_min_score: 61,
      silver_assessment_max_score: 80,
      gold_assessment_min_score: 81,
      gold_assessment_max_score: 100
    };

    // Use productConfig if available, otherwise use default values
    const tierConfig = productConfig || defaultConfig;

    // Enhance assessments with progress data and Job Readiness specific information
    const enhancedAssessments = assessments?.map((assessment: AssessmentData) => {
      const progress = assessment.student_module_progress?.[0] || null;
      const isCompleted = progress?.status === 'Completed';
      const isUnlocked = true; // Job Readiness assessments are always unlocked
      
      // Extract Job Readiness specific configuration
      const config = assessment.configuration || {};
      const isTierDetermining = config.isTierDeterminingAssessment !== false; // Default to true
      const assessmentTypeFromConfig = config.assessmentType || 'initial_tier';
      
      return {
        id: assessment.id,
        name: assessment.name,
        type: assessment.type,
        configuration: assessment.configuration,
        sequence: assessment.sequence,
        is_unlocked: isUnlocked,
        is_completed: isCompleted,
        is_tier_determining: isTierDetermining,
        assessment_type: assessmentTypeFromConfig,
        progress: progress,
        questions_count: assessment.assessment_module_questions?.length || 0,
        // Add score and tier information if completed
        last_score: progress?.progress_percentage || null,
        tier_achieved: progress?.progress_details?.tier_achieved || null,
      };
    }).filter((assessment: any) => {
      // Apply assessment type filter if provided
      if (assessmentType && assessment.assessment_type !== assessmentType) {
        return false;
      }
      return true;
    });

    // Get the count of completed assessments out of total for this product
    const { data: moduleCounts, error: countError } = await supabase
      .from('modules')
      .select(`
        id,
        module_product_assignments!inner (
          product_id
        ),
        student_module_progress!inner (
          status
        )
      `)
      .eq('module_product_assignments.product_id', productId)
      .eq('type', 'Assessment')
      .eq('student_module_progress.student_id', user.id)
      .eq('student_module_progress.status', 'Completed');

    // Get total assessment count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('modules')
      .select('id, module_product_assignments!inner(product_id)', { count: 'exact' })
      .eq('module_product_assignments.product_id', productId)
      .eq('type', 'Assessment');

    // Calculate completion status
    const completedAssessmentsCount = moduleCounts?.length || 0;
    const totalAssessmentsCount = totalCount || 0;
    
    // Get current tier and star level from JWT claims instead of database lookup
    const currentTier = claims.job_readiness_tier;
    const currentStarLevel = claims.job_readiness_star_level;

    return NextResponse.json({
      success: true,
      assessments: enhancedAssessments || [],
      completion_summary: {
        completed_assessments: completedAssessmentsCount,
        total_assessments: totalAssessmentsCount,
        completion_percentage: totalAssessmentsCount > 0 ? Math.round((completedAssessmentsCount / totalAssessmentsCount) * 100) : 0,
      },
      current_student_state: {
        tier: currentTier,
        star_level: currentStarLevel,
      },
      tier_configuration: tierConfig,
    });

  } catch (error) {
    console.error('Unexpected error in Job Readiness assessments endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: (error as Error).message },
      { status: 500 }
    );
  }
}

 