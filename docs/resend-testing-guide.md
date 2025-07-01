# Resend Email Service Testing Guide

## Quick Setup

### 1. Get a Resend API Key
1. Go to [https://resend.com](https://resend.com)
2. Sign up/login to your account
3. Navigate to API Keys section
4. Create a new API key (starts with `re_`)

### 2. Configure Environment Variables

Copy `.env.local.template` to `.env.local`:
```bash
cp .env.local.template .env.local
```

Edit `.env.local` and add:
```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=support@cultuslearn.com
TEST_EMAIL=your-email@example.com
```

**Important**: Replace `your-email@example.com` with your actual email address to receive test emails.

### 3. Run the Test Script

```bash
npx tsx scripts/test-resend-email.ts
```

## What the Test Does

The test script will:

1. **Environment Validation**
   - ✅ Check if all required environment variables are set
   - ✅ Validate RESEND_API_KEY format (must start with `re_`)
   - ✅ Display configuration status

2. **Basic Email Test**
   - 📧 Send a simple test email to verify Resend connectivity
   - 🆔 Return Resend message ID for tracking
   - 📊 Display response details

3. **Welcome Email Test**
   - 📧 Send the actual welcome email template used for new learners
   - 🔑 Include test temporary password
   - 🎨 Test the full HTML template with styling

## Expected Output

### Successful Test:
```
🧪 Resend Email Service Test
================================

=== Environment Validation ===
✅ RESEND_API_KEY: (set)
✅ EMAIL_FROM: support@cultusedu.com
✅ TEST_EMAIL: your-email@example.com
✅ Environment validation passed

=== Testing Basic Email ===
✅ Basic email sent successfully!
Message ID: 01234567-89ab-cdef-0123-456789abcdef
Response: {
  "data": {
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  }
}

=== Testing Welcome Email ===
✅ Welcome email sent successfully!
Message ID: 01234567-89ab-cdef-0123-456789abcdef
Response: {
  "data": {
    "id": "01234567-89ab-cdef-0123-456789abcdef"
  }
}

🎉 All tests passed! Resend service is working correctly.
📧 Check your inbox for the test emails.
```

### Failed Test (Missing Environment):
```
❌ Missing environment variables: ['RESEND_API_KEY', 'TEST_EMAIL']

📝 Setup Instructions:
1. Copy .env.local.template to .env.local
2. Get your Resend API key from https://resend.com/api-keys
3. Set the following variables in .env.local:
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=support@cultusedu.com
   TEST_EMAIL=your-email@example.com
```

## Testing API Integration

Once the email service test passes, you can test the full API integration:

### Test Single Learner Creation
```bash
curl -X POST http://localhost:3000/api/admin/learners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "client_id": "your_client_id",
    "job_readiness_background_type": "COMPUTER_SCIENCE"
  }'
```

### Expected API Response:
```json
{
  "id": "uuid",
  "full_name": "Test User",
  "email": "test@example.com",
  "temporary_password": "generated_password",
  "client_id": "your_client_id"
}
```

### Check Logs:
Look for these log entries:
```
[EMAIL SUCCESS] Welcome email sent to test@example.com - Resend ID: message_id
```

## Troubleshooting

### Common Issues:

1. **"Invalid RESEND_API_KEY format"**
   - Ensure your API key starts with `re_`
   - Copy the key exactly from Resend dashboard

2. **"Failed to send email via Resend"**
   - Check if your Resend account is verified
   - Verify the `EMAIL_FROM` domain is configured in Resend
   - Check Resend dashboard for sending limits

3. **"Environment variable not set"**
   - Ensure `.env.local` file exists
   - Check that variables are correctly named
   - Restart the development server after changing environment variables

### Domain Configuration

If using a custom domain for `EMAIL_FROM`:
1. Add your domain to Resend dashboard
2. Verify domain ownership (DNS records)
3. Wait for verification to complete

For testing, you can use Resend's default domain:
```env
EMAIL_FROM=onboarding@resend.dev
```

## Production Considerations

Before deploying to production:

1. **Verify Domain**: Ensure your sending domain is verified in Resend
2. **Monitor Limits**: Check your Resend plan's sending limits
3. **Set Production Variables**: Configure environment variables in Vercel dashboard
4. **Test in Staging**: Run tests in staging environment first

## Success Criteria

✅ Test script runs without errors  
✅ You receive both test emails in your inbox  
✅ Welcome email template displays correctly  
✅ Message IDs are returned for tracking  
✅ API integration maintains non-blocking behavior