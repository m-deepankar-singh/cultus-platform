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
  loginUrl: string = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}`
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
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; min-height: 100vh;">
  <div style="max-width: 600px; margin: 40px auto; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2);">
    
    <!-- Header with glassmorphism effect -->
    <div style="background: linear-gradient(135deg, rgba(74, 108, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%); padding: 48px 40px; text-align: center; position: relative; overflow: hidden;">
      <!-- Decorative elements -->
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(74, 108, 247, 0.05) 0%, transparent 70%); animation: pulse 4s ease-in-out infinite;"></div>
      <div style="position: relative; z-index: 1;">
        <h1 style="color: #1e293b; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.025em; background: linear-gradient(135deg, #4a6cf7 0%, #667eea 50%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          Welcome to Cultus Platform!
        </h1>
        <p style="color: #64748b; margin: 12px 0 0 0; font-size: 18px; font-weight: 500; opacity: 0.9;">
          Your journey to career readiness begins now ✨
        </p>
      </div>
    </div>
    
    <!-- Content with enhanced spacing -->
    <div style="padding: 48px 40px;">
      <p style="color: #475569; font-size: 17px; line-height: 1.7; margin: 0 0 32px 0; font-weight: 400;">
        Your account has been successfully created! Please use the credentials below to access your personalized learning dashboard and start your upskilling journey.
      </p>
      
      <!-- Enhanced Credentials Box with glassmorphism -->
      <div style="background: rgba(248, 250, 252, 0.8); backdrop-filter: blur(8px); border: 2px solid rgba(226, 232, 240, 0.5); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);">
        <h3 style="color: #1e293b; margin: 0 0 24px 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          🔐 Your Login Credentials
        </h3>
        <div style="background: rgba(255, 255, 255, 0.9); border-radius: 12px; padding: 24px; border-left: 4px solid #4a6cf7; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
          <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px;">
            <strong style="color: #1e293b; font-weight: 600;">Email Address:</strong><br>
            <span style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 16px; color: #4a6cf7; font-weight: 600; background: rgba(74, 108, 247, 0.1); padding: 8px 12px; border-radius: 8px; display: inline-block; margin-top: 8px;">${learnerEmail}</span>
          </p>
          <p style="margin: 0; color: #475569; font-size: 15px;">
            <strong style="color: #1e293b; font-weight: 600;">Temporary Password:</strong><br>
            <span style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 16px; color: #dc2626; font-weight: 600; background: rgba(220, 38, 38, 0.1); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(220, 38, 38, 0.2); display: inline-block; margin-top: 8px;">${temporaryPassword}</span>
          </p>
        </div>
      </div>
      
      <!-- Enhanced Action Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${loginUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #4a6cf7 0%, #667eea 50%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 25px rgba(74, 108, 247, 0.3); transition: all 0.3s ease; transform: translateY(0);">
          🚀 Access Your Dashboard
        </a>
        <p style="color: #64748b; font-size: 14px; margin: 16px 0 0 0; font-style: italic;">
          Click the button above to get started with your learning journey
        </p>
      </div>
      
      <!-- Enhanced Security Notice -->
      <div style="background: rgba(255, 251, 235, 0.8); backdrop-filter: blur(4px); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 24px; margin: 32px 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
        <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6; font-weight: 500;">
          <strong style="color: #78350f; font-weight: 600;">🔒 Important Security Notice:</strong><br>
          Please log in and change your password immediately for security. Your temporary password will expire in 7 days for your protection.
        </p>
      </div>
      
      <!-- Enhanced Support Section -->
      <div style="border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 32px; margin-top: 40px;">
        <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0; font-weight: 400;">
          Need help getting started? Our support team is here to assist you every step of the way. We're committed to your success! 💪
        </p>
        <p style="color: #475569; font-size: 17px; margin: 0; font-weight: 500;">
          Best regards,<br>
          <strong style="background: linear-gradient(135deg, #4a6cf7 0%, #667eea 50%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 600;">The Cultus Team</strong>
        </p>
      </div>
    </div>
    
    <!-- Enhanced Footer -->
    <div style="background: rgba(248, 250, 252, 0.6); backdrop-filter: blur(4px); padding: 24px 40px; text-align: center; border-top: 1px solid rgba(226, 232, 240, 0.8);">
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5; font-weight: 400;">
        This email was sent to <strong style="color: #475569;">${learnerEmail}</strong> because an account was created for you on Cultus Platform.<br>
        If you have any questions, please don't hesitate to contact our support team.
      </p>
    </div>
  </div>
  
  <!-- Enhanced Mobile Responsive Styles -->
  <style>
    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }
    
    @media only screen and (max-width: 600px) {
      body { margin: 0 !important; }
      .container { 
        width: 100% !important; 
        margin: 20px auto !important;
        border-radius: 12px !important;
      }
      .content { 
        padding: 32px 24px !important; 
      }
      .header { 
        padding: 40px 24px !important; 
      }
      .button { 
        padding: 14px 32px !important; 
        font-size: 15px !important; 
      }
      .credentials-box {
        padding: 24px !important;
        margin: 24px 0 !important;
      }
      h1 {
        font-size: 26px !important;
      }
      .gradient-text {
        font-size: 22px !important;
      }
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