import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * GET /api/app/job-readiness/promotion-exam/eligibility
 * Check if a student is eligible for a promotion exam
 * Available after Star 2 & Star 3, if not already passed for the current tier jump
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, claims, supabase } = authResult;

    // Get client_id from JWT claims
    const clientId = claims.client_id;
    if (!clientId) {
      return NextResponse.json({ error: 'Student not properly enrolled' }, { status: 403 });
    }

    // Verify the product is assigned to the student's client
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
      return NextResponse.json({ error: 'This product is not available for your client' }, { status: 403 });
    }

    // Get student profile for the current user - specific fields only
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        job_readiness_star_level,
        job_readiness_tier,
        job_readiness_promotion_eligible
      `)
      .eq('id', user.id)
      .single();

    if (studentError || !student) {
      console.error('Error fetching student:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    // Check if promotion exams are enabled for this product
    const { data: examConfigs, error: configError } = await supabase
      .from('job_readiness_promotion_exam_config')
      .select('*')
      .eq('product_id', productId);
      
    if (configError) {
      console.error('Error fetching promotion exam config:', configError);
      return NextResponse.json({ 
        error: 'Failed to fetch promotion exam configuration',
        is_eligible: false
      }, { status: 500 });
    }

    if (!examConfigs || examConfigs.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion exams are not configured for this product',
        is_eligible: false
      }, { status: 400 });
    }

    const examConfig = examConfigs[0];
    
    if (!examConfig.is_enabled) {
      return NextResponse.json({ 
        error: 'Promotion exams are disabled for this product',
        is_eligible: false
      }, { status: 400 });
    }

    // Check if the student has completed the required star level
    // Promotion exams are available after Star 2 & Star 3
    const starLevel = student.job_readiness_star_level || 'ONE';
    const eligibleStarLevels = ['TWO', 'THREE'];
    const isEligibleStarLevel = eligibleStarLevels.includes(starLevel);

    if (!isEligibleStarLevel) {
      return NextResponse.json({ 
        error: 'Promotion exams are only available after completing Star 2 or Star 3',
        current_star_level: starLevel,
        eligible_star_levels: eligibleStarLevels,
        is_eligible: false
      }, { status: 400 });
    }

    // Check if the student is already at the highest tier (GOLD)
    const currentTier = student.job_readiness_tier || 'BRONZE';
    if (currentTier === 'GOLD') {
      return NextResponse.json({ 
        error: 'You are already at the highest tier (GOLD)',
        current_tier: currentTier,
        is_eligible: false
      }, { status: 400 });
    }

    // Check if the student has already passed a promotion exam for this star level
    const { data: previousAttempts, error: attemptsError } = await supabase
      .from('job_readiness_promotion_exam_attempts')
      .select('*')
      .eq('student_id', user.id)
      .eq('product_id', productId)
      .eq('star_level', starLevel)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('Error fetching previous attempts:', attemptsError);
      return NextResponse.json({ error: 'Failed to check previous attempts' }, { status: 500 });
    }

    // If the student has any successful attempts for this star level, they can't take it again
    const hasPassedExam = previousAttempts?.some((attempt: { passed: boolean }) => attempt.passed);
    if (hasPassedExam) {
      return NextResponse.json({ 
        error: 'You have already passed a promotion exam for this star level',
        star_level: starLevel,
        is_eligible: false,
        previous_attempts: previousAttempts
      }, { status: 400 });
    }

    // Determine the next tier based on the current tier
    let targetTier;
    if (currentTier === 'BRONZE') {
      targetTier = 'SILVER';
    } else if (currentTier === 'SILVER') {
      targetTier = 'GOLD';
    }

    return NextResponse.json({
      is_eligible: true,
      star_level: starLevel,
      current_tier: currentTier,
      target_tier: targetTier,
      exam_config: examConfig,
      previous_attempts: previousAttempts || []
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness promotion-exam eligibility GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 