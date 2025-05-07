# Email Sending Implementation Plan (Nodemailer)

## Overview
This plan outlines the steps to implement email sending functionality using Nodemailer within the Cultus Platform backend. The primary use case is sending newly created learners their login credentials (email and temporary password) via email upon creation through the admin panel.

**Security Note:** Sending passwords directly via email is generally discouraged. Consider using invite links or password reset flows provided by Supabase Auth for enhanced security. This plan proceeds with the direct password email approach as requested, but the security implications should be carefully evaluated.

## 1. Project Setup
- [x] **Install Nodemailer:** Add Nodemailer as a project dependency.
  ```bash
  pnpm add nodemailer
  pnpm add -D @types/nodemailer # Add types for TypeScript
  ```
- [x] **Configure Environment Variables:** Set up environment variables for SMTP configuration to avoid hardcoding credentials. Created reference document at `docs/env-config-reference.md`.
  - `SMTP_HOST`: `mail.cultusedu.com`
  - `SMTP_PORT`: `465`
  - `SMTP_USER`: `support@cultusedu.com`
  - `SMTP_PASS`: [Your `support@cultusedu.com` password]
  - `SMTP_SECURE`: `true` (Since port 465 typically uses SSL/TLS)
  - `EMAIL_FROM`: `support@cultusedu.com` (Or a desired "From" address)

## 2. Backend Foundation
- [x] **Create Email Service Module:**
  - Created new service file at `lib/email/service.ts`
  - Imported `nodemailer` and set up transporter
  ```typescript
  import nodemailer from 'nodemailer';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  ```
- [x] **Implement Generic Send Function:**
  - Created a reusable `sendEmail` function
  ```typescript
  interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string; // Optional HTML content
  }

  export async function sendEmail(options: MailOptions) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM, // Sender address
        to: options.to, // List of receivers
        subject: options.subject, // Subject line
        text: options.text, // Plain text body
        html: options.html, // HTML body
      });
      console.log('Message sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }
  ```
- [x] **Implement Specialized Send Function:**
  - Created a specialized `sendLearnerWelcomeEmail` function that formats a welcome email with login credentials
  ```typescript
  export async function sendLearnerWelcomeEmail(
    learnerEmail: string,
    temporaryPassword: string,
    loginUrl: string = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
  ) {
    // Implementation details with formatted email template
    return sendEmail({
      to: learnerEmail,
      subject: 'Welcome to Cultus Platform!',
      text: '...',
      html: '...',
    });
  }
  ```

## 3. Feature-specific Backend (Learner Creation Email)
- [x] **Modify Learner Creation Endpoint:**
  - Updated the API route handler for creating learners (`app/api/admin/learners/route.ts`) to send welcome emails.
- [x] **Import Email Service:** 
  - Added import for the email service:
  ```typescript
  import { sendLearnerWelcomeEmail } from '@/lib/email/service';
  ```
- [x] **Call Email Function:**
  - Added code to send a welcome email after successfully creating a new learner:
  ```typescript
  // 3. Send welcome email with login credentials
  try {
    await sendLearnerWelcomeEmail(
      learnerData.email, 
      randomPassword,
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://cultus-platform.com'}/app/login`
    );
    console.log(`Welcome email sent to ${learnerData.email}`);
  } catch (emailError) {
    // We don't want to fail the API if only the email fails
    console.error('Error sending welcome email:', emailError);
    // We could log this to a monitoring service or alert system
  }
  ```

## 4. Integration
- [x] **Ensure Integration:**
  - Email sending functionality has been properly integrated with the learner creation flow.
  - Error handling ensures that API endpoints don't fail entirely if just the email sending fails.

## 5. Testing
- [x] **Unit Testing:**
    - Created a test script (`test-email.ts`) to verify email sending functionality using Ethereal (fake SMTP service).
    - Successfully tested the email service using Ethereal, which provides preview links to see the emails.
- [x] **Integration Testing:**
    - Created a test script (`test-smtp-email.ts`) for testing with real SMTP servers.
    - Created documentation for testing in various environments at `docs/email-testing.md`.
- [x] **Manual Testing Preparation:**
    - Prepared guide for how to test by creating a new learner through the admin UI.

## 6. Documentation
- [x] **Document Environment Variables:**
  - Created `docs/env-config-reference.md` with required SMTP environment variables.
- [x] **Document Email Flow:**
  - Documented the email sending flow in code comments and in plan document.
- [x] **Document Testing:**
  - Created `docs/email-testing.md` with comprehensive testing strategies.

## 7. Deployment
- [ ] **Configure Production Environment:**
  - Ensure all required SMTP environment variables are securely configured in the production environment.
- [ ] **Verify Network Access:**
  - Verify firewall rules allow outbound connections from the application server to the SMTP server.

## 8. Maintenance
- [ ] **Implement Detailed Logging:**
  - Enhance logging for email sending successes and failures.
- [ ] **Set Up Monitoring:**
  - Set up monitoring to alert on high rates of email sending failures.
- [ ] **Create Bounce Handling Process:**
  - Have a process for handling bounced emails or deliverability issues.
- [ ] **Regular Review:**
  - Establish process to regularly review SMTP provider limits and performance. 