// Test script to verify email sending functionality
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
    
    const text = `Welcome to Cultus Platform!

Your account has been created. Please use the following credentials to log in:

Email: ${learnerEmail}
Temporary Password: ${temporaryPassword}

Please log in and change your password as soon as possible: ${loginUrl}

If you have any questions, please contact support.

Regards,
The Cultus Team`;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Welcome to Cultus Platform!</h2>
  
  <p>Your account has been created. Please use the following credentials to log in:</p>
  
  <div style="background-color: #f7f7f7; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Email:</strong> ${learnerEmail}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
  </div>
  
  <p>Please <a href="${loginUrl}" style="color: #4a6cf7; text-decoration: none;">log in</a> and change your password as soon as possible.</p>
  
  <p>If you have any questions, please contact support.</p>
  
  <p>Regards,<br>The Cultus Team</p>
</div>`;
    
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