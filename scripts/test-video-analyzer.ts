#!/usr/bin/env ts-node
/**
 * Video Analyzer Test Script
 * 
 * This script helps test the video analyzer functionality without going through the API.
 * It can be used to:
 * 1. Check if a specific submission exists
 * 2. Manually trigger analysis for a submission
 * 3. Print analysis results
 * 
 * Usage:
 *   npx ts-node scripts/test-video-analyzer.ts <submissionId>
 * 
 * Example:
 *   npx ts-node scripts/test-video-analyzer.ts 123e4567-e89b-12d3-a456-426614174000
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { analyzeInterviewVideo } from '../lib/ai/video-analyzer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const submissionId = process.argv[2];
  
  if (!submissionId) {
    console.error('Please provide a submission ID as an argument');
    console.log('Usage: npx ts-node scripts/test-video-analyzer.ts <submissionId>');
    process.exit(1);
  }

  console.log(`🔍 Checking submission with ID: ${submissionId}`);
  
  // Check if the submission exists
  const { data: submission, error } = await supabase
    .from('job_readiness_ai_interview_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error || !submission) {
    console.error(`❌ Submission not found or error: ${error?.message || 'Not found'}`);
    process.exit(1);
  }

  console.log('✅ Submission found:');
  console.log('---------------------');
  console.log(`Status: ${submission.status}`);
  console.log(`Student ID: ${submission.student_id}`);
  console.log(`Video Path: ${submission.video_storage_path}`);
  console.log(`Created At: ${submission.created_at}`);
  
  if (submission.status === 'completed') {
    console.log('\n📊 Analysis Results:');
    console.log('---------------------');
    console.log(JSON.stringify(submission.analysis_result, null, 2));
    console.log(`\nAnalyzed At: ${submission.analyzed_at}`);
  }

  // Ask if user wants to trigger analysis
  if (submission.status !== 'completed') {
    console.log('\n🤖 Analysis not completed. Do you want to trigger analysis now? (y/n)');
    
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();
      
      if (answer === 'y' || answer === 'yes') {
        console.log('\n🔄 Triggering video analysis...');
        
        try {
          // We need to monkey-patch the createClient function since our analyzer uses server.ts
          // which we can't easily use in a script
          const originalModule = require('../lib/ai/video-analyzer');
          const originalCreateClient = originalModule.createClient;
          
          // @ts-ignore - Override the imported function
          originalModule.createClient = async function() {
            return supabase;
          };
          
          await analyzeInterviewVideo(submissionId);
          console.log('✅ Analysis triggered. Check the submission status in a few moments.');
        } catch (error) {
          console.error('❌ Error triggering analysis:', error);
        }
      } else {
        console.log('Operation cancelled.');
      }
      
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 