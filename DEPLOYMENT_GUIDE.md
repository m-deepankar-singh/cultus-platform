# Dual Deployment Guide

This project supports deployment to both **Vercel** and **Cloudflare Workers** using the same codebase.

## Platform-Specific Configuration

### Vercel Deployment
- Uses standard Next.js configuration
- Image optimization enabled
- Serverless functions for API routes
- Build command: `pnpm build:vercel`

### Cloudflare Workers Deployment
- Uses OpenNext.js adapter for Workers runtime
- Image optimization disabled (uses Cloudflare Images)
- Edge runtime for all functions
- Build command: `pnpm build:workers`

## Deployment Commands

### For Vercel:
```bash
# Development
pnpm dev

# Build for Vercel
pnpm build:vercel

# Deploy to Vercel
pnpm deploy:vercel          # Preview deployment
pnpm deploy:vercel:prod     # Production deployment
```

### For Cloudflare Workers:
```bash
# Development (local Workers runtime)
pnpm dev:workers

# Build for Workers
pnpm build:workers

# Preview locally
pnpm preview:workers

# Deploy to Workers
pnpm deploy:workers         # Production deployment
pnpm deploy:workers:staging # Staging deployment
```

## Environment Variables

### Shared Variables (both platforms):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Database connection strings
- API keys

### Platform-Specific Variables:

#### Vercel:
Set in Vercel dashboard or `.env.local`

#### Cloudflare Workers:
Set in `wrangler.toml` under `[vars]` section or use Wrangler secrets:
```bash
npx wrangler secret put SECRET_NAME
```

## Key Differences

| Feature | Vercel | Cloudflare Workers |
|---------|--------|-------------------|
| Runtime | Node.js | V8 Edge Runtime |
| Image Optimization | Next.js Image | Cloudflare Images |
| File Storage | Vercel Blob | Cloudflare R2 |
| Database | Any | Works with edge-compatible DBs |
| Build Output | Standard Next.js | OpenNext.js Worker |

## Troubleshooting

### Cloudflare Workers Build Issues:
1. Ensure `nodejs_compat` flag is enabled in `wrangler.toml`
2. Check compatibility date is `2024-09-23` or later
3. Use `CLOUDFLARE_WORKERS=true` environment variable during build
4. Clear build cache: `rm -rf .next .open-next`

### Vercel Deployment Issues:
1. Ensure no Cloudflare-specific configurations are applied
2. Check that image optimization is enabled
3. Verify environment variables are set correctly

## CI/CD Setup

### GitHub Actions Example:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-vercel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm deploy:vercel:prod

  deploy-workers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm deploy:workers
```

## Development Workflow

1. **Local Development**: Use `pnpm dev` for standard Next.js development
2. **Test Workers Runtime**: Use `pnpm dev:workers` to test in Workers environment
3. **Build Testing**: 
   - `pnpm build:vercel` to test Vercel build
   - `pnpm build:workers` to test Workers build
4. **Deploy**: Use appropriate deploy commands for each platform 