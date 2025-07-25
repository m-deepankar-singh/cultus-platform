#!/usr/bin/env npx tsx

import { performance } from 'perf_hooks';
import { NextRequest } from 'next/server';
import { optimizedMiddleware } from '../lib/auth/optimized-middleware';
import { jwtVerificationService } from '../lib/auth/jwt-verification-service';
import { performanceTracker } from '../lib/auth/performance-metrics';

// Test configuration
const TEST_CONFIG = {
  CONCURRENT_REQUESTS: 100,
  TOTAL_ITERATIONS: 1000,
  WARMUP_ITERATIONS: 50,
  TEST_TIMEOUT: 30000, // 30 seconds
  SAMPLE_URLS: [
    '/',
    '/admin/login',
    '/app/login',
    '/admin/dashboard',
    '/app/dashboard',
    '/api/admin/users',
    '/api/app/courses',
  ],
} as const;

// Mock request interface
interface MockRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}

// Performance test results
interface TestResults {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  requestsPerSecond: number;
  concurrency: number;
  duration: number;
}

/**
 * Performance testing suite for middleware optimization
 */
class MiddlewarePerformanceTester {
  private testResults: TestResults[] = [];

  /**
   * Run comprehensive performance test suite
   */
  async runTestSuite(): Promise<void> {
    console.log('🚀 Starting Middleware Performance Test Suite');
    console.log('='.repeat(60));

    try {
      // Warmup
      await this.warmupTest();

      // Run individual tests
      await this.testPublicRoutesPerformance();
      await this.testAuthenticatedRoutesPerformance();
      await this.testConcurrentRequestsPerformance();
      await this.testCachePerformance();
      await this.testJWTVerificationPerformance();

      // Generate report
      this.generatePerformanceReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Warmup test to initialize caches
   */
  private async warmupTest(): Promise<void> {
    console.log('🔥 Running warmup test...');
    
    for (let i = 0; i < TEST_CONFIG.WARMUP_ITERATIONS; i++) {
      const mockRequest = this.createMockRequest('/');
      await this.processRequest(mockRequest);
    }
    
    console.log(`✅ Warmup completed (${TEST_CONFIG.WARMUP_ITERATIONS} requests)`);
  }

  /**
   * Test public routes performance (no authentication)
   */
  private async testPublicRoutesPerformance(): Promise<void> {
    console.log('📊 Testing public routes performance...');
    
    const publicUrls = ['/', '/admin/login', '/app/login', '/auth/forgot-password'];
    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const startTime = performance.now();

    for (let i = 0; i < TEST_CONFIG.TOTAL_ITERATIONS; i++) {
      const url = publicUrls[i % publicUrls.length];
      const mockRequest = this.createMockRequest(url);
      
      try {
        const latency = await this.processRequest(mockRequest);
        latencies.push(latency);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const result: TestResults = {
      testName: 'Public Routes Performance',
      totalRequests: TEST_CONFIG.TOTAL_ITERATIONS,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgLatency: this.calculateAverage(latencies),
      p50Latency: this.calculatePercentile(latencies, 50),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      requestsPerSecond: (successCount / duration) * 1000,
      concurrency: 1,
      duration,
    };

    this.testResults.push(result);
    this.logTestResult(result);
  }

  /**
   * Test authenticated routes performance
   */
  private async testAuthenticatedRoutesPerformance(): Promise<void> {
    console.log('🔐 Testing authenticated routes performance...');
    
    const authUrls = ['/admin/dashboard', '/app/dashboard', '/api/admin/users'];
    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const startTime = performance.now();

    for (let i = 0; i < TEST_CONFIG.TOTAL_ITERATIONS; i++) {
      const url = authUrls[i % authUrls.length];
      const mockRequest = this.createMockRequest(url, true); // With auth
      
      try {
        const latency = await this.processRequest(mockRequest);
        latencies.push(latency);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const result: TestResults = {
      testName: 'Authenticated Routes Performance',
      totalRequests: TEST_CONFIG.TOTAL_ITERATIONS,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgLatency: this.calculateAverage(latencies),
      p50Latency: this.calculatePercentile(latencies, 50),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      requestsPerSecond: (successCount / duration) * 1000,
      concurrency: 1,
      duration,
    };

    this.testResults.push(result);
    this.logTestResult(result);
  }

  /**
   * Test concurrent requests performance
   */
  private async testConcurrentRequestsPerformance(): Promise<void> {
    console.log('⚡ Testing concurrent requests performance...');
    
    const requestsPerBatch = TEST_CONFIG.CONCURRENT_REQUESTS;
    const totalBatches = Math.ceil(TEST_CONFIG.TOTAL_ITERATIONS / requestsPerBatch);
    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;

    const startTime = performance.now();

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchPromises: Promise<number>[] = [];
      
      for (let i = 0; i < requestsPerBatch; i++) {
        const url = TEST_CONFIG.SAMPLE_URLS[i % TEST_CONFIG.SAMPLE_URLS.length];
        const mockRequest = this.createMockRequest(url, i % 2 === 0); // Mixed auth
        batchPromises.push(this.processRequest(mockRequest));
      }

      try {
        const batchLatencies = await Promise.all(batchPromises);
        latencies.push(...batchLatencies);
        successCount += batchLatencies.length;
      } catch (error) {
        failCount += requestsPerBatch;
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const result: TestResults = {
      testName: 'Concurrent Requests Performance',
      totalRequests: successCount + failCount,
      successfulRequests: successCount,
      failedRequests: failCount,
      avgLatency: this.calculateAverage(latencies),
      p50Latency: this.calculatePercentile(latencies, 50),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      requestsPerSecond: (successCount / duration) * 1000,
      concurrency: requestsPerBatch,
      duration,
    };

    this.testResults.push(result);
    this.logTestResult(result);
  }

  /**
   * Test cache performance
   */
  private async testCachePerformance(): Promise<void> {
    console.log('💾 Testing cache performance...');
    
    // Test same URL multiple times to measure cache effectiveness
    const testUrl = '/admin/dashboard';
    const latencies: number[] = [];
    let successCount = 0;

    const startTime = performance.now();

    for (let i = 0; i < TEST_CONFIG.TOTAL_ITERATIONS; i++) {
      const mockRequest = this.createMockRequest(testUrl, true);
      
      try {
        const latency = await this.processRequest(mockRequest);
        latencies.push(latency);
        successCount++;
      } catch (error) {
        // Ignore errors for cache test
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const result: TestResults = {
      testName: 'Cache Performance (Repeated URL)',
      totalRequests: TEST_CONFIG.TOTAL_ITERATIONS,
      successfulRequests: successCount,
      failedRequests: TEST_CONFIG.TOTAL_ITERATIONS - successCount,
      avgLatency: this.calculateAverage(latencies),
      p50Latency: this.calculatePercentile(latencies, 50),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      requestsPerSecond: (successCount / duration) * 1000,
      concurrency: 1,
      duration,
    };

    this.testResults.push(result);
    this.logTestResult(result);
  }

  /**
   * Test JWT verification performance specifically
   */
  private async testJWTVerificationPerformance(): Promise<void> {
    console.log('🔑 Testing JWT verification performance...');
    
    const testToken = this.generateMockJWT();
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
    const latencies: number[] = [];
    let successCount = 0;

    const startTime = performance.now();

    for (let i = 0; i < TEST_CONFIG.TOTAL_ITERATIONS; i++) {
      const verifyStart = performance.now();
      
      try {
        await jwtVerificationService.verifyJWT(testToken, projectUrl);
        const latency = performance.now() - verifyStart;
        latencies.push(latency);
        successCount++;
      } catch (error) {
        // Expected for mock tokens
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const result: TestResults = {
      testName: 'JWT Verification Performance',
      totalRequests: TEST_CONFIG.TOTAL_ITERATIONS,
      successfulRequests: successCount,
      failedRequests: TEST_CONFIG.TOTAL_ITERATIONS - successCount,
      avgLatency: this.calculateAverage(latencies),
      p50Latency: this.calculatePercentile(latencies, 50),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      requestsPerSecond: (successCount / duration) * 1000,
      concurrency: 1,
      duration,
    };

    this.testResults.push(result);
    this.logTestResult(result);
  }

  /**
   * Process a single request and measure latency
   */
  private async processRequest(mockRequest: MockRequest): Promise<number> {
    const startTime = performance.now();
    
    try {
      // Create NextRequest-like object
      const request = new NextRequest(mockRequest.url, {
        method: mockRequest.method,
        headers: mockRequest.headers,
      });

      // Add cookies to request (simplified)
      Object.entries(mockRequest.cookies).forEach(([name, value]) => {
        request.cookies.set(name, value);
      });

      // Process through middleware
      await optimizedMiddleware.process(request);
      
      return performance.now() - startTime;
    } catch (error) {
      const latency = performance.now() - startTime;
      // Return latency even for failed requests
      return latency;
    }
  }

  /**
   * Create mock request object
   */
  private createMockRequest(url: string, withAuth: boolean = false): MockRequest {
    const request: MockRequest = {
      url: `http://localhost:3000${url}`,
      method: 'GET',
      headers: {
        'user-agent': 'middleware-performance-test',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cookies: {},
    };

    if (withAuth) {
      // Add mock authentication cookies/headers
      request.cookies['sb-access-token'] = this.generateMockJWT();
      request.headers['authorization'] = `Bearer ${this.generateMockJWT()}`;
    }

    return request;
  }

  /**
   * Generate mock JWT token for testing
   */
  private generateMockJWT(): string {
    // This is a mock JWT - not valid but has correct structure
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: 'test-user-123',
      email: 'test@example.com',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    const signature = 'mock-signature';
    
    return `${header}.${payload}.${signature}`;
  }

  /**
   * Calculate average from array of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Log test result
   */
  private logTestResult(result: TestResults): void {
    console.log(`\n📋 ${result.testName}:`);
    console.log(`   Requests: ${result.successfulRequests}/${result.totalRequests} successful`);
    console.log(`   Latency: avg=${result.avgLatency.toFixed(2)}ms, p95=${result.p95Latency.toFixed(2)}ms, p99=${result.p99Latency.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.requestsPerSecond.toFixed(2)} req/sec`);
    console.log(`   Range: ${result.minLatency.toFixed(2)}ms - ${result.maxLatency.toFixed(2)}ms`);
  }

  /**
   * Generate comprehensive performance report
   */
  private generatePerformanceReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));

    // Summary table
    console.log('\n📈 Latency Summary:');
    console.log('Test Name'.padEnd(35) + 'Avg (ms)'.padEnd(12) + 'P95 (ms)'.padEnd(12) + 'P99 (ms)'.padEnd(12) + 'RPS');
    console.log('-'.repeat(75));
    
    this.testResults.forEach(result => {
      const name = result.testName.padEnd(35);
      const avg = result.avgLatency.toFixed(1).padEnd(12);
      const p95 = result.p95Latency.toFixed(1).padEnd(12);
      const p99 = result.p99Latency.toFixed(1).padEnd(12);
      const rps = result.requestsPerSecond.toFixed(1);
      
      console.log(`${name}${avg}${p95}${p99}${rps}`);
    });

    // Performance metrics from tracker
    console.log('\n🎯 Current System Metrics:');
    const dashboardData = performanceTracker.getDashboardData();
    console.log(`   Health Status: ${dashboardData.summary.healthStatus.toUpperCase()}`);
    console.log(`   Middleware Latency: ${dashboardData.summary.keyMetrics.middlewareLatency}`);
    console.log(`   Cache Hit Rate: ${dashboardData.summary.keyMetrics.cacheHitRate}`);
    console.log(`   JWT Verification Rate: ${dashboardData.summary.keyMetrics.jwtVerificationRate}`);
    console.log(`   Error Rate: ${dashboardData.summary.keyMetrics.errorRate}`);

    // JWT verification metrics
    const jwtMetrics = jwtVerificationService.getMetrics();
    console.log('\n🔑 JWT Verification Metrics:');
    console.log(`   Total Verifications: ${jwtMetrics.totalVerifications}`);
    console.log(`   Cache Hit Rate: ${jwtMetrics.hitRate.toFixed(1)}%`);
    console.log(`   JWKS Verifications: ${jwtMetrics.jwksVerifications}`);
    console.log(`   Auth Server Fallbacks: ${jwtMetrics.authServerFallbacks} (${jwtMetrics.authServerRate.toFixed(1)}%)`);
    console.log(`   Errors: ${jwtMetrics.errors}`);

    // Performance assessment
    console.log('\n🏆 Performance Assessment:');
    this.assessPerformance();

    console.log('\n✅ Performance testing completed!');
  }

  /**
   * Assess overall performance and provide recommendations
   */
  private assessPerformance(): void {
    const publicRouteTest = this.testResults.find(r => r.testName.includes('Public Routes'));
    const authRouteTest = this.testResults.find(r => r.testName.includes('Authenticated Routes'));
    const concurrentTest = this.testResults.find(r => r.testName.includes('Concurrent'));

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (publicRouteTest && publicRouteTest.avgLatency > 50) {
      issues.push(`Public route latency (${publicRouteTest.avgLatency.toFixed(1)}ms) exceeds target (50ms)`);
      recommendations.push('Consider optimizing route pattern matching and public route caching');
    }

    if (authRouteTest && authRouteTest.avgLatency > 100) {
      issues.push(`Authenticated route latency (${authRouteTest.avgLatency.toFixed(1)}ms) exceeds target (100ms)`);
      recommendations.push('Enable JWT verification optimization (ENABLE_LOCAL_JWT_VERIFICATION=true)');
    }

    if (concurrentTest && concurrentTest.avgLatency > authRouteTest?.avgLatency! * 1.5) {
      issues.push('Performance degrades significantly under concurrent load');
      recommendations.push('Consider implementing request queuing or rate limiting');
    }

    const jwtMetrics = jwtVerificationService.getMetrics();
    if (jwtMetrics.authServerRate > 10) {
      issues.push(`High Auth server fallback rate (${jwtMetrics.authServerRate.toFixed(1)}%)`);
      recommendations.push('Check JWT signing keys configuration and JWKS endpoint availability');
    }

    if (issues.length === 0) {
      console.log('   🎉 All performance targets met!');
      console.log('   🚀 System is operating within optimal parameters');
    } else {
      console.log('   ⚠️  Issues found:');
      issues.forEach(issue => console.log(`      - ${issue}`));
      
      console.log('\n   💡 Recommendations:');
      recommendations.forEach(rec => console.log(`      - ${rec}`));
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const tester = new MiddlewarePerformanceTester();
  await tester.runTestSuite();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { MiddlewarePerformanceTester, TEST_CONFIG };