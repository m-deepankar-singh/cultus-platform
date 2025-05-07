// Test script for testing with a real SMTP server
import { config } from 'dotenv';
import { resolve } from 'path';
import nodemailer from 'nodemailer';

// Load environment variables from both .env and .env.local (if they exist)
// .env.local will override .env if both exist
config();
config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Create a direct transporter instead of using the service module
// This helps us debug issues more easily
async function testRealEmailSending() {
  try {
    console.log('Testing with real SMTP server...');
    console.log('Environment variables:');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST);
    console.log('- SMTP_PORT:', process.env.SMTP_PORT);
    console.log('- SMTP_USER:', process.env.SMTP_USER);
    console.log('- SMTP_SECURE:', process.env.SMTP_SECURE);
    console.log('- EMAIL_FROM:', process.env.EMAIL_FROM);
    
    // If environment variables aren't set, use hardcoded values for testing
    const smtpHost = process.env.SMTP_HOST || 'mail.cultusedu.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER || 'support@cultusedu.com';
    const smtpPass = process.env.SMTP_PASS || 'your_password_here'; // Replace with actual password if needed
    const emailFrom = process.env.EMAIL_FROM || 'support@cultusedu.com';
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    
    console.log('\nAttempting connection to SMTP server with these settings:');
    console.log('- Host:', smtpHost);
    console.log('- Port:', smtpPort);
    console.log('- Secure:', smtpSecure);
    console.log('- Username:', smtpUser);
    
    // Create a more simplified transporter for testing
    // Sometimes type coercion and extra options can cause issues
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // Disable TLS verification for testing - ONLY use for debugging
        rejectUnauthorized: false,
        // Force IPv4 to avoid IPv6 issues
        family: 4
      },
      // Enable debug mode
      debug: true
    } as nodemailer.TransportOptions);
    
    // Verify the connection before sending
    console.log('\nVerifying SMTP connection...');
    const isVerified = await transporter.verify();
    console.log('SMTP connection verified successfully:', isVerified);
    
    // Send a test email - make sure the email address is correct
    const testEmail = 'deepankar@orbitfutureacademy.sch.id'; // Double check this is correct
    
    console.log('\nSending test email to:', testEmail);
    
    const subject = 'Test Email - Please Confirm Receipt';
    const now = new Date().toISOString();
    const temporaryPassword = 'TestPassword123!';
    
    // Create a very simple email for testing
    const text = `This is a test email sent at ${now}.\n\nEmail: ${testEmail}\nTemporary Password: ${temporaryPassword}\n\nPlease confirm you received this email.`;
    const html = `<p>This is a test email sent at ${now}.</p><p><strong>Email:</strong> ${testEmail}<br><strong>Password:</strong> ${temporaryPassword}</p><p>Please confirm you received this email.</p>`;
    
    // Send the test email
    console.log('\nSending test email...');
    const info = await transporter.sendMail({
      from: `"Cultus Platform Test" <${emailFrom}>`,
      to: testEmail,
      subject,
      text,
      html,
      // Add some headers to reduce spam likelihood
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MSMail-Priority': 'High',
      }
    });
    
    console.log('\nEmail accepted by SMTP server!');
    console.log('- Message ID:', info.messageId);
    console.log('- Response:', info.response);
    console.log('- Envelope:', JSON.stringify(info.envelope));
    console.log('\nIMPORTANT: Please check both your inbox AND spam/junk folder');
    console.log('Sometimes emails are delivered but marked as spam');
    
  } catch (error: unknown) {
    console.error('\nTest failed:', error);
    // Print more detailed error information
    if (error && typeof error === 'object' && 'code' in error) {
      const errorObj = error as { code?: string };
      if (errorObj.code === 'ESOCKET') {
        console.error('\nConnection Error Details:');
        console.error('- Cannot connect to the SMTP server. Please check:');
        console.error('  1. Your network connection');
        console.error('  2. SMTP server hostname and port are correct');
        console.error('  3. Any firewalls or proxies that might block the connection');
      } else if (errorObj.code === 'EAUTH') {
        console.error('\nAuthentication Error Details:');
        console.error('- Failed to authenticate with the SMTP server. Please check:');
        console.error('  1. Username and password are correct');
        console.error('  2. The account has permission to send emails');
      }
    }
  }
}

// Run the test
testRealEmailSending();

// ALTERNATIVE TESTING APPROACH:
// If the above doesn't work, try testing with Ethereal instead
// This helps determine if the issue is with the SMTP server or the code
async function testWithEthereal() {
  try {
    console.log('\n==== ALTERNATIVE TEST WITH ETHEREAL ====');
    console.log('Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Test account created:');
    console.log('- Email:', testAccount.user);
    
    // Create a transporter with Ethereal
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      }
    });
    
    // Send a simple test email
    const info = await transporter.sendMail({
      from: '"Test" <test@example.com>',
      to: "recipient@example.com",
      subject: "Test Email",
      text: "This is a test email from Ethereal",
      html: "<p>This is a test email from Ethereal</p>",
    });
    
    console.log('Ethereal email sent!');
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('If this works but the real SMTP server doesn\'t, the issue is likely with the SMTP server configuration');
  } catch (error) {
    console.error('Ethereal test failed:', error);
  }
}

// Uncomment the line below to also test with Ethereal after the main test
testWithEthereal(); 