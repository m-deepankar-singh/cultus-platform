import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// Define schemas for validation
const ModuleIdSchema = z.string().uuid({ message: 'Invalid Module ID format' });

const SubmissionSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
  time_spent_seconds: z.number().optional(),
  started_at: z.string().optional(),
});

interface AssessmentSubmissionResponse {
  success: boolean;
  score: number;
  percentage: number;
  passed: boolean;
  tier_achieved?: 'BRONZE' | 'SILVER' | 'GOLD' | null;
  tier_changed?: boolean;
  star_level_unlocked?: boolean;
  feedback: string;
  correct_answers: number;
  total_questions: number;
  submission_id: string;
}

export async function POST(
  request: NextRequest,
  context: { params: { moduleId: string } }
) {
  try {
    // 1. Validate moduleId
    const { moduleId } = await context.params;
    const moduleIdValidation = ModuleIdSchema.safeParse(moduleId);
    if (!moduleIdValidation.success) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid Module ID format', details: moduleIdValidation.error.flatten().formErrors },
        { status: 400 }
      );
    }
    const validModuleId = moduleIdValidation.data;

    // 2. Authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = SubmissionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid submission data',
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { answers, time_spent_seconds, started_at } = validation.data;

    // 4. Get student information
    const { data: studentRecord, error: studentFetchError } = await supabase
      .from('students')
      .select('client_id, is_active, job_readiness_tier, job_readiness_star_level')
      .eq('id', user.id)
      .single();

    if (studentFetchError) {
      console.error('Student Fetch Error:', studentFetchError);
      if (studentFetchError.code === 'PGRST116') {
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

    const studentId = user.id;
    const clientId = studentRecord.client_id;

    // 5. Fetch Assessment Module Details (must be Job Readiness assessment)
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('id, name, type, configuration, product_id')
      .eq('id', validModuleId)
      .eq('type', 'Assessment')
      .maybeSingle();

    if (moduleError) {
      console.error(`Error fetching assessment module ${validModuleId}:`, moduleError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment details', details: moduleError.message },
        { status: 500 }
      );
    }

    if (!moduleData) {
      return NextResponse.json(
        { error: 'Assessment module not found or not an assessment type' },
        { status: 404 }
      );
    }

    // 6. Verify this is a Job Readiness product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, type')
      .eq('id', moduleData.product_id)
      .eq('type', 'JOB_READINESS')
      .single();

    if (productError || !productData) {
      return NextResponse.json(
        { error: 'This assessment is not part of a Job Readiness product' },
        { status: 404 }
      );
    }

    // 7. Verify enrollment
    const { count, error: assignmentError } = await supabase
      .from('client_product_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('product_id', productData.id);

    if (assignmentError) {
      console.error('Error checking client enrollment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to verify enrollment', details: assignmentError.message },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Forbidden: Student not enrolled in this Job Readiness assessment' },
        { status: 403 }
      );
    }

    // 8. Check if already submitted (for retakes handling)
    const { data: existingProgress, error: progressError } = await supabase
      .from('student_module_progress')
      .select('status, progress_percentage, progress_details')
      .eq('student_id', studentId)
      .eq('module_id', validModuleId)
      .maybeSingle();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error checking existing progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to check submission status', details: progressError.message },
        { status: 500 }
      );
    }

    const config = moduleData.configuration || {};
    const retakesAllowed = config.retakesAllowed || config.retakes_allowed || true;

    if (existingProgress?.status === 'Completed' && !retakesAllowed) {
      return NextResponse.json(
        { error: 'Assessment already submitted and retakes are not allowed' },
        { status: 409 }
      );
    }

    // 9. Fetch assessment questions with correct answers
    const { data: questionData, error: questionError } = await supabase
      .from('assessment_module_questions')
      .select(`
        question_id,
        assessment_questions (
          id, 
          question_text, 
          question_type, 
          options,
          correct_answer
        )
      `)
      .eq('module_id', validModuleId);

    if (questionError) {
      console.error(`Error fetching questions for module ${validModuleId}:`, questionError);
      return NextResponse.json(
        { error: 'Failed to fetch assessment questions', details: questionError.message },
        { status: 500 }
      );
    }

    // 10. Calculate score
    let correctAnswers = 0;
    const totalQuestions = questionData.length;

    for (const questionItem of questionData) {
      const question = questionItem.assessment_questions;
      if (!question) continue;

      const questionId = questionItem.question_id;
      const userAnswer = answers[questionId];
      
      // Handle the correct answer structure based on question type
      let correctAnswerIds: string[] = [];
      if ((question as any).question_type === 'MSQ') {
        // For MSQ, correct_answer is { answers: ["opt_a", "opt_b"] }
        const correctAnswerData = (question as any).correct_answer;
        correctAnswerIds = correctAnswerData?.answers || [];
      } else {
        // For MCQ and TF, correct_answer is just a string
        const correctAnswerData = (question as any).correct_answer;
        correctAnswerIds = correctAnswerData ? [correctAnswerData] : [];
      }

      if (!userAnswer || correctAnswerIds.length === 0) continue;

      // Handle different question types
      if ((question as any).question_type === 'MCQ' || (question as any).question_type === 'TF') {
        // Single correct answer
        if (typeof userAnswer === 'string' && correctAnswerIds.includes(userAnswer)) {
          correctAnswers++;
        }
      } else if ((question as any).question_type === 'MSQ') {
        // Multiple correct answers - must match exactly
        if (Array.isArray(userAnswer)) {
          const sortedUserAnswers = [...userAnswer].sort();
          const sortedCorrectAnswers = [...correctAnswerIds].sort();
          if (JSON.stringify(sortedUserAnswers) === JSON.stringify(sortedCorrectAnswers)) {
            correctAnswers++;
          }
        }
      }
    }

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passingThreshold = config.passThreshold || config.passing_threshold || 60;
    const passed = percentage >= passingThreshold;

    // 11. Get Job Readiness tier configuration
    const { data: tierConfig, error: tierConfigError } = await supabase
      .from('job_readiness_products')
      .select('*')
      .eq('product_id', productData.id)
      .maybeSingle();

    const defaultTierConfig = {
      bronze_assessment_min_score: 0,
      bronze_assessment_max_score: 60,
      silver_assessment_min_score: 61,
      silver_assessment_max_score: 80,
      gold_assessment_min_score: 81,
      gold_assessment_max_score: 100
    };

    const finalTierConfig = tierConfig || defaultTierConfig;

    // 12. Save submission to student_module_progress (without tier assignment for individual assessment)
    const progressDetails = {
      answers,
      score: percentage,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      time_spent_seconds,
      started_at,
      submitted_at: new Date().toISOString(),
    };

    const { data: submissionRecord, error: submissionError } = await supabase
      .from('student_module_progress')
      .upsert({
        student_id: studentId,
        module_id: validModuleId,
        status: 'Completed',
        progress_percentage: percentage,
        progress_details: progressDetails,
        completed_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
      .select('student_id, module_id')
      .single();

    if (submissionError) {
      console.error('Error saving submission:', submissionError);
      return NextResponse.json(
        { error: 'Failed to save submission', details: submissionError.message },
        { status: 500 }
      );
    }

    // 13. Check if ALL assessment modules are completed before assigning any tier
    let tierChanged = false;
    let starLevelUnlocked = false;
    let tierAchieved: 'BRONZE' | 'SILVER' | 'GOLD' | null = null;
    let allAssessmentsCompleted = false;
    
    const currentTier = studentRecord.job_readiness_tier;
    const currentStarLevel = studentRecord.job_readiness_star_level;

    console.log(`Tier assignment check - Student: ${studentId}, Current Star: ${currentStarLevel}, Current Tier: ${currentTier}`);

    // Get ALL assessment modules for this product
    const { data: allAssessmentModules, error: allModulesError } = await supabase
      .from('modules')
      .select('id')
      .eq('product_id', productData.id)
      .eq('type', 'Assessment');

    if (allModulesError) {
      console.error('Error fetching all assessment modules:', allModulesError);
      // Continue without tier evaluation
    } else if (allAssessmentModules && allAssessmentModules.length > 0) {
      console.log(`Found ${allAssessmentModules.length} assessment modules for product ${productData.id}`);
      
      // Get completed assessment modules for this student
      const { data: completedModules, error: completedError } = await supabase
        .from('student_module_progress')
        .select('module_id, progress_details')
        .eq('student_id', studentId)
        .eq('status', 'Completed')
        .in('module_id', allAssessmentModules.map(m => m.id));

      if (completedError) {
        console.error('Error fetching completed modules:', completedError);
      } else {
        console.log(`Found ${completedModules?.length || 0} completed modules`);
        
        // Check if ALL assessment modules are now completed (including the current one)
        const completedModuleIds = completedModules?.map(m => m.module_id) || [];
        const allModuleIds = allAssessmentModules.map(m => m.id);
        allAssessmentsCompleted = allModuleIds.every(id => completedModuleIds.includes(id));

        console.log(`All modules: [${allModuleIds.join(', ')}]`);
        console.log(`Completed modules: [${completedModuleIds.join(', ')}]`);
        console.log(`All completed: ${allAssessmentsCompleted}`);

        if (allAssessmentsCompleted) {
          console.log('All assessments completed! Calculating overall performance and assigning tier...');
          
          // Calculate overall performance across all assessment modules
          let totalScore = 0;
          let totalModules = 0;

          for (const completedModule of completedModules) {
            const progressDetails = completedModule.progress_details as any;
            if (progressDetails?.score) {
              totalScore += progressDetails.score;
              totalModules++;
              console.log(`Module ${completedModule.module_id}: ${progressDetails.score}%`);
            }
          }

          // Calculate average score across all assessments
          const averageScore = totalModules > 0 ? Math.round(totalScore / totalModules) : 0;
          console.log(`Average score across ${totalModules} modules: ${averageScore}%`);

          // Determine tier based on overall performance
          if (averageScore >= finalTierConfig.gold_assessment_min_score) {
            tierAchieved = 'GOLD';
          } else if (averageScore >= finalTierConfig.silver_assessment_min_score) {
            tierAchieved = 'SILVER';
          } else if (averageScore >= finalTierConfig.bronze_assessment_min_score) {
            tierAchieved = 'BRONZE';
          }

          console.log(`Overall tier achieved: ${tierAchieved}`);

          // Check if this is the first star or a tier upgrade
          if (!currentStarLevel || currentStarLevel === null) {
            // First star unlock
            starLevelUnlocked = true;
            tierChanged = true;
            
            console.log(`Updating student ${studentId} with tier: ${tierAchieved}, star: ONE`);
            
            const { error: updateStudentError } = await supabase
              .from('students')
              .update({
                job_readiness_tier: tierAchieved,
                job_readiness_star_level: 'ONE',
                job_readiness_last_updated: new Date().toISOString(),
              })
              .eq('id', studentId);

            if (updateStudentError) {
              console.error('Error updating student tier and star level:', updateStudentError);
              // Continue - don't fail the submission
              starLevelUnlocked = false;
              tierChanged = false;
              tierAchieved = null;
            } else {
              console.log('Successfully updated student tier and star level!');
            }
          } else {
            // Student already has a star, check if tier should be updated
            const tierHierarchy = { 'BRONZE': 1, 'SILVER': 2, 'GOLD': 3 };
            const currentTierLevel = tierHierarchy[currentTier as keyof typeof tierHierarchy] || 0;
            const achievedTierLevel = tierAchieved ? tierHierarchy[tierAchieved] : 0;

            if (achievedTierLevel > currentTierLevel) {
              tierChanged = true;
              
              console.log(`Upgrading student ${studentId} tier from ${currentTier} to ${tierAchieved}`);
              
              const { error: updateTierError } = await supabase
                .from('students')
                .update({
                  job_readiness_tier: tierAchieved,
                  job_readiness_last_updated: new Date().toISOString(),
                })
                .eq('id', studentId);

              if (updateTierError) {
                console.error('Error updating student tier:', updateTierError);
                tierChanged = false;
                tierAchieved = currentTier; // Keep current tier if update failed
              }
            } else {
              // No tier change needed, return current tier
              tierAchieved = currentTier;
            }
          }
        } else {
          console.log('Not all assessments completed yet. Missing modules:', 
            allModuleIds.filter(id => !completedModuleIds.includes(id)));
        }
      }
    } else {
      console.log('No assessment modules found for this product');
    }

    // 14. Generate feedback based on new tier assignment logic
    let feedback = `Assessment completed with ${percentage}% (${correctAnswers}/${totalQuestions} correct). `;
    
    if (passed) {
      feedback += `Congratulations! You passed the assessment. `;
      
      if (allAssessmentsCompleted) {
        // All assessments completed - tier has been assigned
        if (starLevelUnlocked) {
          feedback += `🌟 Excellent! You've completed ALL assessment modules and unlocked Star Level ONE! Your overall tier is ${tierAchieved}! `;
        } else if (tierChanged) {
          feedback += `Your Job Readiness tier has been upgraded to ${tierAchieved}! `;
        } else {
          feedback += `Your Job Readiness tier remains ${tierAchieved}. `;
        }
      } else {
        // Not all assessments completed yet - no tier assigned
        const { data: allModules } = await supabase
          .from('modules')
          .select('id')
          .eq('product_id', productData.id)
          .eq('type', 'Assessment');
        
        const { data: completed } = await supabase
          .from('student_module_progress')
          .select('module_id', { count: 'exact' })
          .eq('student_id', studentId)
          .eq('status', 'Completed')
          .in('module_id', (allModules || []).map(m => m.id));
        
        const totalAssessments = allModules?.length || 0;
        const completedAssessments = completed?.length || 0;
        
        feedback += `Complete all ${totalAssessments} assessment modules (${completedAssessments}/${totalAssessments} done) to unlock your first star and determine your Job Readiness tier. `;
      }
    } else {
      feedback += `You need ${passingThreshold}% to pass. `;
      if (retakesAllowed) {
        feedback += `You can retake this assessment to improve your score. `;
      }
      if (!allAssessmentsCompleted) {
        feedback += `Remember: complete all assessment modules to determine your overall Job Readiness tier. `;
      }
    }

    // 15. Return response - only include tier_achieved if all assessments are completed
    const response: AssessmentSubmissionResponse = {
      success: true,
      score: correctAnswers,
      percentage,
      passed,
      tier_achieved: allAssessmentsCompleted ? tierAchieved : null,
      tier_changed: tierChanged,
      star_level_unlocked: starLevelUnlocked,
      feedback,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
      submission_id: submissionRecord.student_id + '-' + submissionRecord.module_id,
    };

    return NextResponse.json(response);

  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in /api/app/job-readiness/assessments/[moduleId]/submit:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
} 