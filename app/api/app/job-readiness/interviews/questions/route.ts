import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Define types for background and questions
type BackgroundType = 'COMPUTER_SCIENCE' | 'ECONOMICS' | 'MARKETING' | 'DEFAULT';

type QuestionsByBackground = Record<BackgroundType, string[]>;

/**
 * GET /api/app/job-readiness/interviews/questions
 * Get AI-generated interview questions based on student background and tier
 * This endpoint requires the student to have reached Star 4 (completed projects)
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
    
    // Verify the student has a background type set
    if (!student.job_readiness_background_type) {
      return NextResponse.json({ 
        error: 'Background type not set for student. Please contact an administrator.' 
      }, { status: 400 });
    }

    // Check if the student has unlocked interviews
    // Interviews are unlocked after star level FOUR (completed projects)
    const starLevel = student.job_readiness_star_level || 'ONE';
    const hasUnlockedInterviews = ['FIVE'].includes(starLevel);

    if (!hasUnlockedInterviews) {
      return NextResponse.json({ 
        error: 'Interviews are locked until you complete projects (Star 4)',
        current_star_level: starLevel,
        required_star_level: 'FOUR',
        is_unlocked: false
      }, { status: 403 });
    }

    // Get the appropriate interview configuration for the student's background
    const { data: backgroundInterviewMapping, error: mappingError } = await supabase
      .from('job_readiness_background_interview_types')
      .select('*')
      .eq('background_type', student.job_readiness_background_type)
      .single();

    if (mappingError || !backgroundInterviewMapping) {
      console.error('Error fetching background interview mapping:', mappingError);
      
      // Fallback to generic questions if no specific mapping is found
      const placeholderQuestions = [
        "Tell me about yourself and your career aspirations.",
        "What are your greatest strengths and weaknesses?",
        "Describe a challenging situation you faced and how you overcame it.",
        "Why are you interested in this field?",
        "Where do you see yourself in five years?"
      ];
      
      return NextResponse.json({
        message: "Using generic questions as no specific mapping was found for your background",
        questions: placeholderQuestions,
        interview_focus_area: "General",
        video_time_limit: 240, // 4 minutes in seconds
        current_star_level: starLevel,
        current_tier: student.job_readiness_tier
      });
    }

    // Get the tier-specific prompts
    const tier = student.job_readiness_tier || 'BRONZE';
    const systemPrompt = backgroundInterviewMapping[`${tier.toLowerCase()}_system_prompt`];
    const inputPrompt = backgroundInterviewMapping[`${tier.toLowerCase()}_input_prompt`];
    
    // In a real implementation, this would call an AI service to generate the questions
    // For now, return placeholder questions to demonstrate the structure
    
    // Number of questions should be based on interview configuration
    const questionCount = backgroundInterviewMapping.question_quantity || 5;
    
    // Generate placeholder questions based on background and focus area
    const focusArea = backgroundInterviewMapping.interview_focus_area || 'General';
    
    // Placeholder questions by background type
    const questionsByBackground: QuestionsByBackground = {
      'COMPUTER_SCIENCE': [
        "Explain the difference between inheritance and composition in object-oriented programming.",
        "How would you optimize a slow database query?",
        "Describe a time when you had to debug a complex issue in your code.",
        "What is your approach to ensuring code quality and testability?",
        "How do you stay current with new technologies and programming languages?"
      ],
      'ECONOMICS': [
        "How would you evaluate the economic impact of a policy change?",
        "Explain the relationship between inflation and unemployment.",
        "Describe a time when you had to analyze complex economic data.",
        "What economic metrics would you consider when evaluating a business opportunity?",
        "How do you apply economic principles to real-world business situations?"
      ],
      'MARKETING': [
        "How would you approach developing a marketing strategy for a new product?",
        "Describe a successful marketing campaign you've worked on.",
        "What metrics do you use to measure marketing effectiveness?",
        "How do you identify and target specific customer segments?",
        "How has digital transformation changed marketing approaches?"
      ],
      'DEFAULT': [
        "Tell me about your background and relevant experience.",
        "What skills do you bring to this role?",
        "Describe a project you're particularly proud of.",
        "How do you approach problem-solving in your field?",
        "What are your career goals and how does this position align with them?"
      ]
    };
    
    // Get questions for the student's background, or use default if not found
    const studentBackground = student.job_readiness_background_type as BackgroundType;
    const backgroundQuestions = questionsByBackground[studentBackground] || 
                              questionsByBackground['DEFAULT'];
    
    // Adjust difficulty based on tier
    const tierPrefix = tier === 'GOLD' ? 'Advanced: ' : 
                      (tier === 'SILVER' ? 'Intermediate: ' : 'Basic: ');
    
    const questions = backgroundQuestions.slice(0, questionCount).map((q: string) => tierPrefix + q);

    // Video time limit from configuration or default to 4 minutes
    const videoTimeLimit = backgroundInterviewMapping.video_time_limit || 240; // seconds

    return NextResponse.json({
      message: "This is a placeholder for AI-generated interview questions. Future implementation will use actual AI generation.",
      questions,
      interview_focus_area: focusArea,
      video_time_limit: videoTimeLimit,
      system_prompt: systemPrompt,
      input_prompt: inputPrompt,
      current_star_level: starLevel,
      current_tier: tier,
      would_earn_star_5: false // This would be set to true when they submit a passing interview
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness interviews questions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 