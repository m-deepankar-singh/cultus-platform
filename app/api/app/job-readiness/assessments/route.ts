import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/app/job-readiness/assessments
 * Get assessments for the Job Readiness product using the module-based system
 * These are tier-determining assessments that work with the module system
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    const assessmentType = url.searchParams.get('assessmentType'); // Optional filter: initial_tier, skill_specific, promotion

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
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
        client_id,
        job_readiness_star_level,
        job_readiness_tier,
        is_active
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!student.is_active) {
      return NextResponse.json({ error: 'Student account is inactive' }, { status: 403 });
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
      .eq('client_id', student.client_id)
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
      .eq('product_id', productId)
      .eq('type', 'Assessment')
      .eq('student_module_progress.student_id', student.id)
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
    const enhancedAssessments = assessments?.map(assessment => {
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
    }).filter(assessment => {
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
        student_module_progress!inner (
          status
        )
      `)
      .eq('product_id', productId)
      .eq('type', 'Assessment')
      .eq('student_module_progress.student_id', user.id)
      .eq('student_module_progress.status', 'Completed');

    // Get total assessment count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('modules')
      .select('id', { count: 'exact' })
      .eq('product_id', productId)
      .eq('type', 'Assessment');

    // Calculate completion status
    const completedAssessmentsCount = moduleCounts?.length || 0;
    const totalAssessmentsCount = totalCount || 0;
    
    // If student already has a tier, show it directly (no need to re-check assessments)
    // Only check assessment completion when tier is null
    let currentTier = student.job_readiness_tier;
    let allAssessmentsComplete = false;
    
    if (currentTier) {
      // Student already has a tier assigned - show it directly
      allAssessmentsComplete = true; // Must be true if tier was assigned
      console.log(`Student ${user.id} already has tier: ${currentTier}`);
    } else {
      // No tier assigned yet - check if all assessments are completed
      allAssessmentsComplete = completedAssessmentsCount === totalAssessmentsCount && totalAssessmentsCount > 0;
      console.log(`Assessment completion status - Student: ${user.id}, Completed: ${completedAssessmentsCount}/${totalAssessmentsCount}, All Complete: ${allAssessmentsComplete}`);
    }

    return NextResponse.json({
      assessments: enhancedAssessments,
      tier_criteria: {
        bronze: {
          min_score: tierConfig.bronze_assessment_min_score,
          max_score: tierConfig.bronze_assessment_max_score
        },
        silver: {
          min_score: tierConfig.silver_assessment_min_score,
          max_score: tierConfig.silver_assessment_max_score
        },
        gold: {
          min_score: tierConfig.gold_assessment_min_score,
          max_score: tierConfig.gold_assessment_max_score
        }
      },
      current_tier: currentTier,
      current_star_level: student.job_readiness_star_level,
      all_assessments_complete: allAssessmentsComplete,
      completed_assessments_count: completedAssessmentsCount,
      total_assessments_count: totalAssessmentsCount,
      product: {
        id: productData.id,
        name: productData.name,
        type: productData.type
      }
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness assessments GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

 