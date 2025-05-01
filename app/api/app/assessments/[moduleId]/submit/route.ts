import { type Database } from '@/lib/database.types';
import { ModuleIdSchema as RouteModuleIdSchema } from '@/lib/schemas/module';
import { AssessmentSubmissionSchema } from '@/lib/schemas/progress';
import { createClient } from '@/lib/supabase/server';
import { getUserSessionAndRole } from '@/lib/supabase/utils';
import { type ZodError } from 'zod';
import { NextResponse } from 'next/server';

// Define a type for question structure from DB for clarity
type AssessmentQuestionWithAnswer = {
  question_id: string;
  assessment_questions: {
    question_type: 'MCQ' | 'MSQ' | 'TF'; // Add question type
    options: { id: string; text: string }[] | null; // Add options
    correct_answer: { answer: string } | { answers: string[] } | null; // Fetch the correct_answer JSONB
  } | null;
};

export async function POST(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  const supabase = await createClient();
  // const { user, profile, role, error: authError } = await getUserSessionAndRole(); <-- Removed this

  // 1. Authentication: Get user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError?.message || 'Authentication required' },
      { status: 401 }
    );
  }

  // 2. Authorization: Get student record and check status/client
  const { data: studentRecord, error: studentFetchError } = await supabase
    .from('students') // Query the students table
    .select('client_id, is_active') // Select relevant fields
    .eq('id', user.id)
    .single();

  if (studentFetchError) {
    console.error('Student Fetch Error:', studentFetchError);
    if (studentFetchError.code === 'PGRST116') { // No student record
      return NextResponse.json(
        { error: 'Forbidden: Student record not found' },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error: Could not fetch student record' },
      { status: 500 },
    );
  }

  if (!studentRecord.is_active) {
      return NextResponse.json(
          { error: 'Forbidden: Student account is inactive' },
          { status: 403 },
      );
  }

  if (!studentRecord.client_id) { 
    console.error(`Student ${user.id} has no assigned client_id in students table.`);
    return NextResponse.json(
      { error: 'Forbidden: Student not associated with a client' },
      { status: 403 },
    );
  }
  const studentId = user.id;
  const studentClientId = studentRecord.client_id; // Use client_id from student record

  // Original role check - this part is no longer needed as we've verified it's a student
  /*
  if (role !== 'Student') {
    return NextResponse.json(
      { error: 'Forbidden: Only students can submit assessments.' },
      { status: 403 }
    );
  }
  */

  // const studentId = user.id; <-- Already defined above

  // Await params before accessing properties
  const awaitedParams = await params;
  const moduleIdValidation = RouteModuleIdSchema.safeParse(awaitedParams);
  if (!moduleIdValidation.success) {
    return NextResponse.json(
      { error: 'Invalid Module ID in URL', details: moduleIdValidation.error.flatten() },
      { status: 400 }
    );
  }
  const moduleId = moduleIdValidation.data.moduleId;

  try {
    // 1. Parse and Validate Body
    let submissionData;
    try {
      const body = await request.json();
      submissionData = AssessmentSubmissionSchema.parse(body);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid submission data', details: (err as ZodError).flatten() },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid JSON body: ' + error.message },
        { status: 400 }
      );
    }

    // 2. Verify Module Type & Enrollment
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, type, configuration, product_id')
      .eq('id', moduleId)
      .single();

    if (moduleError || !moduleData) {
      console.error('Error fetching module:', moduleError);
      const status = moduleError?.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json(
        { error: status === 404 ? 'Module not found.' : 'Database error fetching module.' },
        { status }
      );
    }

    if (moduleData.type !== 'Assessment') {
      return NextResponse.json(
        { error: 'This module is not an assessment.' },
        { status: 400 }
      );
    }

    // Check Enrollment - Client-based enrollment
    console.log('DEBUG - Checking enrollment:', {
      clientId: studentClientId,
      productId: moduleData.product_id,
      studentId: studentId
    });
    
    const { count: clientEnrollmentCount, error: clientEnrollmentError } = await supabase
      .from('client_product_assignments')
      .select('client_id', { count: 'exact', head: true })
      .eq('client_id', studentClientId)
      .eq('product_id', moduleData.product_id);

    if (clientEnrollmentError) {
       console.error('Error checking client enrollment:', clientEnrollmentError);
       return NextResponse.json({ error: 'Failed to verify client enrollment.' }, { status: 500 });
    }
    
    console.log('DEBUG - Enrollment count result:', { clientEnrollmentCount });

    // Check if student has access through client assignment
    if (clientEnrollmentCount === 0) {
       console.log('DEBUG - Client is not enrolled in this product. Student cannot access the assessment.');
       return NextResponse.json({ error: 'Not enrolled in this course/product.' }, { status: 403 });
    }

    // 3. Check Previous Submission
    const { count: submissionCount, error: submissionCheckError } = await supabase
      .from('assessment_progress')
      .select('student_id', { count: 'exact', head: true }) // Use existing column 'student_id' for count check
      .eq('student_id', studentId)
      .eq('module_id', moduleId);

    if (submissionCheckError) {
        console.error('Error checking previous submissions:', submissionCheckError);
        return NextResponse.json({ error: 'Failed to check submission status.' }, { status: 500 });
    }

    // Add null check for count before using it
    if (submissionCount === null) {
        console.error('Failed to get submission count, assuming error.');
        return NextResponse.json({ error: 'Could not verify submission status.' }, { status: 500 });
    }

    // Use submissionCount directly (now known not to be null)
    if (submissionCount > 0) {
      // TODO: Add logic based on module configuration if re-submission is allowed
      return NextResponse.json(
        { error: 'Assessment already submitted.' },
        { status: 409 } // Conflict
      );
    }

    // 4. Fetch Correct Answers & Grade
    const { data: questionsData, error: questionsError } = await supabase
      .from('assessment_module_questions')
      .select(`
        question_id,
        assessment_questions ( question_type, options, correct_answer ) // Fetch actual columns
      `)
      .eq('module_id', moduleId)
      .returns<AssessmentQuestionWithAnswer[]>(); // Type assertion

    if (questionsError) {
      console.error('Error fetching assessment questions:', questionsError);
      return NextResponse.json(
        { error: 'Could not fetch assessment questions.' },
        { status: 500 }
      );
    }
    if (!questionsData || questionsData.length === 0) {
       console.warn(`No assessment questions found for module ${moduleId}`);
       // Decide how to handle - maybe allow submission with 0 score?
       return NextResponse.json({ error: 'No questions found for this assessment.' }, { status: 404 });
    }

    let correctCount = 0;
    const totalQuestions = questionsData.length;
    const submittedAnswers = submissionData.answers;

    for (const q of questionsData) {
      if (!q.assessment_questions) continue; // Skip if join failed or question has no answers

      const questionId = q.question_id;
      const correctAnswerData = q.assessment_questions.correct_answer;
      const questionType = q.assessment_questions.question_type;
      const submittedAnswer = submittedAnswers[questionId];

      if (!submittedAnswer || !correctAnswerData) continue; // Skip if not answered or no correct answer defined

      // --- UPDATED GRADING LOGIC ---
      if (questionType === 'MCQ' && typeof submittedAnswer === 'string') {
        // Handle both formats: string directly or { answer: string } object
        if (typeof correctAnswerData === 'string') {
          // Direct string format
          if (submittedAnswer === correctAnswerData) {
            correctCount++;
          }
        } else if (correctAnswerData && typeof correctAnswerData === 'object' && 'answer' in correctAnswerData) {
          // Object format with 'answer' property
          if (submittedAnswer === correctAnswerData.answer) {
            correctCount++;
          }
        } else {
          console.warn(`MCQ question ${questionId} has unexpected correct_answer format:`, correctAnswerData);
        }
      } else if (questionType === 'MSQ' && Array.isArray(submittedAnswer)) {
        // Handle both formats: array directly or { answers: array } object
        if (Array.isArray(correctAnswerData)) {
          // Direct array format
          const submittedSet = new Set(submittedAnswer.sort());
          const correctSet = new Set(correctAnswerData.sort());
          if (submittedSet.size === correctSet.size && [...submittedSet].every(value => correctSet.has(value))) {
             correctCount++;
          }
        } else if (correctAnswerData && typeof correctAnswerData === 'object' && 'answers' in correctAnswerData && Array.isArray(correctAnswerData.answers)) {
          // Object format with 'answers' property
          const submittedSet = new Set(submittedAnswer.sort());
          const correctSet = new Set(correctAnswerData.answers.sort());
          if (submittedSet.size === correctSet.size && [...submittedSet].every(value => correctSet.has(value))) {
             correctCount++;
          }
        } else {
          console.warn(`MSQ question ${questionId} has unexpected correct_answer format:`, correctAnswerData);
        }
      } // Add TF logic if needed
      // --- END UPDATED GRADING LOGIC ---
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    // Safely access configuration with type assertion or check
    const passThreshold = (moduleData.configuration as { pass_threshold?: number })?.pass_threshold ?? 70; // Default 70%
    const passed = score >= passThreshold;

    // 5. Insert Assessment Result
    const { data: insertResult, error: insertError } = await supabase
      .from('assessment_progress')
      .insert({
        student_id: studentId,
        module_id: moduleId,
        score: score,
        passed: passed,
        answers: submissionData.answers, // Storing submitted answers
        submitted_at: new Date().toISOString(),
        duration_seconds: submissionData.duration_seconds,
      })
      .select('score, passed, submitted_at') // Select the fields to return
      .single();

    if (insertError) {
      console.error('Error inserting assessment result:', insertError);
      return NextResponse.json(
        { error: 'Failed to save assessment result.', details: insertError.message },
        { status: 500 }
      );
    }

    // --- BEGIN: Update student_module_progress ---
    const moduleProgressUpdate = {
      student_id: studentId,
      module_id: moduleId,
      status: 'Completed' as const,
      progress_percentage: 100,
      score: score, // Update module score with assessment score
      completed_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };

    const { error: moduleUpdateError } = await supabase
      .from('student_module_progress')
      .upsert(moduleProgressUpdate, {
        onConflict: 'student_id, module_id',
      });

    if (moduleUpdateError) {
      // Log the error but don't fail the request, as the assessment submission itself succeeded.
      console.error(`Failed to update student_module_progress after assessment submission for student ${studentId}, module ${moduleId}:`, moduleUpdateError);
    }
    // --- END: Update student_module_progress ---

    // 6. Handle Response
    return NextResponse.json(insertResult, { status: 201 }); // 201 Created

  } catch (error) {
    // Catch unexpected errors
    console.error('Unexpected error in POST /api/app/assessments/[moduleId]/submit:', error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
