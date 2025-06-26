# Cloudflare GitHub Integration Environment Variables Fix

## Current Issue
```
Error: Missing environment variable: NEXT_PUBLIC_SUPABASE_URL
```

This error occurs because Cloudflare's GitHub integration requires environment variables to be set for **both** build-time and runtime.

## Step-by-Step Fix

### Step 1: Set Environment Variables in Cloudflare Dashboard

1. **Go to Cloudflare Dashboard**:
   - Navigate to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Workers & Pages → **cultus** → **Settings** → **Environment variables**

2. **Add Variables for Production Environment**:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
   CLOUDFLARE_WORKERS = true
   NODE_ENV = production
   ```

3. **Add Variables for Preview Environment** (if you want preview deployments):
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key_here
   CLOUDFLARE_WORKERS = true
   NODE_ENV = staging
   ```

### Step 2: Verify Build Configuration

1. **Check Build Command**:
   - In the Cloudflare dashboard: Workers & Pages → **cultus** → **Settings** → **Builds**
   - **Build command** should be: `pnpm build:workers`
   - **Root directory**: `/` (or empty)

2. **Verify Package Manager**:
   - Ensure it's set to `pnpm` not `npm`

### Step 3: Check wrangler.toml Configuration

Your `wrangler.toml` should have the environment variables defined, but they can be empty (will be overridden by dashboard values):

```toml
[vars]
NODE_VERSION = "20"
NEXT_PUBLIC_SUPABASE_URL = ""
NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
```

### Step 4: Trigger New Deployment

After setting environment variables:
1. **Push a new commit** to trigger GitHub integration deployment
2. **OR** manually trigger in dashboard: Workers & Pages → **cultus** → **Deployments** → **Create deployment**

### Step 5: Monitor Build Logs

Watch the build process in:
- Cloudflare dashboard: Workers & Pages → **cultus** → **Deployments**
- The build should now complete without the environment variable error

## Common Issues & Solutions

### Issue 1: Variables Set But Still Getting Error
**Solution**: Environment variables in Cloudflare need to be set for the **correct environment**:
- Production deployments use **Production** environment variables
- Preview deployments use **Preview** environment variables

### Issue 2: Build Command Not Found
**Solution**: Ensure your GitHub repository has the correct scripts in `package.json`:
```json
{
  "scripts": {
    "build:workers": "CLOUDFLARE_WORKERS=true next build && npx @opennextjs/cloudflare@latest build"
  }
}
```

### Issue 3: Missing Service Role Key
If you get errors about `SUPABASE_SERVICE_ROLE_KEY`, add it as a **Secret** (not environment variable):
1. Cloudflare dashboard → Workers & Pages → **cultus** → **Settings** → **Environment variables**
2. Add **Secret**: `SUPABASE_SERVICE_ROLE_KEY` = `your_service_role_key`

### Issue 4: GitHub Integration Not Building
Check that:
1. Repository is properly connected
2. Push triggers are enabled
3. Branch settings are correct

## Verification Steps

1. **Check Environment Variables Are Set**:
   - Dashboard shows the variables you added
   - Values are not empty/null

2. **Test Build Process**:
   - Push a small change to trigger build
   - Monitor build logs for success

3. **Verify Deployment**:
   - Worker should deploy without `.open-next/worker.js` not found error
   - Application should load correctly

## Alternative: Use .dev.vars for Local Testing

For local testing, create a `.dev.vars` file (add to `.gitignore`):
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CLOUDFLARE_WORKERS=true
```

Then test locally with:
```bash
pnpm build:workers
pnpm dev:workers
``` 