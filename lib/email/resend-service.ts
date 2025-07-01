import { Resend } from 'resend';

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
    console.log('[EMAIL SERVICE] Resend client initialized with API key');
  }
  return resendClient;
}

/**
 * Options for sending an email via Resend
 */
export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string; // Optional HTML content
}

/**
 * Resend API response structure
 */
export interface ResendResponse {
  data?: {
    id: string;
  };
  error?: any; // Resend returns ErrorResponse | null, so we use any for flexibility
}

/**
 * Validates Resend API key configuration
 * @returns boolean indicating if configuration is valid
 */
async function validateResendConfig(): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL SERVICE] RESEND_API_KEY environment variable is not set');
      return false;
    }
    
    if (!process.env.RESEND_API_KEY.startsWith('re_')) {
      console.error('[EMAIL SERVICE] Invalid RESEND_API_KEY format (should start with "re_")');
      return false;
    }
    
    // Test API key by attempting to get account info (lightweight validation)
    // Note: Resend doesn't have a dedicated health check endpoint, so we rely on key format validation
    console.log('[EMAIL SERVICE] Resend API key validation passed');
    return true;
  } catch (error) {
    console.error('[EMAIL SERVICE] Resend configuration validation failed:', error);
    return false;
  }
}

/**
 * Sends an email using the Resend API
 * @param options - Email options including recipient, subject, and content
 * @returns The response object from Resend API with standardized format
 */
export async function sendEmail(options: MailOptions): Promise<ResendResponse> {
  try {
    console.log(`[EMAIL SERVICE] Attempting to send email to ${options.to} with subject: ${options.subject}`);
    
    // Validate configuration before attempting to send
    const isValid = await validateResendConfig();
    if (!isValid) {
      throw new Error('Invalid Resend configuration');
    }
    
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'support@cultusedu.com',
      to: [options.to], // Resend expects an array
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    // Check if response has an error
    if (response.error) {
      console.error('[EMAIL SERVICE] Resend API error:', response.error);
      throw new Error(`Resend API error: ${response.error.message || 'Unknown error'}`);
    }
    
    console.log('[EMAIL SERVICE] Message sent successfully:', response.data?.id);
    
    // Return standardized response format
    return {
      data: response.data ? { id: response.data.id } : undefined,
      error: response.error
    };
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    // Provide more detailed error message
    if (error instanceof Error) {
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    } else {
      throw new Error(`Failed to send email via Resend: ${String(error)}`);
    }
  }
}

/**
 * Sends a welcome email with login credentials to a new learner
 * @param learnerEmail - The email address of the learner
 * @param temporaryPassword - The temporary password generated for the learner
 * @param loginUrl - The URL to the login page
 * @returns The response object from Resend API with standardized format
 */
export async function sendLearnerWelcomeEmail(
  learnerEmail: string,
  temporaryPassword: string,
  loginUrl: string = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
): Promise<ResendResponse> {
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
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Cultus Platform</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4a6cf7 0%, #667eea 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
        Welcome to Cultus Platform!
      </h1>
      <p style="color: #e2e8f0; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">
        Your journey to career readiness begins now
      </p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your account has been successfully created! Please use the credentials below to access your personalized learning dashboard.
      </p>
      
      <!-- Credentials Box -->
      <div style="background-color: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
          🔐 Your Login Credentials
        </h3>
        <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; border-left: 4px solid #4a6cf7;">
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
            <strong style="color: #1f2937;">Email:</strong><br>
            <span style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 15px; color: #4a6cf7; font-weight: 500;">${learnerEmail}</span>
          </p>
          <p style="margin: 0; color: #374151; font-size: 14px;">
            <strong style="color: #1f2937;">Temporary Password:</strong><br>
            <span style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 15px; color: #dc2626; font-weight: 500; background-color: #fef2f2; padding: 4px 8px; border-radius: 4px; border: 1px solid #fecaca;">${temporaryPassword}</span>
          </p>
        </div>
      </div>
      
      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #4a6cf7 0%, #667eea 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(74, 108, 247, 0.3); transition: transform 0.2s ease;">
          🚀 Access Your Dashboard
        </a>
      </div>
      
      <!-- Security Notice -->
      <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
          <strong>🔒 Important Security Notice:</strong><br>
          Please log in and change your password immediately for security. Your temporary password will expire in 7 days.
        </p>
      </div>
      
      <!-- Support Section -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Need help getting started? Our support team is here to assist you every step of the way.
        </p>
        <p style="color: #374151; font-size: 16px; margin: 0;">
          Best regards,<br>
          <strong style="color: #4a6cf7;">The Cultus Team</strong>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.4;">
        This email was sent to ${learnerEmail} because an account was created for you on Cultus Platform.<br>
        If you have any questions, please contact our support team.
      </p>
    </div>
  </div>
  
  <!-- Mobile Responsive Styles -->
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 20px !important; }
      .header { padding: 30px 20px !important; }
      .button { padding: 12px 24px !important; font-size: 14px !important; }
    }
  </style>
</body>
</html>`;

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