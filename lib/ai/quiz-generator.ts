import { createClient } from '@supabase/supabase-js';
import { callGeminiWithRetry, logAICall } from './gemini-client';

// Define type interfaces for quiz data
interface QuizQuestion {
  id: string;
  question_text: string;
  options: QuizOption[];
  correct_answer: string | { answers: string[] };
  question_type: 'MCQ' | 'MSQ';
  explanation?: string;
}

interface QuizOption {
  id: string;
  text: string;
}

interface LessonData {
  id: number;
  quiz_data?: {
    quiz_generation_prompt?: string;
    quiz_enabled?: boolean;
  };
}

interface ModuleData {
  id: number;
  configuration?: {
    ai_quiz_enabled?: boolean;
    enable_ai_quizzes?: boolean;
    ai_quiz_question_count?: number;
  };
}

// Define type for question bank mapping
interface QuestionBankMapping {
  question_id: string;
}

/**
 * Generates a quiz for a specific lesson
 * 
 * @param lessonId The ID of the lesson
 * @param moduleId The ID of the module containing the lesson
 * @param studentTier The tier of the student (beginner, intermediate, advanced)
 * @param isDeterministicAttempt If true, this is being called during quiz submission (requires exact match)
 * @returns An array of quiz questions or null if generation fails
 */
export async function generateQuizForLesson(
  lessonId: string,
  moduleId: string,
  studentTier: 'beginner' | 'intermediate' | 'advanced',
  isDeterministicAttempt = false
): Promise<QuizQuestion[] | null> {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Step 1: Fetch lesson and module configuration
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, quiz_data')
      .eq('id', lessonId)
      .single();
      
    if (lessonError || !lessonData) {
      console.error('Error fetching lesson data:', lessonError);
      return null;
    }
    
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, configuration')
      .eq('id', moduleId)
      .single();
      
    if (moduleError || !moduleData) {
      console.error('Error fetching module data:', moduleError);
      return null;
    }
    
    // Check if AI quizzes are enabled for this module
    const aiQuizEnabled = moduleData.configuration?.ai_quiz_enabled || 
                          moduleData.configuration?.enable_ai_quizzes || 
                          false;
    if (!aiQuizEnabled) {
      return null;
    }
    
    const questionCount = moduleData.configuration?.ai_quiz_question_count ?? 5;
    const quizGenerationPrompt = lessonData.quiz_data?.quiz_generation_prompt;
    
    if (!quizGenerationPrompt) {
      console.error('No quiz generation prompt found for lesson', lessonId);
      return null;
    }
    
    // Step 2: Determine quiz prompt based on configuration and student tier
    const prompt = generatePromptForQuiz(quizGenerationPrompt, studentTier, questionCount);
    
    // Step 3: Call Gemini API with structured output schema
    // Set temperature = 0 for deterministic output (CRITICAL for submission matching)
    const structuredOutputSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          question_text: { type: 'string' },
          question_type: { type: 'string', enum: ['MCQ', 'MSQ'] },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' }
              },
              required: ['id', 'text']
            }
          },
          correct_answer: {}, // Can be string or object with answers array
          explanation: { type: 'string' }
        },
        required: ['id', 'question_text', 'options', 'correct_answer', 'question_type']
      }
    };
    
    const generatePromptFn = () => prompt;
    
    const result = await callGeminiWithRetry<QuizQuestion[]>(
      generatePromptFn,
      {
        // Use a small amount of temperature for initial quiz display, 
        // but keep deterministic (temperature=0) for submission matching
        temperature: isDeterministicAttempt ? 0 : 0.5,
        structuredOutputSchema
      }
    );
    
    // Log the AI call (excluding full prompt/response in production)
    logAICall('quiz-generator', prompt, result, {
      lessonId,
      moduleId,
      studentTier,
      isDeterministicAttempt,
      questionCount
    });
    
    if (!result.success || !result.data) {
      console.error('Failed to generate quiz:', result.error);
      return null;
    }
    
    // Step 4: Process and validate AI response
    const questions = result.data;
    
    // Validate the structure and content of generated questions
    const validatedQuestions = validateQuizQuestions(questions);
    if (!validatedQuestions) {
      console.error('Generated questions failed validation');
      return null;
    }
    
    // Step 5: Return generated questions
    return validatedQuestions;
  } catch (error) {
    console.error('Error in generateQuizForLesson:', error);
    return null;
  }
}

/**
 * Helper function to construct the prompt for quiz generation
 */
function generatePromptForQuiz(
  basePrompt: string, 
  studentTier: 'beginner' | 'intermediate' | 'advanced',
  questionCount: number
): string {
  // Start with few-shot examples to demonstrate the expected JSON structure
  const fewShotExample = `
[
  {
    "id": "q1",
    "question_text": "What is the primary purpose of a database index?",
    "question_type": "MCQ",
    "options": [
      {"id": "opt_a", "text": "To protect data from unauthorized access"},
      {"id": "opt_b", "text": "To speed up data retrieval operations"},
      {"id": "opt_c", "text": "To prevent data corruption"},
      {"id": "opt_d", "text": "To compress data storage"}
    ],
    "correct_answer": "opt_b",
    "explanation": "Database indexes improve the speed of data retrieval operations by providing faster access to data rows in database tables, similar to how a book index helps find pages quickly."
  },
  {
    "id": "q2",
    "question_text": "Which of the following are key principles of RESTful API design?",
    "question_type": "MSQ",
    "options": [
      {"id": "opt_a", "text": "Statelessness"},
      {"id": "opt_b", "text": "Uniform interface"},
      {"id": "opt_c", "text": "Always using XML for data exchange"},
      {"id": "opt_d", "text": "Resource-based architecture"}
    ],
    "correct_answer": {"answers": ["opt_a", "opt_b", "opt_d"]},
    "explanation": "RESTful APIs are characterized by statelessness, a uniform interface, and resource-based architecture. While REST can use various formats, XML is not a requirement (JSON is often used)."
  }
]`;

  // Construct the full prompt with instructions on difficulty level
  return `
Generate a set of ${questionCount} quiz questions about the following topic. 
Adjust the difficulty level for a ${studentTier} student.

TOPIC:
${basePrompt}

REQUIREMENTS:
1. Each question should have exactly 4 options.
2. For Multiple Choice Questions (MCQ), use "question_type": "MCQ" and "correct_answer": "opt_X".
3. For Multiple Select Questions (MSQ), use "question_type": "MSQ" and "correct_answer": {"answers": ["opt_X", "opt_Y"]}.
4. All option IDs must follow the format "opt_a", "opt_b", "opt_c", "opt_d".
5. Each question must have a unique ID (q1, q2, etc.).
6. Include a brief explanation for each correct answer.
7. Return ONLY the JSON array with no other text.

EXAMPLES OF EXPECTED FORMAT:
${fewShotExample}

Remember to create questions with exactly this structure. The response must be valid JSON that I can parse directly.
`;
}

/**
 * Validates the structure and content of quiz questions
 */
function validateQuizQuestions(questions: QuizQuestion[]): QuizQuestion[] | null {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('Questions must be a non-empty array');
      return null;
    }
    
    // Validate each question
    for (const question of questions) {
      // Check for required fields
      if (!question.id || !question.question_text || !question.options || !question.correct_answer || !question.question_type) {
        console.error('Question missing required fields', question);
        return null;
      }
      
      // Validate question type
      if (question.question_type !== 'MCQ' && question.question_type !== 'MSQ') {
        console.error('Invalid question type', question.question_type);
        return null;
      }
      
      // Validate options (should have exactly 4 options)
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        console.error('Question must have exactly 4 options', question);
        return null;
      }
      
      // Validate option IDs
      const validOptionIds = ['opt_a', 'opt_b', 'opt_c', 'opt_d'];
      for (const option of question.options) {
        if (!option.id || !validOptionIds.includes(option.id)) {
          console.error('Invalid option ID', option.id);
          return null;
        }
      }
      
      // Validate correct answer format
      if (question.question_type === 'MCQ') {
        if (typeof question.correct_answer !== 'string' || !validOptionIds.includes(question.correct_answer)) {
          console.error('Invalid correct_answer for MCQ', question.correct_answer);
          return null;
        }
      } else if (question.question_type === 'MSQ') {
        const answerObj = question.correct_answer as { answers: string[] };
        if (!answerObj || !answerObj.answers || !Array.isArray(answerObj.answers)) {
          console.error('Invalid correct_answer format for MSQ', question.correct_answer);
          return null;
        }
        
        for (const optId of answerObj.answers) {
          if (!validOptionIds.includes(optId)) {
            console.error('Invalid option ID in MSQ answers', optId);
            return null;
          }
        }
      }
    }
    
    return questions;
  } catch (error) {
    console.error('Error validating quiz questions:', error);
    return null;
  }
}

/**
 * Transforms questions for client-side use by removing correct answers
 */
export function transformQuestionsForClient(questions: QuizQuestion[]): any[] {
  return questions.map(q => {
    const { correct_answer, explanation, ...clientQuestion } = q;
    return clientQuestion;
  });
}

/**
 * Gets fallback questions from the question bank if AI generation fails
 */
export async function getFallbackQuestions(
  lessonId: string,
  supabase: any
): Promise<QuizQuestion[] | null> {
  try {
    // Get mapped questions from lesson_question_bank_mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('lesson_question_bank_mappings')
      .select('question_id')
      .eq('lesson_id', lessonId);
      
    if (mappingsError || !mappings || mappings.length === 0) {
      console.error('No fallback questions mapped for lesson', lessonId);
      return null;
    }
    
    const questionIds = mappings.map((mapping: QuestionBankMapping) => mapping.question_id);
    
    // Fetch the actual questions from assessment_questions
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .in('id', questionIds);
      
    if (questionsError || !questions || questions.length === 0) {
      console.error('Error fetching fallback questions:', questionsError);
      return null;
    }
    
    // Transform assessment questions to quiz question format
    const transformedQuestions: QuizQuestion[] = questions.map((q: any, index: number) => {
      // Handle different question types
      const questionType = q.is_multi_correct ? 'MSQ' : 'MCQ';
      let correctAnswer;
      
      if (questionType === 'MCQ') {
        correctAnswer = q.correct_option || 'opt_a';
      } else {
        correctAnswer = {
          answers: Array.isArray(q.correct_options) ? q.correct_options : ['opt_a']
        };
      }
      
      return {
        id: `q${index + 1}`,
        question_text: q.question_text,
        question_type: questionType,
        options: [
          { id: 'opt_a', text: q.option_a || 'Option A' },
          { id: 'opt_b', text: q.option_b || 'Option B' },
          { id: 'opt_c', text: q.option_c || 'Option C' },
          { id: 'opt_d', text: q.option_d || 'Option D' }
        ],
        correct_answer: correctAnswer,
        explanation: q.explanation || ''
      };
    });
    
    return transformedQuestions;
  } catch (error) {
    console.error('Error in getFallbackQuestions:', error);
    return null;
  }
} 