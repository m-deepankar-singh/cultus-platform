# Cloudflare Workers Deployment Guide

This guide explains how to deploy the Cultus Platform to Cloudflare Workers using the OpenNext adapter, while maintaining your existing Vercel deployment.

## Overview

The setup provides:
- **Dual Deployment**: Both Vercel and Cloudflare Workers from the same `main` branch
- **Node.js Runtime**: Full Node.js API support (no Edge runtime limitations)
- **R2 Integration**: Optimized file storage with native R2 bindings
- **Zero Configuration Changes**: No need to add `export const runtime = "edge"` to routes

## Prerequisites

1. **Cloudflare Account**: Sign up at [Cloudflare](https://cloudflare.com)
2. **Domain on Cloudflare**: Add your domain to Cloudflare (optional for testing)
3. **R2 Bucket**: Create an R2 bucket for file storage
4. **Environment Variables**: Prepare your production environment variables

## Setup Steps

### 1. Dependencies (Already Installed)
```bash
pnpm install -D wrangler @opennextjs/cloudflare
```

### 2. Authenticate with Cloudflare
```bash
# Login to Cloudflare
pnpm run workers:login

# Verify authentication
npx wrangler whoami
```

### 3. Configure wrangler.toml

Update the `wrangler.toml` file with your specific values:

```toml
# Replace with your actual values
name = "cultus-platform"
[[routes]]
pattern = "your-domain.com/*"
zone_name = "your-domain.com"

[vars]
NEXT_PUBLIC_SUPABASE_URL = "your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "your_supabase_anon_key"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-actual-bucket-name"
```

### 4. Set Environment Variables

Add sensitive environment variables using Wrangler:

```bash
# Add secrets (these won't be visible in wrangler.toml)
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put SMTP_PASS
npx wrangler secret put GOOGLE_AI_API_KEY
```

## Deployment Commands

### Development
```bash
# Local development with Workers runtime
pnpm run dev:workers
```

### Staging Deployment
```bash
# Deploy to staging environment
pnpm run deploy:workers:staging
```

### Production Deployment
```bash
# Deploy to production
pnpm run deploy:workers
```

## Key Features

### 1. Automatic Environment Detection
The app automatically detects the runtime environment and uses appropriate services:
- **Vercel**: Uses AWS SDK for R2 operations
- **Cloudflare Workers**: Uses native R2 bindings for better performance

### 2. Optimized Image Handling
- **Vercel**: Uses Next.js image optimization
- **Workers**: Disables optimization, relies on Cloudflare Images if configured

### 3. Node.js Runtime Support
All your existing APIs work without modification:
- `/api/r2/presigned-upload` - File upload handling
- `/api/admin/job-readiness/*` - Complex business logic
- `/api/auth/*` - Authentication flows

## Troubleshooting

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild for Workers
pnpm run build:workers
```

### Binding Issues
```bash
# Check binding configuration
npx wrangler kv:namespace list
npx wrangler r2 bucket list
```

### Environment Variables
```bash
# List current secrets
npx wrangler secret list

# Update a secret
npx wrangler secret put SECRET_NAME
```

## Performance Optimizations

### 1. R2 Bindings
The Workers adapter automatically uses R2 bindings when available, providing:
- Faster file operations
- Lower latency
- Better error handling

### 2. Edge Locations
Cloudflare Workers run at 300+ edge locations worldwide, reducing latency for global users.

### 3. Caching
Configure caching rules in your Cloudflare dashboard for static assets and API responses.

## Monitoring and Logs

### View Real-time Logs
```bash
# Tail logs from Workers
npx wrangler tail
```

### Analytics
- View metrics in Cloudflare Dashboard
- Monitor performance and errors
- Set up alerts for issues

## GitHub Actions (Optional)

Create `.github/workflows/deploy-workers.yml`:

```yaml
name: Deploy to Cloudflare Workers
on:
  push:
    branches: [main]
  
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run build:workers
      - run: pnpm run deploy:workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Cost Considerations

Cloudflare Workers pricing (as of 2024):
- **Free Tier**: 100,000 requests/day
- **Paid Plan**: $5/month for 10M requests + $0.50/additional million
- **R2 Storage**: $0.015/GB/month (much cheaper than AWS S3)

## Next Steps

1. **Test locally**: `pnpm run dev:workers`
2. **Deploy to staging**: `pnpm run deploy:workers:staging`
3. **Configure custom domain** in Cloudflare Dashboard
4. **Set up monitoring** and alerts
5. **Update DNS** to point to Workers (when ready)

## Support

For issues:
1. Check Cloudflare Workers documentation
2. Review Wrangler logs
3. Test with `npx wrangler dev --local`
4. Compare behavior between Vercel and Workers deployments 