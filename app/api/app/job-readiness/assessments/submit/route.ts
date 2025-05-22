import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/app/job-readiness/assessments/submit
 * Submit a completed assessment and determine the tier
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // Verify required fields
    const { 
      module_id, 
      product_id, 
      answers, 
      score 
    } = body;
    
    if (!module_id || !product_id || !answers || score === undefined) {
      return NextResponse.json({ 
        error: 'Module ID, product ID, answers, and score are required'
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
      .eq('product_id', product_id)
      .maybeSingle();

    if (clientProductError) {
      console.error('Error verifying client product assignment:', clientProductError);
      return NextResponse.json({ error: 'Failed to verify product access' }, { status: 500 });
    }

    if (!clientProduct) {
      return NextResponse.json({ error: 'This product is not available for your client' }, { status: 403 });
    }

    // Verify the module exists and is an assessment
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, type')
      .eq('id', module_id)
      .eq('type', 'assessment')
      .single();

    if (moduleError || !module) {
      console.error('Error verifying module:', moduleError);
      return NextResponse.json({ error: 'Invalid assessment module' }, { status: 400 });
    }

    // Calculate correct answers and passed status
    const totalQuestions = answers.length;
    const correctAnswers = Math.round((score / 100) * totalQuestions);
    
    // Get module configuration to check for passing threshold
    const { data: moduleConfig, error: moduleConfigError } = await supabase
      .from('modules')
      .select('configuration')
      .eq('id', module_id)
      .maybeSingle();
      
    if (moduleConfigError && moduleConfigError.code !== 'PGRST116') {
      console.error('Error fetching module configuration:', moduleConfigError);
      return NextResponse.json({ error: 'Failed to fetch module configuration' }, { status: 500 });
    }
    
    // Extract passing threshold from configuration or use default
    const config = moduleConfig?.configuration || {};
    const passingThreshold = config.passing_threshold || config.passThreshold || 70; // Default to 70%
    const passed = score >= passingThreshold;

    // First, get the existing assessment submission if any
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('assessment_submissions')
      .select('id')
      .eq('student_id', user.id)
      .eq('assessment_id', module_id)
      .maybeSingle();

    if (submissionError && submissionError.code !== 'PGRST116') {
      console.error('Error checking existing submission:', submissionError);
      return NextResponse.json({ error: 'Failed to check existing submissions' }, { status: 500 });
    }

    // Save the assessment submission
    let submission;
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from('assessment_submissions')
        .update({
          score,
          passed,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating assessment submission:', error);
        return NextResponse.json({ error: 'Failed to update assessment submission' }, { status: 500 });
      }
      
      submission = data;
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('assessment_submissions')
        .insert({
          student_id: user.id,
          assessment_id: module_id,
          score,
          passed,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating assessment submission:', error);
        return NextResponse.json({ error: 'Failed to create assessment submission' }, { status: 500 });
      }
      
      submission = data;
    }

    // Update the module progress to COMPLETED
    const { error: progressError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: user.id,
        module_id,
        status: 'Completed',
        progress_percentage: 100,
        progress_details: { 
          submitted: true,
          score,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          passed
        },
        last_updated: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error updating module progress:', progressError);
      return NextResponse.json({ error: 'Failed to update module progress' }, { status: 500 });
    }

    // Get product configuration to determine the tier
    const { data: productConfig, error: productConfigError } = await supabase
      .from('job_readiness_products')
      .select('*')
      .eq('product_id', product_id)
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

    // Determine the tier based on the score and tier criteria
    let tier = 'BRONZE'; // Default to bronze
    if (score >= tierConfig.gold_assessment_min_score) {
      tier = 'GOLD';
    } else if (score >= tierConfig.silver_assessment_min_score) {
      tier = 'SILVER';
    }

    // Update the student's tier and star level if this is their first assessment
    if (!student.job_readiness_tier || !student.job_readiness_star_level) {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          job_readiness_tier: tier,
          job_readiness_star_level: 'ONE', // First star achieved by completing assessments
          job_readiness_last_updated: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating student tier and star:', updateError);
        return NextResponse.json({ error: 'Failed to update student progress' }, { status: 500 });
      }
    }

    // Get the count of completed assessments out of total for this product
    const { data: moduleCounts, error: countError } = await supabase
      .from('modules')
      .select(`
        id,
        student_module_progress!inner (
          status
        )
      `)
      .eq('product_id', product_id)
      .eq('type', 'Assessment')
      .eq('student_module_progress.student_id', user.id)
      .eq('student_module_progress.status', 'Completed');

    if (countError) {
      console.error('Error counting completed modules:', countError);
      return NextResponse.json({ error: 'Failed to count completed modules' }, { status: 500 });
    }

    // Get total assessment count
    const { count: totalCount, error: totalCountError } = await supabase
      .from('modules')
      .select('id', { count: 'exact' })
      .eq('product_id', product_id)
      .eq('type', 'Assessment');

    if (totalCountError) {
      console.error('Error counting total modules:', totalCountError);
      return NextResponse.json({ error: 'Failed to count total modules' }, { status: 500 });
    }

    const completedCount = moduleCounts?.length || 0;
    const progress = {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount ? Math.round((completedCount / totalCount) * 100) : 0
    };

    return NextResponse.json({
      submission,
      tier,
      star_level: 'ONE',
      progress,
      passing_threshold: passingThreshold
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness assessments submit POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 