import { createClient } from '@supabase/supabase-js';
import { callGeminiWithRetry, logAICall } from './gemini-client';

// Define type interfaces
interface InterviewQuestion {
  id: string;
  question_text: string;
}

// Type for student tiers
type StudentTier = 'BRONZE' | 'SILVER' | 'GOLD';

// Type for background types
type BackgroundType = 'ECONOMICS' | 'COMPUTER_SCIENCE' | 'MARKETING' | 'DESIGN' | 'HUMANITIES' | 'BUSINESS' | 'ENGINEERING';

/**
 * Generates interview questions based on student background and tier
 * 
 * @param studentId The ID of the student
 * @returns An array of interview questions or null if generation fails
 */
export async function generateInterviewQuestions(
  studentId: string
): Promise<InterviewQuestion[] | null> {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Fetch student's background type and tier
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('job_readiness_background_type, job_readiness_tier')
      .eq('id', studentId)
      .single();
      
    if (studentError || !student) {
      console.error('Error fetching student data:', studentError);
      return null;
    }
    
    const backgroundType = student.job_readiness_background_type as BackgroundType;
    const studentTier = student.job_readiness_tier as StudentTier;
    
    if (!backgroundType || !studentTier) {
      console.error('Student missing background type or tier:', { backgroundType, studentTier });
      return null;
    }
    
    // Step 2: Fetch interview configuration based on background type
    const { data: interviewConfig, error: configError } = await supabase
      .from('job_readiness_background_interview_types')
      .select('*')
      .eq('background_type', backgroundType)
      .single();
      
    if (configError || !interviewConfig) {
      console.error('Error fetching interview configuration:', configError);
      return getFallbackQuestions(backgroundType, studentTier, supabase);
    }
    
    // Step 3: Determine which tier-specific prompts to use
    const systemPrompt = interviewConfig[`${studentTier.toLowerCase()}_system_prompt`];
    const inputPrompt = interviewConfig[`${studentTier.toLowerCase()}_input_prompt`];
    const questionQuantity = interviewConfig.question_quantity || 5;
    
    if (!systemPrompt || !inputPrompt) {
      console.error('Missing tier-specific prompts:', { systemPrompt, inputPrompt });
      return getFallbackQuestions(backgroundType, studentTier, supabase);
    }
    
    // Step 4: Construct the full prompt for the AI
    const prompt = constructInterviewPrompt(systemPrompt, inputPrompt, backgroundType, studentTier, questionQuantity);
    
    // Step 5: Call Gemini API with structured output schema
    const structuredOutputSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          question_text: { type: 'string' }
        },
        required: ['id', 'question_text']
      }
    };
    
    const generatePromptFn = () => prompt;
    
    const result = await callGeminiWithRetry<InterviewQuestion[]>(
      generatePromptFn,
      {
        temperature: 0.5, // Some variation but not too creative
        structuredOutputSchema
      }
    );
    
    // Log the AI call
    logAICall('interview-question-generator', prompt, result, {
      studentId,
      backgroundType,
      studentTier,
      questionQuantity
    });
    
    if (!result.success || !result.data) {
      console.error('Failed to generate interview questions:', result.error);
      return getFallbackQuestions(backgroundType, studentTier, supabase);
    }
    
    // Step 6: Process and validate AI response
    const questions = result.data;
    
    // Validate the structure of generated questions
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('Invalid question format or empty question array');
      return getFallbackQuestions(backgroundType, studentTier, supabase);
    }
    
    // Ensure we have the right number of questions
    const validatedQuestions = questions.slice(0, questionQuantity);
    
    // Ensure each question has an ID and text
    const finalQuestions = validatedQuestions.map((q, index) => ({
      id: q.id || `q${index + 1}`,
      question_text: q.question_text
    }));
    
    // Step 7: Return generated questions
    return finalQuestions;
  } catch (error) {
    console.error('Error in generateInterviewQuestions:', error);
    return null;
  }
}

/**
 * Constructs the prompt for interview question generation
 */
function constructInterviewPrompt(
  systemPrompt: string,
  inputPrompt: string,
  backgroundType: BackgroundType,
  studentTier: StudentTier,
  questionQuantity: number
): string {
  // Start with a few-shot example to demonstrate the expected JSON structure
  const fewShotExample = `
[
  {
    "id": "q1",
    "question_text": "Describe a challenging situation you faced in a team project and how you resolved it."
  },
  {
    "id": "q2",
    "question_text": "How do you prioritize your work when you have multiple deadlines approaching simultaneously?"
  }
]`;

  // Combine the prompts with instructions for JSON formatting
  return `${systemPrompt}

Background: The student has a ${backgroundType} background.
Tier: ${studentTier}

${inputPrompt}

Please generate exactly ${questionQuantity} interview questions tailored to a candidate with a ${backgroundType} background at the ${studentTier} level. 

The questions should be formatted as a JSON array with the following structure:
${fewShotExample}

Remember:
- Generate exactly ${questionQuantity} questions
- Each question must have an "id" and "question_text" field
- Questions should be tailored to the ${backgroundType} field
- Questions should be appropriate for the ${studentTier} difficulty level
- Focus on questions that evaluate both technical knowledge and soft skills relevant to ${backgroundType}
- Questions should be open-ended to allow for detailed responses during a video interview
- Do not include multiple-choice options

Return only a valid JSON array of questions.`;
}

/**
 * Gets fallback interview questions if AI generation fails
 */
async function getFallbackQuestions(
  backgroundType: BackgroundType,
  studentTier: StudentTier,
  supabase: any
): Promise<InterviewQuestion[] | null> {
  try {
    // Try to get fallback questions from the database
    const { data, error } = await supabase
      .from('job_readiness_fallback_interview_questions')
      .select('*')
      .eq('background_type', backgroundType)
      .eq('tier', studentTier);
      
    if (error || !data || data.length === 0) {
      console.error('Error fetching fallback questions or none found:', error);
      
      // If no specific fallback questions, generate generic fallback questions
      return generateGenericFallbackQuestions(backgroundType);
    }
    
    // Format the questions from the database into the expected structure
    return data.map((q: any, index: number) => ({
      id: `fallback_${index + 1}`,
      question_text: q.question_text
    }));
  } catch (error) {
    console.error('Error in getFallbackQuestions:', error);
    return generateGenericFallbackQuestions(backgroundType);
  }
}

/**
 * Generates generic fallback questions if no fallback questions are found in the database
 */
function generateGenericFallbackQuestions(backgroundType: BackgroundType): InterviewQuestion[] {
  // Generic questions based on background type
  const genericQuestions: Record<BackgroundType, string[]> = {
    'ECONOMICS': [
      "How would you apply economic principles to analyze a market trend?",
      "Describe a time when you used data to make an economic prediction.",
      "How do you approach cost-benefit analysis in your work?",
      "What economic theories do you find most relevant in today's economy?",
      "How would you explain a complex economic concept to a non-expert audience?"
    ],
    'COMPUTER_SCIENCE': [
      "Describe a challenging programming problem you've solved and your approach.",
      "How do you stay updated with the latest technologies in your field?",
      "Explain your process for debugging a complex issue in your code.",
      "Describe a project where you had to optimize for performance. What steps did you take?",
      "How do you approach learning a new programming language or framework?"
    ],
    'MARKETING': [
      "Describe a marketing campaign you developed or contributed to. What was your role?",
      "How do you measure the success of a marketing strategy?",
      "How do you identify and target a specific audience for a product?",
      "Describe how you would adapt a marketing strategy for different social media platforms.",
      "How do you stay current with emerging marketing trends and technologies?"
    ],
    'DESIGN': [
      "Walk through your design process from concept to final product.",
      "How do you incorporate user feedback into your design iterations?",
      "Describe a time when you had to defend a design decision to stakeholders.",
      "How do you ensure your designs are accessible to all users?",
      "What tools and techniques do you use to stay creative and innovative in your designs?"
    ],
    'HUMANITIES': [
      "How has your humanities background influenced your analytical approach to problems?",
      "Describe a research project you conducted and its significance.",
      "How do you apply critical thinking skills from your humanities background to practical situations?",
      "How has your understanding of human behavior influenced your professional interactions?",
      "Describe how you would present complex humanities concepts to diverse audiences."
    ],
    'BUSINESS': [
      "Describe a business strategy you developed or contributed to. What was the outcome?",
      "How do you approach problem-solving in a business context?",
      "Describe a time when you had to make a difficult business decision with limited information.",
      "How do you balance short-term goals with long-term strategy?",
      "How do you adapt your leadership or teamwork style in different business situations?"
    ],
    'ENGINEERING': [
      "Describe a challenging engineering problem you solved and your approach.",
      "How do you ensure quality and safety in your engineering work?",
      "Describe a time when you had to optimize a design for cost-efficiency.",
      "How do you stay updated with new engineering techniques and technologies?",
      "Explain how you would communicate technical engineering concepts to non-technical stakeholders."
    ]
  };
  
  // Return the generic questions for the given background type
  return (genericQuestions[backgroundType] || genericQuestions.BUSINESS).map((q: string, index: number) => ({
    id: `generic_${index + 1}`,
    question_text: q
  }));
}

/**
 * Transforms the questions to send to the client
 * This removes any sensitive or unnecessary data
 */
export function transformQuestionsForClient(questions: InterviewQuestion[]): any[] {
  // For interview questions, we can just return the questions directly
  // since they don't contain any sensitive information like correct answers
  return questions;
} 