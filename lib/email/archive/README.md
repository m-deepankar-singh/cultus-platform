# Email Service Archive

This directory contains archived versions of the email service during the migration from SMTP to Resend API.

## Files

- `service-smtp-backup.ts` - Original Nodemailer SMTP implementation (backup created during Resend migration)

## Migration Context

**Date**: $(date)
**Migration**: SMTP (Nodemailer) → Resend API
**Reason**: Improved deliverability, performance, and Vercel optimization
**Preserved Features**: Temporary password emails, non-blocking behavior, welcome email templates

## Recovery Instructions

If rollback is needed:
1. Copy `service-smtp-backup.ts` back to `../service.ts`
2. Remove Resend dependency from package.json
3. Restore SMTP environment variables
4. Update API route imports back to original service

## Notes

- The original SMTP service used mail.cultusedu.com with port 465
- Welcome email functionality preserved exactly in new Resend implementation
- All templates and error handling patterns maintained