/**
 * Test script for Resend email service
 * Run with: npx tsx scripts/test-resend-email.ts
 */

import dotenv from 'dotenv';

// Load environment variables FIRST, before importing email service
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Import email service AFTER environment is loaded
import { sendEmail, sendLearnerWelcomeEmail } from '../lib/email/resend-service';

async function testBasicEmail() {
  console.log('\n=== Testing Basic Email ===');
  
  const testEmail = process.env.TEST_EMAIL || 'your-email@example.com';
  
  try {
    const response = await sendEmail({
      to: testEmail,
      subject: 'Resend Test Email',
      text: 'This is a test email from the new Resend service implementation.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a6cf7;">🚀 Resend Test Successful!</h2>
          <p>This is a test email from the new Resend service implementation.</p>
          <p>If you're reading this, the migration to Resend is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br>
            Service: Resend API<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        </div>
      `
    });
    
    console.log('✅ Basic email sent successfully!');
    console.log('Message ID:', response.data?.id);
    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Basic email failed:', error);
    throw error;
  }
}

async function testWelcomeEmail() {
  console.log('\n=== Testing Welcome Email ===');
  
  const testEmail = process.env.TEST_EMAIL || 'your-email@example.com';
  const testPassword = 'TempPass123!';
  
  try {
    const response = await sendLearnerWelcomeEmail(
      testEmail,
      testPassword,
      'http://localhost:3000/app/login'
    );
    
    console.log('✅ Welcome email sent successfully!');
    console.log('Message ID:', response.data?.id);
    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    throw error;
  }
}

async function validateEnvironment() {
  console.log('\n=== Environment Validation ===');
  
  const requiredVars = ['RESEND_API_KEY', 'EMAIL_FROM', 'TEST_EMAIL'];
  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      console.log(`✅ ${varName}: ${varName === 'RESEND_API_KEY' ? '(set)' : process.env[varName]}`);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    console.log('\n📝 Setup Instructions:');
    console.log('1. Copy .env.local.template to .env.local');
    console.log('2. Get your Resend API key from https://resend.com/api-keys');
    console.log('3. Set the following variables in .env.local:');
    console.log('   RESEND_API_KEY=re_your_api_key_here');
    console.log('   EMAIL_FROM=support@cultusedu.com');
    console.log('   TEST_EMAIL=your-email@example.com');
    throw new Error('Environment setup incomplete');
  }
  
  // Validate API key format
  if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_')) {
    console.error('❌ Invalid RESEND_API_KEY format (should start with "re_")');
    throw new Error('Invalid API key format');
  }
  
  // Show API key details for debugging
  const apiKey = process.env.RESEND_API_KEY || '';
  console.log(`🔍 API Key Debug: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (length: ${apiKey.length})`);
  
  console.log('✅ Environment validation passed');
}

async function main() {
  console.log('🧪 Resend Email Service Test');
  console.log('================================');
  
  try {
    // Step 1: Validate environment
    await validateEnvironment();
    
    // Step 2: Test basic email
    await testBasicEmail();
    
    // Step 3: Test welcome email
    await testWelcomeEmail();
    
    console.log('\n🎉 All tests passed! Resend service is working correctly.');
    console.log('📧 Check your inbox for the test emails.');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();