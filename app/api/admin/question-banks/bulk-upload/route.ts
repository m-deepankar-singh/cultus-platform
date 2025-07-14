import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateApiRequestSecure } from '@/lib/auth/api-auth';
import { SELECTORS } from '@/lib/api/selectors';

// Schema for validating each question
const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, { message: "Option text is required" })
});

const BulkQuestionSchema = z.object({
  question_text: z.string().min(5, { message: "Question text must be at least 5 characters" }),
  question_type: z.enum(['MCQ', 'MSQ'], { message: "Question type must be MCQ or MSQ" }),
  options: z.array(QuestionOptionSchema).min(2, { message: "At least 2 options are required" }).max(6, { message: "Maximum 6 options allowed" }),
  correct_answer: z.union([
    z.string(), // For MCQ - single option ID
    z.object({
      answers: z.array(z.string()).min(1, { message: "At least one correct answer is required for MSQ" })
    }) // For MSQ - object with answers array
  ]),
  topic: z.string().optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().nullable(),
});

type BulkQuestionSchemaType = z.infer<typeof BulkQuestionSchema>;

// Interface for processed question data with additional fields
interface ProcessedQuestionData extends BulkQuestionSchemaType {
  _errors?: Record<string, string>;
  _row_number?: number;
}

// Schema for the bulk upload request payload
const BulkUploadPayloadSchema = z.object({
  questions: z.array(z.any()) // Raw data from Excel, will be parsed and validated
});

// Batch size for processing
const BATCH_SIZE = 25;

// Helper function to parse Excel data into our question format
function parseExcelRowToQuestion(row: any, rowIndex: number): { question: Partial<BulkQuestionSchemaType>, errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  try {
    // Handle both column-based format and JSON format
    let options: { id: string; text: string }[] = [];
    let correctAnswer: string | { answers: string[] };
    
    // Check if using JSON format
    if (row.options_json && row.correct_answer_json) {
      // JSON format
      try {
        const parsedOptions = JSON.parse(row.options_json);
        if (!Array.isArray(parsedOptions)) {
          errors.options = "options_json must be a valid JSON array";
        } else {
          options = parsedOptions.map((opt: any, index: number) => ({
            id: opt.id || `opt${index + 1}`,
            text: String(opt.text || '').trim()
          }));
        }
      } catch (e) {
        errors.options = "Invalid JSON format for options_json";
      }
      
      try {
        const parsedCorrectAnswer = JSON.parse(row.correct_answer_json);
        if (row.question_type === 'MSQ') {
          if (Array.isArray(parsedCorrectAnswer)) {
            correctAnswer = { answers: parsedCorrectAnswer };
          } else {
            errors.correct_answer = "MSQ questions require correct_answer_json to be an array";
          }
        } else {
          if (typeof parsedCorrectAnswer === 'string') {
            correctAnswer = parsedCorrectAnswer;
          } else {
            errors.correct_answer = "MCQ questions require correct_answer_json to be a string";
          }
        }
      } catch (e) {
        errors.correct_answer = "Invalid JSON format for correct_answer_json";
      }
    } else {
      // Column-based format
      const optionColumns = ['option_1', 'option_2', 'option_3', 'option_4', 'option_5', 'option_6'];
      options = optionColumns
        .map((col, index) => ({
          id: col,
          text: String(row[col] || '').trim()
        }))
        .filter(opt => opt.text.length > 0);
      
      if (options.length < 2) {
        errors.options = "At least 2 options are required";
      }
      
      // Parse correct answer
      const correctAnswerStr = String(row.correct_answer || '').trim();
      if (!correctAnswerStr) {
        errors.correct_answer = "Correct answer is required";
      } else if (row.question_type === 'MSQ') {
        // For MSQ, expect comma-separated values
        const answerIds = correctAnswerStr.split(',').map(id => id.trim()).filter(id => id.length > 0);
        correctAnswer = { answers: answerIds };
      } else {
        // For MCQ, expect single value
        correctAnswer = correctAnswerStr;
      }
    }
    
    // Validate correct answer against options
    if (!errors.correct_answer && !errors.options && options.length > 0) {
      const optionIds = options.map(opt => opt.id);
      
      if (row.question_type === 'MSQ' && typeof correctAnswer === 'object' && 'answers' in correctAnswer) {
        const invalidIds = correctAnswer.answers.filter(id => !optionIds.includes(id));
        if (invalidIds.length > 0) {
          errors.correct_answer = `Invalid option IDs: ${invalidIds.join(', ')}`;
        }
      } else if (row.question_type === 'MCQ' && typeof correctAnswer === 'string') {
        if (!optionIds.includes(correctAnswer)) {
          errors.correct_answer = `Invalid option ID: ${correctAnswer}`;
        }
      }
    }
    
    const question: Partial<BulkQuestionSchemaType> = {
      question_text: String(row.question_text || '').trim(),
      question_type: row.question_type === 'MCQ' || row.question_type === 'MSQ' ? row.question_type : undefined,
      options,
      correct_answer: correctAnswer!,
      topic: row.topic ? String(row.topic).trim() : null,
      difficulty: ['easy', 'medium', 'hard'].includes(row.difficulty) ? row.difficulty : null,
    };
    
    return { question, errors };
  } catch (error) {
    return {
      question: {},
      errors: { general: `Error parsing row ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * POST /api/admin/question-banks/bulk-upload
 * 
 * Validates and previews the uploaded Excel data.
 * Returns the parsed data with validation errors if any.
 */
export async function POST(request: Request) {
  try {
    // JWT-based authentication
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return new NextResponse(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { user, supabase } = authResult;

    // Parse and validate the request body
    const body = await request.json();
    const payloadValidation = BulkUploadPayloadSchema.safeParse(body);
    
    if (!payloadValidation.success) {
      return new NextResponse(JSON.stringify({ 
        error: "Invalid payload structure", 
        details: payloadValidation.error.format() 
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const { questions: uploadedQuestions } = payloadValidation.data;
    
    if (!uploadedQuestions || uploadedQuestions.length === 0) {
      return new NextResponse(JSON.stringify({ error: "No question data provided"}), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process and validate each question
    const processedQuestions = uploadedQuestions.map((questionData: any, index: number) => {
      const { question, errors: parseErrors } = parseExcelRowToQuestion(questionData, index);
      
      // Additional validation using Zod schema
      const validationResult = BulkQuestionSchema.safeParse(question);
      const allErrors: Record<string, string> = { ...parseErrors };
      
      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        for (const fieldKey in fieldErrors) {
          const key = fieldKey as keyof BulkQuestionSchemaType;
          if (fieldErrors[key] && fieldErrors[key]!.length > 0 && !allErrors[key]) {
            allErrors[key] = fieldErrors[key]![0];
          }
        }
      }
      
      // Check for duplicate question text within the batch (case-insensitive)
      const currentQuestionText = (question.question_text || '').toLowerCase().trim();
      if (currentQuestionText) {
        const duplicateIndex = uploadedQuestions.findIndex((otherQuestion: any, otherIndex: number) => 
          index !== otherIndex && 
          (otherQuestion.question_text || '').toLowerCase().trim() === currentQuestionText
        );
        if (duplicateIndex !== -1) {
          allErrors.question_text = allErrors.question_text ? 
            `${allErrors.question_text}; Duplicate in batch` : 
            "Duplicate question text found in this upload batch";
        }
      }

      return {
        ...question,
        _row_number: index + 1,
        _errors: Object.keys(allErrors).length > 0 ? allErrors : undefined,
      } as ProcessedQuestionData;
    });
    
    // Return the processed data for preview
    return NextResponse.json({ questions: processedQuestions }, { 
      headers: { 'Content-Type': 'application/json' } 
    });
    
  } catch (error) {
    console.error('API Error (Question Preview/Validation):', error);
    let errorMessage = 'Internal Server Error during preview/validation';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT /api/admin/question-banks/bulk-upload
 * 
 * Handles the final submission of bulk question data.
 * Creates question records for all validated questions in batches.
 */
export async function PUT(request: Request) {
  try {
    // JWT-based authentication
    const authResult = await authenticateApiRequestSecure(['Admin']);
    if ('error' in authResult) {
      return new NextResponse(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { user, supabase } = authResult;

    // Parse and validate the request body
    const body = await request.json();
    
    const payloadValidation = BulkUploadPayloadSchema.safeParse(body);
    if (!payloadValidation.success || !payloadValidation.data.questions || payloadValidation.data.questions.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Invalid or empty question data provided' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { questions: questionsToSubmit } = payloadValidation.data;

    // Check for existing question texts in DB (to avoid duplicates)
    const questionTexts = questionsToSubmit
      .map((q: any) => (q.question_text || '').toString().trim())
      .filter(Boolean);
    
    const { data: existingQuestions, error: dbCheckError } = await supabase
      .from('assessment_questions')
      .select('question_text')
      .in('question_text', questionTexts);

    if (dbCheckError) {
      return new NextResponse(JSON.stringify({ error: 'Failed to verify existing questions' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const existingQuestionTexts = new Set((existingQuestions || []).map((q: any) => (q.question_text || '').toLowerCase()));

    const successfulQuestions: any[] = [];
    const failedQuestions: any[] = [];

    // Process questions in batches for better performance
    for (let i = 0; i < questionsToSubmit.length; i += BATCH_SIZE) {
      const batch = questionsToSubmit.slice(i, i + BATCH_SIZE);
      
      // Process each question in the batch
      await Promise.all(batch.map(async (questionData: any) => {
        // Check if this is already processed data (from preview) or raw Excel data
        let finalQuestionData: any;
        let parseErrors: Record<string, string> = {};
        
        if (questionData.options && Array.isArray(questionData.options) && questionData.options.length > 0) {
          // Data is already processed from preview - use it directly
          finalQuestionData = {
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            options: questionData.options,
            correct_answer: questionData.correct_answer,
            topic: questionData.topic,
            difficulty: questionData.difficulty,
          };
        } else {
          // Raw Excel data - parse it
          const parseResult = parseExcelRowToQuestion(questionData, i);
          finalQuestionData = parseResult.question;
          parseErrors = parseResult.errors;
        }
        
        // Validate the final question data
        const validationResult = BulkQuestionSchema.safeParse(finalQuestionData);
        
        if (!validationResult.success || Object.keys(parseErrors).length > 0) {
          failedQuestions.push({ 
            question_text: finalQuestionData.question_text || 'Invalid question',
            error: "Invalid question structure (pre-DB check)", 
            details: { ...parseErrors, ...validationResult.error?.flatten().fieldErrors }
          });
          return;
        }

        const validatedQuestionData = validationResult.data;
        const questionTextLower = validatedQuestionData.question_text.toLowerCase();

        // Check for duplicates in database
        if (existingQuestionTexts.has(questionTextLower)) {
          failedQuestions.push({ 
            question_text: validatedQuestionData.question_text, 
            error: "Question text already exists in the database" 
          });
          return;
        }

        try {
          // Insert question into assessment_questions table
          const { data: newQuestion, error: createDbError } = await supabase
            .from('assessment_questions')
            .insert({
              question_text: validatedQuestionData.question_text,
              question_type: validatedQuestionData.question_type,
              options: validatedQuestionData.options,
              correct_answer: validatedQuestionData.correct_answer,
              topic: validatedQuestionData.topic,
              difficulty: validatedQuestionData.difficulty,
              created_by: user.id, // Track who created the question
            })
            .select(SELECTORS.QUESTION_BANK.DETAIL)
            .single();

          if (createDbError) {
            throw new Error(createDbError.message || 'Failed to create question record in DB');
          }
          
          // Add to existing set to prevent re-processing in this batch
          existingQuestionTexts.add(questionTextLower);
          successfulQuestions.push(newQuestion);

        } catch (processingError) {
          failedQuestions.push({ 
            question_text: validatedQuestionData.question_text, 
            error: processingError instanceof Error ? processingError.message : 'Unknown processing error' 
          });
        }
      }));
    }
    
    // Return the results
    const response = {
      message: "Bulk question upload process completed.",
      successCount: successfulQuestions.length,
      failedCount: failedQuestions.length,
      processedCount: questionsToSubmit.length,
      successful_questions: successfulQuestions.map(q => q.question_text),
      failed_submissions: failedQuestions
    };
    
    return NextResponse.json(response, { headers: { 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('API Error (Question Submission):', error);
    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred during final submission' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}