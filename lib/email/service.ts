import nodemailer, { TransportOptions } from 'nodemailer';

// Create a transporter using SMTP configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Force IPv4 to avoid IPv6 issues
    family: 4
  },
} as TransportOptions);

// Log configuration on startup (without sensitive info)
console.log('[EMAIL SERVICE] Initialized with config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER ? '(set)' : '(not set)',
  from: process.env.EMAIL_FROM,
});

/**
 * Options for sending an email
 */
export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string; // Optional HTML content
}

/**
 * Sends an email using the configured SMTP transporter
 * @param options - Email options including recipient, subject, and content
 * @returns The info object from the mail delivery
 */
export async function sendEmail(options: MailOptions) {
  try {
    console.log(`[EMAIL SERVICE] Attempting to send email to ${options.to} with subject: ${options.subject}`);
    
    // Verify SMTP connection before attempting to send
    try {
      await transporter.verify();
      console.log('[EMAIL SERVICE] SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('[EMAIL SERVICE] SMTP connection verification failed:', verifyError);
      throw new Error(`SMTP connection verification failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
    }
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // Sender address
      to: options.to, // List of receivers
      subject: options.subject, // Subject line
      text: options.text, // Plain text body
      html: options.html, // HTML body
      // Add some headers to reduce spam likelihood
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MSMail-Priority': 'High',
      }
    });
    
    console.log('[EMAIL SERVICE] Message sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    // Provide more detailed error message
    if (error instanceof Error) {
      throw new Error(`Failed to send email: ${error.message}`);
    } else {
      throw new Error(`Failed to send email: ${String(error)}`);
    }
  }
}

/**
 * Sends a welcome email with login credentials to a new learner
 * @param learnerEmail - The email address of the learner
 * @param temporaryPassword - The temporary password generated for the learner
 * @param loginUrl - The URL to the login page
 * @returns The info object from the mail delivery
 */
export async function sendLearnerWelcomeEmail(
  learnerEmail: string,
  temporaryPassword: string,
  loginUrl: string = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
) {
  console.log(`[EMAIL SERVICE] Preparing welcome email for ${learnerEmail}`);
  
  const subject = 'Welcome to Cultus Platform!';
  
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

  try {
    return await sendEmail({
      to: learnerEmail,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`[EMAIL SERVICE] Failed to send welcome email to ${learnerEmail}:`, error);
    throw error; // Re-throw to be caught by caller
  }
} 