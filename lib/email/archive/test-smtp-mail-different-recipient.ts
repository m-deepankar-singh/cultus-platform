// Testing with multiple email recipients
import { config } from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
config();

async function testMultipleRecipients() {
  try {
    console.log('Testing with multiple email recipients...');
    
    // Use your SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        family: 4
      }
    } as nodemailer.TransportOptions);
    
    // List of test emails (use your own email addresses)
    // Ideally, include addresses from different providers like Gmail, Outlook, etc.
    const testEmails = [
      'singh.deepankar39@gmail.com',
      // Add an additional email if available (optional)
      // 'your.other.email@outlook.com', 
    ];
    
    console.log('Sending test email to:', testEmails.join(', '));
    
    // Create email content
    const now = new Date().toISOString();
    const subject = `Test Email from Cultus Platform (${now})`;
    const text = `This is a test email sent at ${now}. Please confirm receipt.`;
    const html = `<p>This is a test email sent at ${now}.</p><p>Please confirm receipt.</p>`;
    
    // Send to each recipient individually
    // This helps identify if the issue is with specific recipients
    for (const email of testEmails) {
      console.log(`\nSending to ${email}...`);
      const info = await transporter.sendMail({
        from: `"Cultus Platform Test" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject,
        text,
        html
      });
      
      console.log('Email accepted for', email);
      console.log('Message ID:', info.messageId);
    }
    
    console.log('\nAll test emails have been accepted by the SMTP server.');
    console.log('Please check both inbox AND spam folders for each recipient.');
    
    // Also test Ethereal as a fallback
    console.log('\nCreating Ethereal test account for verification...');
    const testAccount = await nodemailer.createTestAccount();
    const etherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      }
    });
    
    const etherealInfo = await etherealTransporter.sendMail({
      from: '"Test" <test@example.com>',
      to: "recipient@example.com",
      subject: `Test Email (${now})`,
      text: "This is a test email from Ethereal",
      html: "<p>This is a test email from Ethereal</p>",
    });
    
    console.log('Ethereal test email sent successfully!');
    console.log('Preview URL:', nodemailer.getTestMessageUrl(etherealInfo));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMultipleRecipients(); 