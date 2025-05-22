import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/app/job-readiness/promotion-exam/submit
 * Submit answers for a promotion exam
 * Evaluates the answers and updates the student's tier if passed
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    // Validate request body
    const { 
      exam_id, 
      answers // Array of {question_id, selected_option}
    } = body;
    
    if (!exam_id || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ 
        error: 'Exam ID and answers array are required' 
      }, { status: 400 });
    }

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the exam attempt
    const { data: examAttempt, error: examError } = await supabase
      .from('job_readiness_promotion_exam_attempts')
      .select(`
        id,
        student_id,
        product_id,
        star_level,
        current_tier,
        target_tier,
        timestamp_start,
        questions,
        status
      `)
      .eq('id', exam_id)
      .single();
      
    if (examError || !examAttempt) {
      console.error('Error fetching exam attempt:', examError);
      return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 });
    }
    
    // Verify the exam belongs to the current user
    if (examAttempt.student_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to exam' }, { status: 403 });
    }
    
    // Check if the exam is in progress (not already submitted)
    if (examAttempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({ 
        error: 'This exam has already been submitted',
        status: examAttempt.status
      }, { status: 400 });
    }
    
    // Get the promotion exam configuration
    const { data: examConfig, error: configError } = await supabase
      .from('job_readiness_promotion_exam_config')
      .select('*')
      .eq('product_id', examAttempt.product_id)
      .single();
      
    if (configError || !examConfig) {
      console.error('Error fetching exam config:', configError);
      return NextResponse.json({ error: 'Exam configuration not found' }, { status: 500 });
    }
    
    // In a real implementation, this would evaluate the answers against correct answers
    // For this placeholder, we'll simulate scoring and pass/fail calculation
    
    // For placeholder purposes, just count answers
    const totalQuestions = examAttempt.questions.length;
    const answeredQuestions = answers.length;
    
    // For placeholder, assume success ratio (for a real implementation, evaluate the actual answers)
    // Using a simulated random score between 60% and 95%
    const percentCorrect = Math.floor(Math.random() * 36) + 60;
    const numCorrect = Math.floor((totalQuestions * percentCorrect) / 100);
    
    // Determine if passed based on pass threshold
    const passThreshold = examConfig.pass_threshold || 70;
    const passed = percentCorrect >= passThreshold;
    
    // Update the exam attempt with results
    const examUpdateData = {
      status: 'COMPLETED',
      timestamp_end: new Date().toISOString(),
      answers_submitted: answers,
      score: percentCorrect,
      correct_answers: numCorrect,
      total_questions: totalQuestions,
      passed: passed
    };
    
    const { error: updateError } = await supabase
      .from('job_readiness_promotion_exam_attempts')
      .update(examUpdateData)
      .eq('id', exam_id);
      
    if (updateError) {
      console.error('Error updating exam attempt:', updateError);
      return NextResponse.json({ error: 'Failed to update exam results' }, { status: 500 });
    }
    
    // If the student passed, update their tier
    if (passed) {
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({
          job_readiness_tier: examAttempt.target_tier,
          job_readiness_last_updated: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (studentUpdateError) {
        console.error('Error updating student tier:', studentUpdateError);
        // Continue execution, this is not a blocking error
      }
    }
    
    // Get updated student data after tier change
    const { data: updatedStudent, error: studentError } = await supabase
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
        `You've been promoted to ${examAttempt.target_tier} tier.`,
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
      previous_tier: examAttempt.current_tier,
      current_tier: updatedStudent?.job_readiness_tier || examAttempt.current_tier,
      current_star_level: updatedStudent?.job_readiness_star_level || examAttempt.star_level
    });
  } catch (error) {
    console.error('Unexpected error in job-readiness promotion-exam submit POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 