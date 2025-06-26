# Rate Limiting Implementation with Upstash Redis

This directory contains a comprehensive rate limiting solution using Upstash Redis for the Cultus Platform API routes.

## Overview

The rate limiting system provides:
- **Security Protection**: Prevents brute force attacks on authentication endpoints
- **Cost Control**: Limits expensive AI API calls 
- **Resource Management**: Controls bandwidth usage for file uploads
- **Fair Usage**: Ensures equitable resource allocation across users

## Architecture

### Core Components

- **`upstash-optimized.ts`**: Primary rate limiting using Upstash's official @upstash/ratelimit library (recommended)
- **`vercel-kv.ts`**: Legacy custom sliding window implementation (deprecated)
- **`config.ts`**: Rate limiting configurations for different endpoint categories
- **`middleware.ts`**: Integration middleware for API routes
- **`utils.ts`**: Helper functions for IP detection, headers, and logging
- **`index.ts`**: Clean exports for easy consumption

### Integration Points

- **Enhanced Auth Middleware**: `authenticateApiRequestWithRateLimit()` combines authentication with rate limiting
- **Wrapper Functions**: `withAuthAndRateLimit()` for easy route decoration
- **Standalone Guards**: `rateLimitGuard()` for custom implementations

## Rate Limiting Categories

### Authentication Routes (High Security)
- **Login**: 5 requests per 15 minutes per IP
- **Auth Validation**: 100 requests per minute per user
- **Password Reset**: 3 requests per hour per email

### AI-Powered Routes (Cost Protection)
- **Interview Analysis**: 10 requests per hour per user
- **Project Generation**: 20 requests per hour per user
- **Assessment AI**: 50 requests per hour per user

### File Upload Routes (Bandwidth Control)
- **Image Uploads**: 20 requests per hour per user
- **Video Uploads**: 5 requests per hour per user
- **Bulk Operations**: 10 requests per hour per admin

### Admin Routes (Operational Protection)
- **Data Export**: 10 requests per hour per admin
- **Analytics**: 100 requests per hour per admin
- **Bulk Operations**: 20 requests per hour per admin

### Student Routes (Fair Usage)
- **Content Access**: 200 requests per hour per user
- **Progress Tracking**: 100 requests per hour per user
- **Assessment Submission**: 50 requests per hour per user

## Setup Instructions

### 1. Upstash Redis Database Setup

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Choose **Global** for worldwide edge caching or regional for better latency
4. Copy the connection details from the database dashboard

### 2. Environment Variables

Add these to your `.env` file and Vercel environment variables:

```bash
# From Upstash Console → Your Database → Details
UPSTASH_REDIS_REST_URL="https://your-redis-id.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

For Vercel deployment:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Set for Production, Preview, and Development environments

**Note**: The system automatically detects development mode and disables rate limiting when these environment variables are not set, allowing for smooth local development.

### 3. Development Environment

Rate limiting is automatically disabled in development when:
- `NODE_ENV === 'development'`
- `VERCEL_ENV === 'development'`
- `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` is not set

## Usage Examples

### Basic Usage with Enhanced Auth

```typescript
import { authenticateApiRequestWithRateLimit } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequestWithRateLimit(
    request,
    ['Admin', 'Staff'], // Required roles
    RATE_LIMIT_CONFIGS.ADMIN_EXPORT // Rate limit config
  );
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  
  // Your API logic here
}
```

### Using the Wrapper Function

```typescript
import { withAuthAndRateLimit } from '@/lib/auth/api-auth';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export const POST = withAuthAndRateLimit(
  ['student'], 
  RATE_LIMIT_CONFIGS.AI_INTERVIEW_ANALYSIS
)(async (req, auth) => {
  // auth.user, auth.claims, auth.supabase are available
  // Rate limiting is automatically handled
});
```

### Custom Rate Limiting

```typescript
import { rateLimitGuard } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Custom rate limit check
  const rateLimitResponse = await rateLimitGuard(
    request,
    userId,
    userRole,
    {
      id: 'custom_endpoint',
      limit: 10,
      windowMs: 60000, // 1 minute
      useIP: false
    }
  );
  
  if (rateLimitResponse) {
    return rateLimitResponse; // Rate limit exceeded
  }
  
  // Continue with API logic
}
```

## Rate Limit Response Headers

All rate-limited endpoints include these headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1699123456
Retry-After: 45
```

## Error Responses

Rate limit exceeded returns HTTP 429:

```json
{
  "error": "Rate limit exceeded"
}
```

## Role-Based Multipliers

Higher privilege users get increased limits:
- **Admin**: 2.0x multiplier
- **Staff**: 1.5x multiplier  
- **Client Staff**: 1.2x multiplier
- **Viewer**: 1.0x multiplier
- **Student**: 1.0x multiplier

## Monitoring and Logging

### Production Logging

Rate limit events are logged in JSON format:

```json
{
  "type": "rate_limit",
  "identifier": "user:123",
  "endpoint": "/api/app/interviews/analyze",
  "allowed": false,
  "remaining": 0,
  "limit": 10,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Vercel KV Analytics

Enable analytics in Vercel dashboard:
1. Go to Storage → Your KV database
2. Enable Analytics
3. View metrics for operations, storage, and requests

## Troubleshooting

### Rate Limiting Not Working

1. **Check Environment Variables**: Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
2. **Verify Upstash Database**: Test connection in Upstash console
3. **Development Mode**: Rate limiting is disabled in development by design

### High Latency

1. **Upstash Region**: Choose the region closest to your deployment for optimal performance
2. **Global Replication**: Use Upstash Global for worldwide edge caching
3. **Optimized Library**: The @upstash/ratelimit library provides automatic optimizations

### Rate Limits Too Strict

1. **Adjust Configs**: Modify limits in `lib/rate-limit/config.ts`
2. **Role Multipliers**: Increase multipliers for specific roles
3. **Endpoint Detection**: Verify correct config is matched in `getRateLimitConfigByEndpoint()`

## Security Considerations

- **IP Spoofing**: Uses multiple headers for IP detection with validation
- **Graceful Degradation**: Allows requests if Upstash Redis is unavailable (logged)
- **Development Safety**: Automatically disabled in development mode
- **User Privacy**: Only stores timestamps and request counts, not request content

## Performance Impact

- **Cold Starts**: ~5-10ms additional latency for cold functions
- **Hot Functions**: ~1-2ms additional latency with built-in caching
- **Upstash Operations**: Optimized sliding window algorithm with edge caching
- **Memory Usage**: Minimal memory footprint with connection pooling

## Cost Estimation

Upstash Redis pricing (as of 2024):
- **Pay per request**: $0.20 per 100K requests
- **Storage**: $0.25 per GB-month  
- **Global replication**: Available on higher tiers
- **Free tier**: 10K requests/day, 256MB storage

Estimated monthly cost for 1M API requests: ~$2-4 (cost-effective compared to other solutions)