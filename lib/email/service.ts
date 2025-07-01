/**
 * Email Service - Resend Integration
 * 
 * This file re-exports the Resend email service functions.
 * All email functionality has been migrated from SMTP to Resend API.
 * 
 * Migration completed: December 2024
 * Old SMTP implementation archived in: lib/email/archive/
 */

export { 
  sendEmail, 
  sendLearnerWelcomeEmail,
  type MailOptions,
  type ResendResponse 
} from './resend-service';