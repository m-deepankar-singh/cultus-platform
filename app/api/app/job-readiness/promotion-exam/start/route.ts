import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

// Define types for type safety when working with backgrounds and tiers
type BackgroundType = 'COMPUTER_SCIENCE' | 'ECONOMICS' | 'DEFAULT';
type DifficultyTier = 'BRONZE' | 'SILVER' | 'GOLD';

/**
 * POST /api/app/job-readiness/promotion-exam/start
 * Start a promotion exam for a student
 * Creates a new exam attempt and returns the exam questions
 */
export async function POST(req: NextRequest) {
  try {
    // JWT-based authentication (0 database queries)
    const authResult = await authenticateApiRequest(['student']);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user, supabase } = authResult;

    const body = await req.json();
    
    // Validate request body
    const { product_id } = body;
    
    if (!product_id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get student profile for the current user - specific fields only
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
    
    // Check eligibility (same checks as in the eligibility endpoint)
    // Check if promotion exams are enabled for this product
    const { data: examConfigs, error: configError } = await supabase
      .from('job_readiness_promotion_exam_config')
      .select('*')
      .eq('product_id', product_id);
      
    if (configError) {
      console.error('Error fetching promotion exam config:', configError);
      return NextResponse.json({ 
        error: 'Failed to fetch promotion exam configuration'
      }, { status: 500 });
    }

    if (!examConfigs || examConfigs.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion exams are not configured for this product'
      }, { status: 400 });
    }

    const examConfig = examConfigs[0];
    
    if (!examConfig.is_enabled) {
      return NextResponse.json({ 
        error: 'Promotion exams are disabled for this product'
      }, { status: 400 });
    }

    // Check if the student has completed the required star level
    const starLevel = student.job_readiness_star_level || 'ONE';
    const eligibleStarLevels = ['TWO', 'THREE'];
    const isEligibleStarLevel = eligibleStarLevels.includes(starLevel);

    if (!isEligibleStarLevel) {
      return NextResponse.json({ 
        error: 'Promotion exams are only available after completing Star 2 or Star 3'
      }, { status: 400 });
    }

    // Check if the student is already at the highest tier (GOLD)
    const currentTier = (student.job_readiness_tier || 'BRONZE') as DifficultyTier;
    if (currentTier === 'GOLD') {
      return NextResponse.json({ 
        error: 'You are already at the highest tier (GOLD)'
      }, { status: 400 });
    }

    // Check if the student has already passed a promotion exam for this star level
    const { data: previousAttempts, error: attemptsError } = await supabase
      .from('job_readiness_promotion_exam_attempts')
      .select('*')
      .eq('student_id', user.id)
      .eq('product_id', product_id)
      .eq('star_level', starLevel)
      .eq('passed', true);
      
    if (attemptsError) {
      console.error('Error fetching previous attempts:', attemptsError);
      // Continue execution, as this is not a blocking error
    }
    
    const hasPassedPreviousAttempt = previousAttempts && previousAttempts.length > 0;
    
    if (hasPassedPreviousAttempt) {
      return NextResponse.json({ 
        error: 'You have already passed a promotion exam for this star level'
      }, { status: 400 });
    }

    // Determine target tier
    const targetTier = currentTier === 'BRONZE' ? 'SILVER' : 'GOLD';
    
    // In a real implementation, this would generate questions using an AI service
    // For now, use placeholder questions appropriate to the student's background
    
    // Generate placeholder questions based on background and focus area
    const backgroundType = (student.job_readiness_background_type || 'DEFAULT') as BackgroundType;
    
    // Number of questions from the exam config
    const questionCount = examConfig.question_count || 25;
    
    // Placeholder questions by background type and current tier (difficulty increases with tier)
    const questionsByBackgroundAndTier: Record<BackgroundType, Record<DifficultyTier, string[]>> = {
      'COMPUTER_SCIENCE': {
        'BRONZE': [
          "What is the difference between a stack and a queue?",
          "Explain the concept of inheritance in object-oriented programming.",
          "What is the time complexity of binary search?",
          "What is the purpose of a database index?",
          "Describe the difference between HTTP and HTTPS."
        ],
        'SILVER': [
          "Explain the concept of dynamic programming.",
          "What is the CAP theorem in distributed systems?",
          "Compare and contrast RESTful and GraphQL APIs.",
          "Explain the purpose of design patterns in software development.",
          "What are the principles of SOLID in object-oriented design?"
        ],
        'GOLD': [] // Empty as GOLD tier students don't take promotion exams
      },
      'ECONOMICS': {
        'BRONZE': [
          "What is the law of supply and demand?",
          "Explain the concept of inflation.",
          "What is GDP and how is it calculated?",
          "Describe the difference between fiscal and monetary policy.",
          "What are the key principles of microeconomics?"
        ],
        'SILVER': [
          "Explain the concept of price elasticity of demand.",
          "What is the Nash equilibrium in game theory?",
          "Describe the impact of interest rates on currency valuation.",
          "What are externalities and how can they be addressed?",
          "Explain the concept of comparative advantage in international trade."
        ],
        'GOLD': [] // Empty as GOLD tier students don't take promotion exams
      },
      'DEFAULT': {
        'BRONZE': [
          "What are the key components of effective communication?",
          "Describe the difference between leadership and management.",
          "What strategies would you use to manage a project with tight deadlines?",
          "How would you approach solving complex problems in a team environment?",
          "What is the importance of data-driven decision making?"
        ],
        'SILVER': [
          "Explain the concept of strategic planning in an organization.",
          "How would you measure the success of a project?",
          "What approaches can be used to manage change within an organization?",
          "Describe how you would analyze market trends to inform business decisions.",
          "What ethical considerations are important in professional settings?"
        ],
        'GOLD': [] // Empty as GOLD tier students don't take promotion exams
      }
    };
    
    // Get questions for the student's background, or use default if not found
    // First, check if the background exists in our questions
    const validBackground: BackgroundType = 
      (Object.keys(questionsByBackgroundAndTier).includes(backgroundType)) ? 
      backgroundType : 'DEFAULT';
    
    // Now get the questions for this tier
    const tierQuestions = questionsByBackgroundAndTier[validBackground][currentTier];
    
    // Generate more questions to meet the required count (simple solution for placeholder)
    const questions = [];
    for (let i = 0; i < questionCount; i++) {
      const baseQuestion = tierQuestions[i % tierQuestions.length];
      questions.push({
        id: `q-${i+1}`,
        question: `${baseQuestion} (Question ${i+1})`,
        options: [
          { id: 'a', text: `Option A for question ${i+1}` },
          { id: 'b', text: `Option B for question ${i+1}` },
          { id: 'c', text: `Option C for question ${i+1}` },
          { id: 'd', text: `Option D for question ${i+1}` }
        ]
      });
    }
    
    // Generate a unique session ID for this exam attempt (questions will be stored on submission)
    const examSessionId = `exam_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Return the exam details and questions (no database storage until submission)
    return NextResponse.json({
      message: "Promotion exam started successfully",
      exam_session_id: examSessionId,
      questions: questions,
      time_limit_minutes: examConfig.time_limit_minutes,
      pass_threshold: examConfig.pass_threshold,
      current_tier: currentTier,
      target_tier: targetTier,
      product_id: product_id,
      star_level: starLevel
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness promotion-exam start POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 