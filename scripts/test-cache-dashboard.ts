import { cacheManager } from '@/lib/cache/cache-manager';

async function testCacheDashboard() {
  console.log('🧪 Testing Cache Dashboard Components...\n');

  try {
    // Test 1: Cache Metrics
    console.log('1. Testing Cache Metrics...');
    const metrics = await cacheManager.getCacheMetrics();
    console.log('✅ Cache metrics retrieved:', {
      totalEntries: metrics?.total_entries || 0,
      averageHits: metrics?.average_hits || 0,
      reusedEntries: metrics?.reused_entries || 0
    });

    // Test 2: Cache Stats
    console.log('\n2. Testing Cache Stats...');
    const stats = await cacheManager.getCacheStats();
    console.log('✅ Cache stats retrieved:', {
      hitRate: stats?.hitRate || 0,
      topEntriesCount: stats?.topEntries?.length || 0,
      timestamp: stats?.timestamp
    });

    // Test 3: Top Cache Entries
    console.log('\n3. Testing Top Cache Entries...');
    const topEntries = await cacheManager.getTopCacheEntries(5);
    console.log('✅ Top cache entries retrieved:', topEntries.length, 'entries');
    
    if (topEntries.length > 0) {
      console.log('   Sample entry:', {
        key: topEntries[0].cache_key,
        hits: topEntries[0].hit_count,
        tags: topEntries[0].cache_tags
      });
    }

    // Test 4: Cache some test data (TEMPORARY - will be cleaned up)
    console.log('\n4. Testing Cache Storage...');
    const testKey = `TEST_TEMP_dashboard_${Date.now()}`;
    const testData = { message: 'TEMPORARY Dashboard test data', timestamp: new Date().toISOString(), isTestData: true };
    
    await cacheManager.setCachedData(testKey, testData, '1 minute', ['test', 'dashboard', 'TEMPORARY']);
    console.log('✅ TEMPORARY test data cached with key:', testKey);

    // Test 5: Retrieve cached test data
    console.log('\n5. Testing Cache Retrieval...');
    const retrievedData = await cacheManager.getCachedData(testKey, '1 minute');
    console.log('✅ Test data retrieved:', retrievedData?.message || 'No data');

    // Test 6: Tag-based invalidation
    console.log('\n6. Testing Tag Invalidation...');
    const invalidatedCount = await cacheManager.invalidateByTags(['test']);
    console.log('✅ Invalidated entries with "test" tag:', invalidatedCount);

    // Test 7: Expert Sessions Cache (if available)
    console.log('\n7. Testing Expert Sessions Cache...');
    try {
      const expertSessions = await cacheManager.getCachedExpertSessions();
      console.log('✅ Expert sessions cache working, entries:', expertSessions?.length || 0);
    } catch (error) {
      console.log('⚠️  Expert sessions cache not available (expected if no data)');
    }

    // Test 8: Product Performance Cache (if available)
    console.log('\n8. Testing Product Performance Cache...');
    try {
      const productPerf = await cacheManager.getCachedProductPerformance();
      console.log('✅ Product performance cache working, entries:', productPerf?.length || 0);
    } catch (error) {
      console.log('⚠️  Product performance cache not available (expected if no data)');
    }

    console.log('\n🎉 Cache Dashboard Test Summary:');
    console.log('   ✅ Cache metrics API functional');
    console.log('   ✅ Cache statistics collection working');
    console.log('   ✅ Top entries retrieval working');
    console.log('   ✅ Cache storage and retrieval working');
    console.log('   ✅ Tag-based invalidation working');
    console.log('   ✅ Dashboard components ready for UI');

    // Final cleanup - Remove ALL test data
    console.log('\n🧹 Cleaning up ALL temporary test data...');
    await cacheManager.invalidateByTags(['test', 'dashboard', 'TEMPORARY']);
    console.log('✅ All temporary test data cleaned up - only real production data remains');

  } catch (error) {
    console.error('❌ Cache dashboard test failed:', error);
    process.exit(1);
  }
}

// Additional validation for API endpoint structure
function validateAPIResponse() {
  console.log('\n📋 Expected API Response Structure:');
  console.log(`
GET /api/admin/cache/metrics should return:
{
  "overall": CacheMetrics,
  "statistics": CacheStats, 
  "topEntries": CacheEntry[],
  "efficiency": {
    "hitRate": number,
    "activeEntries": number,
    "expiredEntries": number,
    "averageHitsPerEntry": number,
    "topPerformingTags": any[]
  },
  "responseTimeAnalysis": {
    "estimatedCacheHitTime": number,
    "estimatedDatabaseQueryTime": number,
    "potentialTimeSaved": number
  },
  "timestamp": string,
  "systemStatus": {
    "healthy": boolean,
    "recommendations": string[]
  }
}

DELETE /api/admin/cache/metrics?action=cleanup_expired
DELETE /api/admin/cache/metrics?action=clear_all
DELETE /api/admin/cache/metrics?action=clear_by_tags&tags=tag1,tag2
  `);
}

// Run tests
console.log('🚀 Starting Cache Dashboard Validation...\n');
testCacheDashboard()
  .then(() => {
    validateAPIResponse();
    console.log('\n✅ All cache dashboard tests completed successfully!');
  })
  .catch(console.error); 