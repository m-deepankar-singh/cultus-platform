#!/usr/bin/env tsx

import { cacheManager } from '../lib/cache/cache-manager';

interface LoadTestConfig {
  concurrentRequests: number;
  totalRequests: number;
  operationType: 'expert_sessions' | 'product_performance' | 'mixed';
  cacheInvalidationFrequency: number; // Every N requests
}

interface LoadTestResults {
  totalTime: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  cacheHitRate: number;
  errorRate: number;
  fastestRequest: number;
  slowestRequest: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

class CacheLoadTester {
  private responseTimes: number[] = [];
  private errors: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
    console.log('🔥 Starting cache load test...');
    console.log(`📊 Configuration:`);
    console.log(`   Concurrent Requests: ${config.concurrentRequests}`);
    console.log(`   Total Requests: ${config.totalRequests}`);
    console.log(`   Operation Type: ${config.operationType}`);
    console.log(`   Cache Invalidation: Every ${config.cacheInvalidationFrequency} requests\n`);

    this.resetCounters();
    const startTime = Date.now();

    const promises: Promise<void>[] = [];
    let completedRequests = 0;

    for (let i = 0; i < config.totalRequests; i++) {
      // Add cache invalidation at specified intervals
      if (i > 0 && i % config.cacheInvalidationFrequency === 0) {
        promises.push(this.invalidateCache(config.operationType));
      }

      // Add the main request
      promises.push(this.makeRequest(config.operationType, i));

      // Process requests in batches
      if (promises.length >= config.concurrentRequests || i === config.totalRequests - 1) {
        await Promise.allSettled(promises);
        completedRequests += promises.length;
        promises.length = 0;

        // Progress reporting
        const progress = (completedRequests / config.totalRequests * 100).toFixed(1);
        process.stdout.write(`\r🔄 Progress: ${progress}% (${completedRequests}/${config.totalRequests})`);
      }
    }

    console.log('\n'); // New line after progress

    const totalTime = Date.now() - startTime;
    return this.calculateResults(totalTime, config.totalRequests);
  }

  private async makeRequest(operationType: string, requestIndex: number): Promise<void> {
    const requestStart = Date.now();
    
    try {
      let result: any;
      
      switch (operationType) {
        case 'expert_sessions':
          result = await cacheManager.getCachedExpertSessions();
          break;
        case 'product_performance':
          result = await cacheManager.getCachedProductPerformance();
          break;
        case 'mixed':
          // Alternate between different operations
          if (requestIndex % 2 === 0) {
            result = await cacheManager.getCachedExpertSessions();
          } else {
            result = await cacheManager.getCachedProductPerformance();
          }
          break;
        default:
          throw new Error(`Unknown operation type: ${operationType}`);
      }

      const responseTime = Date.now() - requestStart;
      this.responseTimes.push(responseTime);

      // Determine if this was a cache hit or miss based on response time
      // Fast responses (< 50ms) are likely cache hits
      if (responseTime < 50) {
        this.cacheHits++;
      } else {
        this.cacheMisses++;
      }

    } catch (error) {
      this.errors++;
      const responseTime = Date.now() - requestStart;
      this.responseTimes.push(responseTime);
      
      if (this.errors <= 5) { // Only log first few errors to avoid spam
        console.warn(`❌ Request ${requestIndex} failed:`, error);
      }
    }
  }

  private async invalidateCache(operationType: string): Promise<void> {
    try {
      switch (operationType) {
        case 'expert_sessions':
          await cacheManager.invalidateByTags(['expert_sessions']);
          break;
        case 'product_performance':
          await cacheManager.invalidateByTags(['product_performance']);
          break;
        case 'mixed':
          await cacheManager.invalidateByTags(['expert_sessions', 'product_performance']);
          break;
      }
    } catch (error) {
      console.warn('⚠️  Cache invalidation failed:', error);
    }
  }

  private resetCounters(): void {
    this.responseTimes = [];
    this.errors = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  private calculateResults(totalTime: number, totalRequests: number): LoadTestResults {
    this.responseTimes.sort((a, b) => a - b);
    
    const averageResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    const requestsPerSecond = (totalRequests / totalTime) * 1000;
    const cacheHitRate = (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100;
    const errorRate = (this.errors / totalRequests) * 100;

    return {
      totalTime,
      averageResponseTime,
      requestsPerSecond,
      cacheHitRate,
      errorRate,
      fastestRequest: this.responseTimes[0] || 0,
      slowestRequest: this.responseTimes[this.responseTimes.length - 1] || 0,
      percentiles: {
        p50: this.getPercentile(50),
        p90: this.getPercentile(90),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
      }
    };
  }

  private getPercentile(percentile: number): number {
    const index = Math.ceil((percentile / 100) * this.responseTimes.length) - 1;
    return this.responseTimes[index] || 0;
  }

  private printResults(results: LoadTestResults, config: LoadTestConfig): void {
    console.log('\n📈 Load Test Results Summary');
    console.log('============================');
    
    console.log('\n⏱️  Timing Metrics:');
    console.log(`   Total Test Time: ${results.totalTime}ms (${(results.totalTime / 1000).toFixed(1)}s)`);
    console.log(`   Average Response Time: ${results.averageResponseTime.toFixed(1)}ms`);
    console.log(`   Requests per Second: ${results.requestsPerSecond.toFixed(1)}`);
    console.log(`   Fastest Request: ${results.fastestRequest}ms`);
    console.log(`   Slowest Request: ${results.slowestRequest}ms`);

    console.log('\n📊 Performance Percentiles:');
    console.log(`   50th percentile: ${results.percentiles.p50}ms`);
    console.log(`   90th percentile: ${results.percentiles.p90}ms`);
    console.log(`   95th percentile: ${results.percentiles.p95}ms`);
    console.log(`   99th percentile: ${results.percentiles.p99}ms`);

    console.log('\n🎯 Cache Performance:');
    console.log(`   Cache Hit Rate: ${results.cacheHitRate.toFixed(1)}%`);
    console.log(`   Cache Hits: ${this.cacheHits}`);
    console.log(`   Cache Misses: ${this.cacheMisses}`);

    console.log('\n❌ Error Metrics:');
    console.log(`   Error Rate: ${results.errorRate.toFixed(2)}%`);
    console.log(`   Total Errors: ${this.errors}`);

    console.log('\n💡 Analysis:');
    if (results.requestsPerSecond > 100) {
      console.log('   ✅ Excellent throughput! Cache is handling load well.');
    } else if (results.requestsPerSecond > 50) {
      console.log('   ⚠️  Good throughput. Consider optimization for higher loads.');
    } else {
      console.log('   ❌ Low throughput. Cache may need optimization.');
    }

    if (results.cacheHitRate > 80) {
      console.log('   ✅ Excellent cache hit rate! Cache invalidation strategy is working well.');
    } else if (results.cacheHitRate > 60) {
      console.log('   ⚠️  Good cache hit rate. Monitor invalidation frequency.');
    } else {
      console.log('   ❌ Low cache hit rate. Review cache duration and invalidation strategy.');
    }

    if (results.errorRate < 1) {
      console.log('   ✅ Low error rate. System is stable under load.');
    } else if (results.errorRate < 5) {
      console.log('   ⚠️  Moderate error rate. Monitor system stability.');
    } else {
      console.log('   ❌ High error rate. System may be overloaded.');
    }

    if (results.percentiles.p95 < 100) {
      console.log('   ✅ Excellent response time consistency.');
    } else if (results.percentiles.p95 < 500) {
      console.log('   ⚠️  Good response time consistency.');
    } else {
      console.log('   ❌ High response time variance. Check for bottlenecks.');
    }
  }

  async runMultipleTests(): Promise<void> {
    const testConfigs: LoadTestConfig[] = [
      {
        concurrentRequests: 10,
        totalRequests: 100,
        operationType: 'expert_sessions',
        cacheInvalidationFrequency: 25
      },
      {
        concurrentRequests: 25,
        totalRequests: 200,
        operationType: 'product_performance',
        cacheInvalidationFrequency: 50
      },
      {
        concurrentRequests: 50,
        totalRequests: 500,
        operationType: 'mixed',
        cacheInvalidationFrequency: 100
      }
    ];

    for (let i = 0; i < testConfigs.length; i++) {
      const config = testConfigs[i];
      console.log(`\n🔬 Running Test ${i + 1}/${testConfigs.length}: ${config.operationType.toUpperCase()}`);
      
      try {
        const results = await this.runLoadTest(config);
        this.printResults(results, config);
        
        // Wait between tests to let system stabilize
        if (i < testConfigs.length - 1) {
          console.log('\n⏸️  Waiting 5 seconds before next test...');
          await this.sleep(5000);
        }
      } catch (error) {
        console.error(`❌ Test ${i + 1} failed:`, error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  try {
    const tester = new CacheLoadTester();
    
    console.log('🚀 Starting comprehensive cache load testing...');
    console.log('This will test cache performance under various load conditions.\n');
    
    await tester.runMultipleTests();
    
    console.log('\n✅ All load tests completed!');
    console.log('📊 Review the results above to assess cache performance under load.');
    
  } catch (error) {
    console.error('❌ Load testing failed:', error);
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

export { CacheLoadTester }; 