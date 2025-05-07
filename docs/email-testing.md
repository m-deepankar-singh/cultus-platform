# Email Service Testing Guide

This document outlines how to test the email functionality implemented in the Cultus Platform.

## Test Environments

You can test the email service in three ways:

1. **Development with test email service (Ethereal)** - Catch emails without sending them to real recipients
2. **Development with real SMTP server** - Send actual emails using your SMTP configuration
3. **Production** - Use the production environment with real emails

## 1. Testing with Ethereal (Recommended for Development)

Ethereal is a fake SMTP service that catches emails instead of delivering them. This is perfect for development and testing.

### Test Script

A test script (`test-email.ts`) is provided to quickly test the email functionality with Ethereal:

```typescript
// test-email.ts
import nodemailer from 'nodemailer';

async function testEmailSending() {
  try {
    // Create a test account on Ethereal
    console.log('Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    
    // Log the test account credentials
    console.log('Test account created:');
    console.log('- Email:', testAccount.user);
    console.log('- Password:', testAccount.pass);
    
    // Create a test transporter
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Test email content
    const subject = 'Welcome to Cultus Platform!';
    const learnerEmail = 'test.learner@example.com';
    const temporaryPassword = 'TestPassword123!';
    const loginUrl = 'http://localhost:3000/app/login';
    
    // Create email content (simplified for example)
    const text = `Welcome! Your credentials: Email: ${learnerEmail}, Password: ${temporaryPassword}`;
    const html = `<p>Welcome!</p><p>Credentials: <strong>Email:</strong> ${learnerEmail}, <strong>Password:</strong> ${temporaryPassword}</p>`;
    
    // Send the test email
    console.log('Sending test welcome email...');
    const info = await transporter.sendMail({
      from: `"Cultus Platform" <${testAccount.user}>`,
      to: learnerEmail,
      subject,
      text,
      html,
    });
    
    // Log the result
    console.log('Email sent!');
    console.log('- Message ID:', info.messageId);
    
    // Generate and show preview URL
    console.log('- Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('Open the above URL to see the email content in your browser');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEmailSending();
```

### Running the Test

```bash
npx tsx test-email.ts
```

The script will:
1. Create a temporary Ethereal email account
2. Send a test email to this account
3. Provide a URL where you can view the sent email

## 2. Testing with Your SMTP Server

To test using your actual SMTP server (mail.cultusedu.com), you need to:

1. Set up the correct environment variables
2. Create a test script that uses these variables

### Environment Setup

Create a `.env.local` file with:

```
SMTP_HOST=mail.cultusedu.com
SMTP_PORT=465
SMTP_USER=support@cultusedu.com
SMTP_PASS=your_actual_password
SMTP_SECURE=true
EMAIL_FROM=support@cultusedu.com
```

### Test Script

```typescript
// test-smtp-email.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import { sendLearnerWelcomeEmail } from './lib/email/service';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testRealEmailSending() {
  try {
    console.log('Testing with real SMTP server...');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    
    // Send a test email to yourself (replace with your email)
    const testEmail = 'your.email@example.com'; // Use your email here to receive the test
    
    // Send the welcome email
    const info = await sendLearnerWelcomeEmail(
      testEmail,
      'TestPassword123!',
      'http://localhost:3000/app/login'
    );
    
    console.log('Email sent successfully!');
    console.log('- Message ID:', info.messageId);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testRealEmailSending();
```

### Running the Test

```bash
npx tsx test-smtp-email.ts
```

**Important:** Only run this test with a real recipient email that you control to avoid sending test emails to actual users.

## 3. Testing in Production Environment

For testing in the production environment:

1. Ensure all environment variables are correctly set
2. Create a learner through the admin panel
3. Check that the welcome email is received

## Debugging Common Issues

- **Connection Refused:** Check that your firewall allows outbound connections to the SMTP server
- **Authentication Failed:** Verify your SMTP credentials (username/password)
- **Timeout:** Ensure the SMTP server is reachable from your network
- **SSL/TLS Errors:** Confirm the correct port and secure setting for your SMTP provider

## Monitoring Email Sending

For production monitoring:

1. Implement logging for email sending success/failure
2. Consider setting up alerts for high rates of email failures
3. Periodically check SMTP provider limits and statistics 