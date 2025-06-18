#!/usr/bin/env tsx

import { cacheManager, CacheUtils } from '../lib/cache/cache-manager';
import { enhancedCacheInvalidation } from '../lib/cache/invalidation-hooks';

interface PerformanceMetrics {
  operation: string;
  coldCallTimes: number[];
  warmCallTimes: number[];
  avgColdTime: number;
  avgWarmTime: number;
  speedupPercentage: number;
  cacheHitRate: number;
}

class CachePerformanceTester {
  private results: PerformanceMetrics[] = [];

  async testCachePerformance() {
    console.log('🚀 Starting comprehensive cache performance test...\n');
    
    // Test Expert Sessions Performance
    await this.testExpertSessionsPerformance();
    
    // Test Product Performance
    await this.testProductPerformanceCache();
    
    // Test Cache Invalidation Performance
    await this.testInvalidationPerformance();
    
    // Test Bulk Operations
    await this.testBulkOperations();
    
    // Test Cache Metrics Performance
    await this.testMetricsPerformance();
    
    // Generate summary report
    this.generatePerformanceReport();
  }

  private async testExpertSessionsPerformance() {
    console.log('📊 Testing Expert Sessions Cache Performance...');
    
    const iterations = 10;
    const coldCallTimes: number[] = [];
    const warmCallTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Clear cache for cold call
        await cacheManager.invalidateByTags(['expert_sessions']);
        
        // Cold call (cache miss)
        const coldStart = Date.now();
        await cacheManager.getCachedExpertSessions();
        const coldTime = Date.now() - coldStart;
        coldCallTimes.push(coldTime);
        
        // Warm call (cache hit)
        const warmStart = Date.now();
        await cacheManager.getCachedExpertSessions();
        const warmTime = Date.now() - warmStart;
        warmCallTimes.push(warmTime);
        
        // Brief delay to avoid overwhelming the system
        await this.sleep(100);
      } catch (error) {
        console.warn(`Iteration ${i + 1} failed:`, error);
      }
    }
    
    this.recordMetrics('Expert Sessions', coldCallTimes, warmCallTimes);
  }

  private async testProductPerformanceCache() {
    console.log('📊 Testing Product Performance Cache...');
    
    const iterations = 8;
    const coldCallTimes: number[] = [];
    const warmCallTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Clear cache for cold call
        await cacheManager.invalidateByTags(['product_performance']);
        
        // Cold call
        const coldStart = Date.now();
        await cacheManager.getCachedProductPerformance();
        const coldTime = Date.now() - coldStart;
        coldCallTimes.push(coldTime);
        
        // Warm call
        const warmStart = Date.now();
        await cacheManager.getCachedProductPerformance();
        const warmTime = Date.now() - warmStart;
        warmCallTimes.push(warmTime);
        
        await this.sleep(150);
      } catch (error) {
        console.warn(`Product performance test iteration ${i + 1} failed:`, error);
      }
    }
    
    this.recordMetrics('Product Performance', coldCallTimes, warmCallTimes);
  }

  private async testInvalidationPerformance() {
    console.log('📊 Testing Cache Invalidation Performance...');
    
    const iterations = 20;
    const invalidationTimes: number[] = [];
    const cascadeInvalidationTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Test simple invalidation
        const start1 = Date.now();
        await cacheManager.invalidateByTags(['test_invalidation']);
        const time1 = Date.now() - start1;
        invalidationTimes.push(time1);
        
        // Test cascade invalidation
        const start2 = Date.now();
        await enhancedCacheInvalidation.cascadeInvalidation('expert_session', 'test-session', 'update');
        const time2 = Date.now() - start2;
        cascadeInvalidationTimes.push(time2);
        
        await this.sleep(50);
      } catch (error) {
        console.warn(`Invalidation test iteration ${i + 1} failed:`, error);
      }
    }
    
    const avgInvalidation = this.calculateAverage(invalidationTimes);
    const avgCascade = this.calculateAverage(cascadeInvalidationTimes);
    
    console.log(`   Simple Invalidation: ${avgInvalidation.toFixed(1)}ms average`);
    console.log(`   Cascade Invalidation: ${avgCascade.toFixed(1)}ms average`);
  }

  private async testBulkOperations() {
    console.log('📊 Testing Bulk Cache Operations...');
    
    const bulkSizes = [10, 50, 100];
    
    for (const size of bulkSizes) {
      try {
        // Test bulk invalidation
        const tags = Array.from({ length: size }, (_, i) => `bulk_test_${i}`);
        
        const start = Date.now();
        await cacheManager.invalidateByTags(tags);
        const time = Date.now() - start;
        
        console.log(`   Bulk invalidation (${size} tags): ${time}ms`);
        
        await this.sleep(100);
      } catch (error) {
        console.warn(`Bulk test for size ${size} failed:`, error);
      }
    }
  }

  private async testMetricsPerformance() {
    console.log('📊 Testing Cache Metrics Performance...');
    
    const iterations = 5;
    const metricsTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const start = Date.now();
        await cacheManager.getCacheMetrics();
        const time = Date.now() - start;
        metricsTimes.push(time);
        
        await this.sleep(200);
      } catch (error) {
        console.warn(`Metrics test iteration ${i + 1} failed:`, error);
      }
    }
    
    const avgMetrics = this.calculateAverage(metricsTimes);
    console.log(`   Cache Metrics Query: ${avgMetrics.toFixed(1)}ms average`);
  }

  private recordMetrics(operation: string, coldTimes: number[], warmTimes: number[]) {
    if (coldTimes.length === 0 || warmTimes.length === 0) {
      console.warn(`❌ No data collected for ${operation}`);
      return;
    }

    const avgColdTime = this.calculateAverage(coldTimes);
    const avgWarmTime = this.calculateAverage(warmTimes);
    const speedupPercentage = ((avgColdTime - avgWarmTime) / avgColdTime * 100);
    const cacheHitRate = warmTimes.length / (coldTimes.length + warmTimes.length) * 100;

    const metrics: PerformanceMetrics = {
      operation,
      coldCallTimes: coldTimes,
      warmCallTimes: warmTimes,
      avgColdTime,
      avgWarmTime,
      speedupPercentage,
      cacheHitRate
    };

    this.results.push(metrics);
    
    console.log(`   Cold calls: ${avgColdTime.toFixed(1)}ms average`);
    console.log(`   Warm calls: ${avgWarmTime.toFixed(1)}ms average`);
    console.log(`   Speedup: ${speedupPercentage.toFixed(1)}% faster with cache\n`);
  }

  private calculateAverage(times: number[]): number {
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private async generatePerformanceReport() {
    console.log('📈 Cache Performance Summary Report');
    console.log('=====================================\n');
    
    try {
      // Get current cache metrics
      const metrics = await cacheManager.getCacheMetrics();
      
      if (metrics) {
        console.log('📊 Current Cache State:');
        console.log(`   Total Entries: ${metrics.total_entries}`);
        console.log(`   Reused Entries: ${metrics.reused_entries}`);
        console.log(`   Hit Rate: ${((metrics.reused_entries / metrics.total_entries) * 100).toFixed(1)}%`);
        console.log(`   Average Hits per Entry: ${metrics.average_hits?.toFixed(1) || 'N/A'}`);
        console.log(`   Max Hits: ${metrics.max_hits}`);
        console.log(`   Expired Entries: ${metrics.expired_entries}\n`);
      }
      
      // Performance comparison
      console.log('⚡ Performance Results by Operation:');
      this.results.forEach(result => {
        console.log(`\n${result.operation}:`);
        console.log(`  🐌 Cold (no cache): ${result.avgColdTime.toFixed(1)}ms`);
        console.log(`  🚀 Warm (cached): ${result.avgWarmTime.toFixed(1)}ms`);
        console.log(`  📈 Performance gain: ${result.speedupPercentage.toFixed(1)}%`);
        console.log(`  🎯 Cache reliability: ${result.cacheHitRate.toFixed(1)}%`);
      });
      
      // Overall statistics
      const overallSpeedup = this.results.reduce((sum, r) => sum + r.speedupPercentage, 0) / this.results.length;
      const overallHitRate = this.results.reduce((sum, r) => sum + r.cacheHitRate, 0) / this.results.length;
      
      console.log('\n🎯 Overall Performance:');
      console.log(`   Average Speedup: ${overallSpeedup.toFixed(1)}%`);
      console.log(`   Average Hit Rate: ${overallHitRate.toFixed(1)}%`);
      
      // Recommendations
      console.log('\n💡 Recommendations:');
      if (overallSpeedup > 70) {
        console.log('   ✅ Excellent cache performance! System is well-optimized.');
      } else if (overallSpeedup > 50) {
        console.log('   ⚠️  Good cache performance. Consider optimizing cache durations.');
      } else {
        console.log('   ❌ Cache performance needs improvement. Review cache strategy.');
      }
      
      if (overallHitRate > 90) {
        console.log('   ✅ Excellent cache hit rate! Cache invalidation is working well.');
      } else if (overallHitRate > 70) {
        console.log('   ⚠️  Good hit rate. Monitor cache invalidation patterns.');
      } else {
        console.log('   ❌ Low hit rate. Review cache invalidation frequency.');
      }
      
    } catch (error) {
      console.error('❌ Error generating performance report:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  try {
    const tester = new CachePerformanceTester();
    await tester.testCachePerformance();
    
    console.log('\n✅ Cache performance testing completed!');
    console.log('📄 Results saved to performance metrics above.');
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CachePerformanceTester }; 