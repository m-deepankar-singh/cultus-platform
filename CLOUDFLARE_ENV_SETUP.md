# Cloudflare Environment Variables Setup

## Current Build Error
```
Error: Missing environment variable: NEXT_PUBLIC_SUPABASE_URL
```

This error occurs because Cloudflare's GitHub integration runs `next build` without access to the required environment variables.

## Fix: Configure Environment Variables in Cloudflare Dashboard

### Step 1: Access Worker Settings
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click on your **cultus** worker
4. Go to **Settings** tab
5. Scroll to **Environment variables** section

### Step 2: Add Required Environment Variables

**For Production Environment:**
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
CLOUDFLARE_WORKERS = true
NODE_ENV = production
```

**For Preview Environment (optional):**
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
CLOUDFLARE_WORKERS = true
NODE_ENV = staging
```

### Step 3: Configure Build Settings

Make sure your build configuration is set to:
- **Build command**: `pnpm build:workers`
- **Root directory**: `/` (or leave empty)
- **Output directory**: `.open-next`

### Step 4: Trigger New Deployment

After adding the environment variables:
1. Go to **Deployments** tab
2. Click **Create deployment**
3. Or push a new commit to trigger automatic deployment

## Alternative: Update wrangler.toml

If you prefer to manage environment variables in code, update your `wrangler.toml`:

```toml
[vars]
NODE_VERSION = "20"
NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "your_anon_key_here"
CLOUDFLARE_WORKERS = "true"
```

**⚠️ Warning**: Only use this approach for non-sensitive variables. For sensitive data, use the Cloudflare dashboard.

## Verification

After setting up environment variables, the build should:
1. ✅ Complete `next build` successfully
2. ✅ Generate `.open-next/worker.js`
3. ✅ Deploy without errors

## Common Issues

### Build Still Failing?
- Ensure all required env vars are set
- Check variable names match exactly (case-sensitive)
- Verify Supabase URL format is correct

### Environment Variables Not Loading?
- Clear Cloudflare's build cache
- Redeploy after adding variables
- Check the correct environment (Production vs Preview)

## Build Command Reference

Your GitHub integration should use:
```bash
pnpm build:workers
```

This command:
1. Sets `CLOUDFLARE_WORKERS=true`
2. Runs `next build`
3. Runs `npx @opennextjs/cloudflare@latest build`
4. Generates `.open-next/worker.js` 