import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/app/job-readiness/assessments
 * Get assessments for the Job Readiness product
 * These are the initial tier-determining assessments that unlock Star 1
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

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
        job_readiness_tier
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify the product is assigned to the student's client
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
      return NextResponse.json({ error: 'This product is not available for your client' }, { status: 403 });
    }

    // Get assessment modules for this product
    const { data: assessments, error: assessmentsError } = await supabase
      .from('modules')
      .select(`
        id,
        name,
        type,
        configuration,
        sequence,
        context,
        student_module_progress (
          student_id,
          module_id,
          status,
          progress_percentage,
          progress_details,
          completed_at,
          last_updated
        ),
        assessment_questions (
          id,
          question_text,
          options,
          correct_answer
        )
      `)
      .eq('product_id', productId)
      .eq('type', 'Assessment')
      .eq('context', 'job_readiness')
      .eq('student_module_progress.student_id', student.id)
      .order('sequence', { ascending: true });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }

    // Get product configuration for tier determination
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

    // Enhance assessments with progress data and lock/unlock status
    const enhancedAssessments = assessments?.map(assessment => {
      // Assessments are always unlocked by default in Job Readiness
      const isUnlocked = true;
      
      return {
        id: assessment.id,
        name: assessment.name,
        type: assessment.type,
        configuration: assessment.configuration,
        sequence: assessment.sequence,
        is_unlocked: isUnlocked,
        progress: assessment.student_module_progress?.[0] || null,
        questions_count: assessment.assessment_questions?.length || 0
      };
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
      .eq('context', 'job_readiness')
      .eq('student_module_progress.student_id', user.id)
      .eq('student_module_progress.status', 'Completed');

    // Get total assessment count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('modules')
      .select('id', { count: 'exact' })
      .eq('product_id', productId)
      .eq('type', 'Assessment')
      .eq('context', 'job_readiness');

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
      current_tier: student.job_readiness_tier,
      current_star_level: student.job_readiness_star_level,
      completed_assessments_count: moduleCounts?.length || 0,
      total_assessments_count: totalCount || 0
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness assessments GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/app/job-readiness/assessments/save-progress
 * Save assessment progress for a Job Readiness assessment
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // Verify assessment_id and progress data
    const { module_id, progress_data } = body;
    if (!module_id || !progress_data) {
      return NextResponse.json({ 
        error: 'Module ID and progress data are required' 
      }, { status: 400 });
    }

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if there's existing progress to update or we need to create new
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('student_id, module_id')
      .eq('student_id', user.id)
      .eq('module_id', module_id)
      .maybeSingle();

    if (progressError) {
      console.error('Error checking existing progress:', progressError);
      return NextResponse.json({ error: 'Failed to check existing progress' }, { status: 500 });
    }

    let progressResult;
    
    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('student_module_progress')
        .update({
          progress_percentage: progress_data.progress_percentage || 0,
          progress_details: progress_data.progress_details || {},
          status: progress_data.status || 'InProgress',
          last_updated: new Date().toISOString()
        })
        .eq('student_id', user.id)
        .eq('module_id', module_id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating progress:', error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
      }
      
      progressResult = data;
    } else {
      // Create new progress
      const { data, error } = await supabase
        .from('student_module_progress')
        .insert({
          student_id: user.id,
          module_id,
          progress_percentage: progress_data.progress_percentage || 0,
          progress_details: progress_data.progress_details || {},
          status: progress_data.status || 'InProgress',
          last_updated: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating progress:', error);
        return NextResponse.json({ error: 'Failed to create progress' }, { status: 500 });
      }
      
      progressResult = data;
    }

    return NextResponse.json({ progress: progressResult });
  } catch (error) {
    console.error('Unexpected error in job-readiness assessments POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 