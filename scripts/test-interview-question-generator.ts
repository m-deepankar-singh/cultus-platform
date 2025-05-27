import { createClient } from '@supabase/supabase-js';
import { generateInterviewQuestions } from '../lib/ai/interview-question-generator';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// This is a simple test script to verify that the interview question generator works
async function main() {
  try {
    // Ensure environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GOOGLE_API_KEY) {
      console.error('Missing required environment variables. Please check your .env file.');
      return;
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get a test student ID
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, job_readiness_background_type, job_readiness_tier')
      .limit(1)
      .single();

    if (studentError) {
      console.error('Error fetching test student:', studentError);
      return;
    }

    console.log(`Testing with student ID: ${student.id} (Background: ${student.job_readiness_background_type}, Tier: ${student.job_readiness_tier})`);

    // Test the interview question generator
    console.log('Generating interview questions...');
    const questions = await generateInterviewQuestions(student.id);

    if (!questions) {
      console.error('Failed to generate interview questions.');
      return;
    }

    console.log(`Successfully generated ${questions.length} interview questions:`);
    questions.forEach((q, i) => {
      console.log(`\nQuestion ${i + 1} (ID: ${q.id}):`);
      console.log(q.question_text);
    });

    // Also test the fallback mechanism
    console.log('\n\nTesting fallback mechanism...');
    
    // Mock a student with a background type and tier that doesn't have a configuration
    // This should trigger the fallback mechanism
    const mockBackgroundType = 'ECONOMICS'; // Change this if needed
    const mockTier = 'BRONZE'; // Change this if needed
    
    // Add mock data to the student
    const mockStudent = {
      ...student,
      job_readiness_background_type: mockBackgroundType,
      job_readiness_tier: mockTier
    };
    
    // Temporarily modify the student record
    const { error: updateError } = await supabase
      .from('students')
      .update({
        job_readiness_background_type: mockBackgroundType,
        job_readiness_tier: mockTier
      })
      .eq('id', student.id);
    
    if (updateError) {
      console.error('Error updating test student for fallback test:', updateError);
      return;
    }
    
    try {
      console.log(`Testing fallback with background: ${mockBackgroundType}, tier: ${mockTier}`);
      const fallbackQuestions = await generateInterviewQuestions(student.id);
      
      if (!fallbackQuestions) {
        console.error('Failed to generate fallback interview questions.');
      } else {
        console.log(`Successfully generated ${fallbackQuestions.length} fallback questions:`);
        fallbackQuestions.forEach((q, i) => {
          console.log(`\nFallback Question ${i + 1} (ID: ${q.id}):`);
          console.log(q.question_text);
        });
      }
    } finally {
      // Restore the original student data
      await supabase
        .from('students')
        .update({
          job_readiness_background_type: student.job_readiness_background_type,
          job_readiness_tier: student.job_readiness_tier
        })
        .eq('id', student.id);
      
      console.log('Test complete! Restored original student data.');
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

main(); 