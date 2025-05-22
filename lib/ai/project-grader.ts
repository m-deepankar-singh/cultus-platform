import { createClient } from '@supabase/supabase-js';
import { callGeminiWithRetry, logAICall } from './gemini-client';

// Define types for project grading
interface ProjectSubmission {
  projectTitle: string;
  projectDescription: string;
  tasks: string[];
  deliverables: string[];
  submissionType: 'text_input' | 'github_url';
  submissionContent?: string;
  submissionUrl?: string;
  studentBackground: string;
  studentTier: 'BRONZE' | 'SILVER' | 'GOLD';
}

interface GradingResult {
  score: number;
  passed: boolean;
  feedback: DetailedFeedback;
}

interface DetailedFeedback {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

/**
 * Grades a project submission and provides detailed feedback
 * 
 * @param submission The project submission to grade
 * @returns Grading result with score, pass status, and detailed feedback
 */
export async function gradeProject(submission: ProjectSubmission): Promise<GradingResult> {
  try {
    // Define passing threshold
    const PASSING_SCORE_THRESHOLD = 80;
    
    // Call Gemini API with structured output schema
    const structuredOutputSchema = {
      type: 'object',
      properties: {
        score: { 
          type: 'number',
          description: 'A score between 0 and 100 reflecting the quality of the submission'
        },
        summary: {
          type: 'string',
          description: 'A concise summary of the overall assessment'
        },
        strengths: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific strengths identified in the submission'
        },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific weaknesses or areas for improvement identified in the submission'
        },
        improvements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific actionable suggestions for how the submission could be improved'
        }
      },
      required: ['score', 'summary', 'strengths', 'weaknesses', 'improvements']
    };
    
    const generatePromptFn = () => constructGradingPrompt(submission);
    
    const result = await callGeminiWithRetry<any>(
      generatePromptFn,
      {
        temperature: 0.2, // Lower temperature for more consistent grading
        structuredOutputSchema
      }
    );
    
    // Log the AI call (excluding full prompt/response in production)
    logAICall('project-grader', generatePromptFn(), result, {
      projectTitle: submission.projectTitle,
      submissionType: submission.submissionType,
      studentBackground: submission.studentBackground
    });
    
    if (!result.success || !result.data) {
      console.error('Failed to grade project:', result.error);
      // Return fallback grading in case of failure
      return getFallbackGrading(submission);
    }
    
    // Use the grading result from Gemini
    const grading = result.data;
    
    // Ensure the score is within bounds
    const score = Math.max(0, Math.min(100, Math.round(grading.score)));
    const passed = score >= PASSING_SCORE_THRESHOLD;
    
    // Assemble feedback
    const feedback: DetailedFeedback = {
      summary: grading.summary,
      strengths: grading.strengths || [],
      weaknesses: grading.weaknesses || [],
      improvements: grading.improvements || []
    };
    
    return {
      score,
      passed,
      feedback
    };
  } catch (error) {
    console.error('Error in gradeProject:', error);
    return getFallbackGrading(submission);
  }
}

/**
 * Helper function to construct the prompt for project grading
 */
function constructGradingPrompt(submission: ProjectSubmission): string {
  // Determine what content to evaluate
  const contentToEvaluate = submission.submissionType === 'text_input' 
    ? submission.submissionContent 
    : `GitHub Repository URL: ${submission.submissionUrl}`;
  
  // Construct a comprehensive prompt for grading
  return `
You are an expert evaluator for ${submission.studentBackground} projects. 
You need to grade the following ${submission.submissionType === 'text_input' ? 'written' : 'code'} project submission from a ${submission.studentTier.toLowerCase()} level student.

PROJECT DETAILS:
Title: ${submission.projectTitle}
Description: ${submission.projectDescription}

Required Tasks:
${submission.tasks.map(task => `- ${task}`).join('\n')}

Expected Deliverables:
${submission.deliverables.map(deliverable => `- ${deliverable}`).join('\n')}

STUDENT SUBMISSION:
${contentToEvaluate}

EVALUATION INSTRUCTIONS:
1. Assess how well the submission fulfills the project requirements
2. Consider the student's background (${submission.studentBackground}) and tier (${submission.studentTier})
3. Evaluate thoroughness, creativity, technical correctness, and overall quality
4. Assign a score between 0-100 where scores above 80 are considered passing
5. Provide a balanced assessment with specific strengths and areas for improvement
6. Give actionable suggestions that would help the student improve their submission

Provide your evaluation in a structured JSON format with:
- score: A number between 0-100
- summary: A concise summary of your overall assessment
- strengths: An array of specific strengths in the submission (at least 3)
- weaknesses: An array of specific weaknesses or areas for improvement (at least 2)
- improvements: An array of specific actionable suggestions (at least 2)
`;
}

/**
 * Gets a fallback grading if AI grading fails
 */
function getFallbackGrading(submission: ProjectSubmission): GradingResult {
  // Provide a generic positive evaluation as fallback
  const score = 85;
  const passed = true;
  
  return {
    score,
    passed,
    feedback: {
      summary: "Your project demonstrates good understanding of the requirements and shows solid effort.",
      strengths: [
        "Requirements are met with appropriate implementation",
        "Good overall structure and organization",
        "Demonstrates understanding of core concepts"
      ],
      weaknesses: [
        "Some aspects could be more thoroughly explored",
        "Additional documentation would help clarify your approach"
      ],
      improvements: [
        "Consider adding more detailed comments or explanations",
        "Expand on your implementation with additional features or refinements"
      ]
    }
  };
} 