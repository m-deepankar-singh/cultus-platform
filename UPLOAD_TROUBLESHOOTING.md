# Upload Troubleshooting Guide

## 🚨 "Network error during upload" - Diagnosis & Fixes

### Quick Fix Steps

1. **Check R2 Configuration**
   ```bash
   curl http://localhost:3000/api/r2/test-config
   ```
   This should return `"configured": true`. If false, check environment variables.

2. **Verify Environment Variables**
   Add these to your `.env.local`:
   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   ```

3. **Test Presigned URL Generation**
   Check browser console during upload for detailed error logs.

### Common Issues & Solutions

#### Issue 1: Missing Environment Variables
**Symptom**: "Server configuration error" or "Missing required R2 environment variables"
**Fix**: 
- Ensure all R2 environment variables are set in `.env.local`
- Restart your development server after adding variables

#### Issue 2: Authentication Error
**Symptom**: "Admin access required" or 403 error
**Fix**: 
- Ensure you're logged in as an admin user
- Check your profile role in the database

#### Issue 3: CORS Configuration
**Symptom**: Network error immediately after presigned URL generation
**Fix**: Configure CORS on your R2 bucket:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
      "AllowedMethods": ["PUT", "POST", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Using Wrangler:
```bash
# Create cors-config.json with the above content
wrangler r2 bucket cors put cultus-private-submissions --file cors-config.json
```

#### Issue 4: Bucket Doesn't Exist
**Symptom**: Presigned URL generation fails
**Fix**: Create the bucket:
```bash
wrangler r2 bucket create cultus-private-submissions
```

#### Issue 5: File Size Limits
**Symptom**: Upload starts but fails partway through
**Fix**: 
- Expert sessions: Max 500MB
- Interviews: Max 200MB
- Ensure file doesn't exceed limits

### Debug Information

The enhanced hooks now provide detailed console logging:

1. **Presigned URL Request**: Logs request details
2. **Upload Progress**: Shows upload status
3. **Network Errors**: Detailed error information
4. **CORS Issues**: Specific error messages

### Testing Checklist

- [ ] Environment variables configured
- [ ] R2 bucket exists
- [ ] CORS properly configured
- [ ] User has admin role
- [ ] File size within limits
- [ ] File type is video/*
- [ ] Internet connection stable

### Manual Testing

1. **Test small file first** (< 10MB)
2. **Check browser network tab** for failed requests
3. **View console logs** for detailed error information
4. **Test with different file formats** (MP4, WebM, MOV)

### If Issue Persists

1. Check browser developer tools Network tab
2. Look for CORS errors in console
3. Verify R2 bucket permissions
4. Test with a smaller file first
5. Ensure bucket exists in correct Cloudflare account 