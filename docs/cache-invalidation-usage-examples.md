# Cache Invalidation Usage Examples

This document provides examples of how to use the cache invalidation service in your API routes to ensure cache consistency.

## Basic Usage

### Import the Service
```typescript
import { cacheInvalidation, CacheInvalidationUtils } from '@/lib/cache/invalidation-service';
```

## API Route Examples

### 1. Creating a New Job Readiness Product

```typescript
// app/api/admin/products/route.ts
import { NextResponse } from 'next/server';
import { CacheInvalidationUtils } from '@/lib/cache/invalidation-service';

export async function POST(request: Request) {
  try {
    const productData = await request.json();
    
    // Create the product in database
    const { data: product, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Invalidate related caches
    await CacheInvalidationUtils.onProductCreated(
      product.id, 
      productData.client_id
    );
    
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
```

### 2. Uploading Expert Session

```typescript
// app/api/admin/expert-sessions/route.ts
import { NextResponse } from 'next/server';
import { CacheInvalidationUtils } from '@/lib/cache/invalidation-service';

export async function POST(request: Request) {
  try {
    const sessionData = await request.json();
    
    // Create expert session
    const { data: session, error } = await supabase
      .from('job_readiness_expert_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Invalidate expert sessions cache
    await CacheInvalidationUtils.onExpertSessionModified(sessionData.product_id);
    
    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create expert session' }, { status: 500 });
  }
}
```

### 3. Updating Module Content

```typescript
// app/api/admin/modules/[moduleId]/route.ts
import { NextResponse } from 'next/server';
import { CacheInvalidationUtils } from '@/lib/cache/invalidation-service';

export async function PATCH(
  request: Request,
  { params }: { params: { moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;
    const updateData = await request.json();
    
    // Update module
    const { data: module, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Invalidate module content cache
    await CacheInvalidationUtils.onModuleContentModified(moduleId);
    
    return NextResponse.json({ success: true, module });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
  }
}
```

### 4. Updating Client Configuration

```typescript
// app/api/admin/clients/[clientId]/route.ts
import { NextResponse } from 'next/server';
import { CacheInvalidationUtils } from '@/lib/cache/invalidation-service';

export async function PATCH(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const updateData = await request.json();
    
    // Update client configuration
    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Invalidate client configuration cache
    await CacheInvalidationUtils.onClientConfigModified(clientId);
    
    return NextResponse.json({ success: true, client });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
```

## Advanced Usage

### Bulk Operations

```typescript
// app/api/admin/bulk-import/route.ts
import { NextResponse } from 'next/server';
import { CacheInvalidationUtils } from '@/lib/cache/invalidation-service';

export async function POST(request: Request) {
  try {
    const importData = await request.json();
    
    // Perform bulk data import
    // ... bulk insert operations ...
    
    // Invalidate all related caches after bulk operation
    await CacheInvalidationUtils.onBulkDataImport();
    
    return NextResponse.json({ success: true, imported: importData.length });
  } catch (error) {
    return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 });
  }
}
```

### Complex Product Creation with Multiple Resources

```typescript
// app/api/admin/products/complete/route.ts
import { NextResponse } from 'next/server';
import { cacheInvalidation } from '@/lib/cache/invalidation-service';

export async function POST(request: Request) {
  try {
    const { product, modules, expertSessions, clientId } = await request.json();
    
    // Create product
    const { data: createdProduct } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    // Create modules
    const { data: createdModules } = await supabase
      .from('modules')
      .insert(modules.map(m => ({ ...m, product_id: createdProduct.id })))
      .select();
    
    // Create expert sessions
    const { data: createdSessions } = await supabase
      .from('job_readiness_expert_sessions')
      .insert(expertSessions)
      .select();
    
    // Invalidate multiple related caches at once
    await cacheInvalidation.invalidateRelatedCaches({
      products: true,
      expertSessions: true,
      moduleContent: true,
      clientConfigs: true,
      clientId,
      productId: createdProduct.id
    });
    
    return NextResponse.json({ 
      success: true, 
      product: createdProduct,
      modules: createdModules,
      expertSessions: createdSessions
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create complete product' }, { status: 500 });
  }
}
```

## Monitoring Cache Performance

### Get Cache Statistics

```typescript
// app/api/admin/cache/stats/route.ts
import { NextResponse } from 'next/server';
import { cacheInvalidation } from '@/lib/cache/invalidation-service';

export async function GET() {
  try {
    const stats = await cacheInvalidation.getCacheInvalidationStats();
    
    return NextResponse.json({
      cache_stats: stats,
      recommendations: {
        hit_rate_status: stats.hitRate > 80 ? 'excellent' : stats.hitRate > 60 ? 'good' : 'needs_improvement',
        expired_entries_status: stats.expiredEntries > stats.totalEntries * 0.3 ? 'high' : 'normal'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get cache stats' }, { status: 500 });
  }
}
```

## Manual Cache Clearing

### Administrative Cache Management

```typescript
// app/api/admin/cache/clear/route.ts
import { NextResponse } from 'next/server';
import { cacheInvalidation } from '@/lib/cache/invalidation-service';

export async function POST(request: Request) {
  try {
    const { type, clientId, productId, moduleId } = await request.json();
    
    let invalidatedCount = 0;
    
    switch (type) {
      case 'products':
        invalidatedCount = await cacheInvalidation.invalidateJobReadinessProductsCache(clientId);
        break;
      case 'expert_sessions':
        invalidatedCount = await cacheInvalidation.invalidateExpertSessionsCache(productId);
        break;
      case 'module_content':
        invalidatedCount = await cacheInvalidation.invalidateModuleContentCache(moduleId);
        break;
      case 'client_configs':
        invalidatedCount = await cacheInvalidation.invalidateClientConfigurationsCache(clientId);
        break;
      case 'all_phase2':
        invalidatedCount = await cacheInvalidation.invalidatePhase2Cache();
        break;
      default:
        return NextResponse.json({ error: 'Invalid cache type' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      invalidated_entries: invalidatedCount,
      cache_type: type
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}
```

## Best Practices

### 1. **Always Invalidate After Mutations**
```typescript
// ✅ Good - Invalidate after successful database operation
const result = await supabase.from('products').insert(data);
if (!result.error) {
  await CacheInvalidationUtils.onProductCreated(result.data.id);
}

// ❌ Bad - No cache invalidation after mutation
const result = await supabase.from('products').insert(data);
```

### 2. **Use Specific Invalidation When Possible**
```typescript
// ✅ Good - Specific invalidation
await cacheInvalidation.invalidateModuleContentCache(moduleId);

// ❌ Bad - Broad invalidation when specific is possible
await cacheInvalidation.invalidatePhase2Cache();
```

### 3. **Handle Invalidation Errors Gracefully**
```typescript
try {
  const result = await supabase.from('products').insert(data);
  if (!result.error) {
    try {
      await CacheInvalidationUtils.onProductCreated(result.data.id);
    } catch (cacheError) {
      // Log cache invalidation error but don't fail the request
      console.error('Cache invalidation failed:', cacheError);
    }
  }
} catch (error) {
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
}
```

### 4. **Use Bulk Invalidation for Bulk Operations**
```typescript
// ✅ Good - Single bulk invalidation
await bulkInsertProducts(products);
await CacheInvalidationUtils.onBulkDataImport();

// ❌ Bad - Multiple individual invalidations in loop
for (const product of products) {
  await insertProduct(product);
  await CacheInvalidationUtils.onProductCreated(product.id); // Inefficient
}
```

## Automatic vs Manual Invalidation

### When to Use Each

**Automatic (Database Triggers):**
- ✅ Direct database operations via Supabase dashboard
- ✅ SQL scripts and migrations
- ✅ Background job operations
- ✅ Any non-API database modifications

**Manual (API Route Calls):**
- ✅ API route mutations
- ✅ Complex operations affecting multiple entities
- ✅ Bulk data operations
- ✅ When you need granular control over timing

## Troubleshooting

### Cache Not Invalidating
1. Check if the database trigger exists and is enabled
2. Verify the API route is calling the invalidation service
3. Check cache tags match between caching and invalidation
4. Monitor cache metrics to verify invalidation is working

### Performance Issues
1. Use specific invalidation instead of broad invalidation
2. Consider batching invalidations for bulk operations
3. Monitor cache hit rates to ensure invalidation isn't too aggressive
4. Use the cache statistics endpoint to identify issues 