// Test script to trigger structured analysis
import { analyzeInterview } from './app/api/app/job-readiness/interviews/analyze/analyze-function.ts';

async function testAnalysis() {
  try {
    console.log('🚀 Starting structured analysis test...');
    
    const submissionId = '8320d2e9-dabc-457e-a68d-573142a2dd22';
    const userId = 'your-user-id'; // Replace with actual user ID
    
    const result = await analyzeInterview(submissionId, userId);
    
    console.log('✅ Analysis completed successfully!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

testAnalysis(); 