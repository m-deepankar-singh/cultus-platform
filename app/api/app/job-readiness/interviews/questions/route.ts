import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewQuestions, transformQuestionsForClient } from '@/lib/ai/interview-question-generator';
import { checkModuleAccess } from '@/lib/api/job-readiness/check-module-access';

export async function GET(request: NextRequest) {
  try {
    // Get user from auth server (more secure than getSession)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Login required' },
        { status: 401 }
      );
    }
    
    // Get student directly using the authenticated user ID
    // Since students.id is directly linked to auth.users.id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }
    
    // Check if the student has access to interview module
    const moduleAccess = await checkModuleAccess(student.id, 'interview');
    if (!moduleAccess.has_access) {
      return NextResponse.json(
        { error: `Module access denied: ${moduleAccess.error}` },
        { status: 403 }
      );
    }
    
    // Check for cached questions first (to ensure consistent questions during a session)
    const { data: activeSession, error: sessionError } = await supabase
      .from('job_readiness_active_interview_sessions')
      .select('questions, created_at')
      .eq('student_id', student.id)
      .maybeSingle();
    
    // If there's an active session with cached questions and it's recent (< 30 minutes old)
    const SESSION_VALID_MINUTES = 30;
    
    if (activeSession?.questions && activeSession.created_at) {
      const sessionTime = new Date(activeSession.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - sessionTime.getTime()) / (1000 * 60);
      
      if (diffMinutes < SESSION_VALID_MINUTES) {
        return NextResponse.json({
          questions: activeSession.questions,
          cached: true
        });
      }
    }
    
    // If no cached questions or cache expired, generate new questions
    const questions = await generateInterviewQuestions(student.id);
    
    if (!questions) {
      return NextResponse.json(
        { error: 'Failed to generate interview questions' },
        { status: 500 }
      );
    }
    
    // Transform questions for client (remove any sensitive data)
    const clientQuestions = transformQuestionsForClient(questions);
    
    // Store questions in active session table for caching
    const { error: insertError } = await supabase
      .from('job_readiness_active_interview_sessions')
      .upsert({
        student_id: student.id,
        questions: clientQuestions,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error caching interview questions:', insertError);
      // Continue anyway - this is just for caching
    }
    
    return NextResponse.json({
      questions: clientQuestions,
      cached: false
    });
  } catch (error) {
    console.error('Error in interview questions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 