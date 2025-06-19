import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth/api-auth';

/**
 * POST /api/app/job-readiness/promotion-exam/submit
 * Submit answers for a promotion exam
 * Evaluates the answers and updates the student's tier if passed
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
    const { 
      exam_session_id,
      product_id,
      star_level,
      current_tier,
      target_tier,
      questions, // Questions that were shown to the student
      answers // Array of {question_id, selected_option}
    } = body;
    
    if (!exam_session_id || !product_id || !questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
      return NextResponse.json({ 
        error: 'Exam session ID, product ID, questions, and answers array are required' 
      }, { status: 400 });
    }

    // Check if this exam session has already been submitted
    const { data: existingAttempt, error: checkError } = await supabase
      .from('job_readiness_promotion_exam_attempts')
      .select('id, status')
      .eq('student_id', user.id)
      .eq('exam_session_id', exam_session_id)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking existing exam attempt:', checkError);
      return NextResponse.json({ error: 'Failed to verify exam submission' }, { status: 500 });
    }
    
    if (existingAttempt) {
      return NextResponse.json({ 
        error: 'This exam has already been submitted',
        status: existingAttempt.status
      }, { status: 400 });
    }
    
    // Get the promotion exam configuration
    const { data: examConfigs, error: configError } = await supabase
      .from('job_readiness_promotion_exam_config')
      .select('*')
      .eq('product_id', product_id);
      
    if (configError) {
      console.error('Error fetching exam config:', configError);
      return NextResponse.json({ error: 'Failed to fetch exam configuration' }, { status: 500 });
    }

    if (!examConfigs || examConfigs.length === 0) {
      return NextResponse.json({ error: 'Exam configuration not found' }, { status: 500 });
    }

    const examConfig = examConfigs[0];
    
    // In a real implementation, this would evaluate the answers against correct answers
    // For this placeholder, we'll simulate scoring and pass/fail calculation
    
    // For placeholder purposes, just count answers
    const totalQuestions = questions.length;
    
    // For placeholder, assume success ratio (for a real implementation, evaluate the actual answers)
    // Using a simulated random score between 60% and 95%
    const percentCorrect = Math.floor(Math.random() * 36) + 60;
    const numCorrect = Math.floor((totalQuestions * percentCorrect) / 100);
    
    // Determine if passed based on pass threshold
    const passThreshold = examConfig.pass_threshold || 70;
    const passed = percentCorrect >= passThreshold;
    
    // Create new exam attempt record with results
    const examAttemptData = {
      student_id: user.id,
      product_id,
      star_level,
      current_tier,
      target_tier,
      exam_session_id,
      timestamp_start: new Date().toISOString(),
      timestamp_end: new Date().toISOString(),
      questions_submitted: questions,
      answers_submitted: answers,
      score: percentCorrect,
      correct_answers: numCorrect,
      total_questions: totalQuestions,
      passed: passed,
      status: 'COMPLETED'
    };
    
    const { error: insertError } = await supabase
      .from('job_readiness_promotion_exam_attempts')
      .insert(examAttemptData)
      .select()
      .single();
      
          if (insertError) {
        console.error('Error creating exam attempt:', insertError);
        return NextResponse.json({ error: 'Failed to save exam results' }, { status: 500 });
      }
      
      // If the student passed, update their tier
      if (passed) {
        const { error: studentUpdateError } = await supabase
          .from('students')
          .update({
            job_readiness_tier: target_tier,
            job_readiness_last_updated: new Date().toISOString()
          })
          .eq('id', user.id);
        
      if (studentUpdateError) {
        console.error('Error updating student tier:', studentUpdateError);
        // Continue execution, this is not a blocking error
      }
    }
    
    // Get updated student data after tier change
    const { data: updatedStudent } = await supabase
      .from('students')
      .select(`
        id,
        job_readiness_star_level,
        job_readiness_tier
      `)
      .eq('id', user.id)
      .single();
    
    // Prepare feedback messages
    let feedbackMessages = [];
    
    if (passed) {
      feedbackMessages = [
        `Congratulations! You've passed the promotion exam with a score of ${percentCorrect}%.`,
        `You've been promoted to ${target_tier} tier.`,
        "Your future modules will now reflect this higher difficulty level."
      ];
    } else {
      feedbackMessages = [
        `You scored ${percentCorrect}%, which is below the required threshold of ${passThreshold}%.`,
        "Don't worry, you can continue your Job Readiness journey at your current tier.",
        "Focus on completing the remaining modules to earn more stars."
      ];
    }

    // Return the exam results
    return NextResponse.json({
      message: passed ? "Promotion exam passed successfully!" : "Promotion exam not passed",
      exam_results: {
        score: percentCorrect,
        correct_answers: numCorrect,
        total_questions: totalQuestions,
        pass_threshold: passThreshold,
        passed: passed
      },
      feedback: feedbackMessages,
      tier_updated: passed,
      previous_tier: current_tier,
      current_tier: updatedStudent?.job_readiness_tier || current_tier,
      current_star_level: updatedStudent?.job_readiness_star_level || star_level
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness promotion-exam submit POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 