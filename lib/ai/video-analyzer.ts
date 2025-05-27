import { createClient } from '@/lib/supabase/server';
import { callGeminiWithRetry, GeminiResponse } from './gemini-client';
import { z } from 'zod';

// Schema for the AI analysis response
const videoAnalysisResponseSchema = z.object({
  overall_feedback: z.string(),
  status: z.enum(['Approved', 'Rejected']),
  reasoning: z.string()
});

type VideoAnalysisResponse = z.infer<typeof videoAnalysisResponseSchema>;

/**
 * Analyzes an interview video recording
 * @param submissionId The ID of the interview submission to analyze
 */
export async function analyzeInterviewVideo(submissionId: string): Promise<void> {
  const supabase = await createClient();
  
  try {
    // Step 1: Fetch submission and context
    const { data: submission, error: submissionError } = await supabase
      .from('job_readiness_ai_interview_submissions')
      .select(`
        id,
        student_id,
        video_storage_path,
        interview_questions_id,
        tier_when_submitted,
        background_when_submitted
      `)
      .eq('id', submissionId)
      .single();
    
    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError);
      await updateSubmissionStatus(submissionId, 'analysis_failed');
      return;
    }

    // Generate a signed URL for the video
    const { data, error: urlError } = await supabase
      .storage
      .from('interview_recordings')
      .createSignedUrl(submission.video_storage_path, 3600); // 1 hour expiry
    
    if (urlError || !data) {
      console.error('Error generating signed URL:', urlError);
      await updateSubmissionStatus(submissionId, 'analysis_failed');
      return;
    }

    const signedUrl = data.signedUrl;

    // Fetch the interview questions
    const { data: questions, error: questionsError } = await supabase
      .from('job_readiness_active_interview_sessions')
      .select('questions')
      .eq('id', submission.interview_questions_id)
      .single();
    
    if (questionsError || !questions) {
      console.error('Error fetching questions:', questionsError);
      await updateSubmissionStatus(submissionId, 'analysis_failed');
      return;
    }

    // Fetch grading criteria based on background and tier
    const { data: gradingCriteria, error: criteriaError } = await supabase
      .from('job_readiness_background_interview_types')
      .select('grading_criteria')
      .eq('background_type', submission.background_when_submitted)
      .eq('tier', submission.tier_when_submitted)
      .single();
    
    if (criteriaError || !gradingCriteria) {
      console.error('Error fetching grading criteria:', criteriaError);
      await updateSubmissionStatus(submissionId, 'analysis_failed');
      return;
    }

    // Step 2: Call Gemini API for video analysis
    console.log(`Starting AI analysis for submission ${submissionId}`);
    const prompt = constructVideoAnalysisPrompt(
      signedUrl,
      questions.questions,
      gradingCriteria.grading_criteria
    );

    const response = await callGeminiWithRetry<VideoAnalysisResponse>(
      () => prompt,
      {
        temperature: 0.2,
        structuredOutputSchema: videoAnalysisResponseSchema.shape
      },
      3
    );

    // Step 3: Process AI response
    if (!response.success || !response.data) {
      console.error(`Analysis failed for submission ${submissionId}: ${response.error}`);
      await updateSubmissionStatus(submissionId, 'analysis_failed');
      await updateSubmissionWithFallbackAnalysis(submissionId);
      return;
    }

    const analysisResult = response.data;
    
    // Step 4: Update submission record with analysis results
    await supabase
      .from('job_readiness_ai_interview_submissions')
      .update({
        analysis_result: {
          overall_feedback: analysisResult.overall_feedback,
          status: analysisResult.status,
          reasoning: analysisResult.reasoning
        },
        status: 'completed',
        analyzed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    console.log(`Analysis completed for submission ${submissionId} with status: ${analysisResult.status}`);

    // Handle tier promotion if approved
    if (analysisResult.status === 'Approved') {
      await handleApprovedInterview(submission.student_id);
    }

  } catch (error) {
    console.error(`Error in video analysis for submission ${submissionId}:`, error);
    await updateSubmissionStatus(submissionId, 'analysis_failed');
    
    // Return fallback analysis if needed
    await updateSubmissionWithFallbackAnalysis(submissionId);
  }
}

/**
 * Updates the status of a submission
 */
async function updateSubmissionStatus(submissionId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from('job_readiness_ai_interview_submissions')
    .update({ status })
    .eq('id', submissionId);
}

/**
 * Constructs the prompt for video analysis
 */
function constructVideoAnalysisPrompt(
  videoUrl: string,
  questions: any[],
  gradingCriteria: any
): string {
  return `
You are an expert interview evaluator tasked with analyzing a video interview recording.

VIDEO URL: ${videoUrl}

INTERVIEW QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q.question_text}`).join('\n')}

GRADING CRITERIA:
${JSON.stringify(gradingCriteria, null, 2)}

INSTRUCTIONS:
1. Watch the video interview recording.
2. Evaluate how well the candidate answered each question.
3. Assess the candidate's communication skills, clarity, and content quality.
4. Determine if the interview meets the standard for approval based on the grading criteria.
5. Provide detailed, constructive feedback.

Please provide your analysis in the following structured format:
- overall_feedback: Comprehensive feedback on the interview performance
- status: Either "Approved" or "Rejected" based on your evaluation
- reasoning: Detailed explanation for your approval or rejection decision
`;
}

/**
 * Updates a submission with fallback analysis when AI analysis fails
 */
async function updateSubmissionWithFallbackAnalysis(submissionId: string): Promise<void> {
  const supabase = await createClient();
  const fallbackAnalysis = {
    overall_feedback: "We were unable to automatically analyze your interview at this time. A human reviewer will check your submission and provide feedback soon.",
    status: "Pending Manual Review",
    reasoning: "Automated analysis was not possible due to technical issues. This does not reflect on your interview performance."
  };

  await supabase
    .from('job_readiness_ai_interview_submissions')
    .update({
      analysis_result: fallbackAnalysis,
      status: 'pending_manual_review'
    })
    .eq('id', submissionId);
}

/**
 * Handles approved interviews, potentially promoting the student's tier
 */
async function handleApprovedInterview(studentId: string): Promise<void> {
  const supabase = await createClient();
  
  // Get current student tier
  const { data: student, error } = await supabase
    .from('students')
    .select('job_readiness_tier')
    .eq('id', studentId)
    .single();
  
  if (error || !student) {
    console.error('Error fetching student tier:', error);
    return;
  }
  
  // Logic for tier promotion could be implemented here
  // For example, from THREE to FOUR upon successful interview
  if (student.job_readiness_tier === 'THREE') {
    await supabase
      .from('students')
      .update({ job_readiness_tier: 'FOUR' })
      .eq('id', studentId);
    
    console.log(`Student ${studentId} promoted from tier THREE to FOUR`);
  }
} 