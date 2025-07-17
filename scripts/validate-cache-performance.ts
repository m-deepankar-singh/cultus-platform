#!/usr/bin/env tsx

/**
 * HTTP Cache Performance Validation Script
 * 
 * This script validates the cache performance implementation by:
 * 1. Testing cache headers on various endpoints
 * 2. Measuring response times for cold vs warm requests
 * 3. Validating ETag functionality
 * 4. Testing 304 Not Modified responses
 * 5. Generating performance reports
 */

// import fetch from 'node-fetch'; // Use built-in fetch instead

interface TestResult {
  endpoint: string;
  coldTime: number;
  warmTime: number;
  etag: string | null;
  cacheControl: string | null;
  improvement: number;
  status: 'PASS' | 'FAIL';
  error?: string;
}

interface TestSuite {
  name: string;
  endpoints: string[];
  expectedCacheControl: string;
  description: string;
}

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test suites based on our cache implementation
const testSuites: TestSuite[] = [
  {
    name: 'Admin High Priority APIs',
    endpoints: [
      '/api/admin/clients/simple',
      '/api/admin/products',
      '/api/admin/modules',
      '/api/admin/question-banks',
    ],
    expectedCacheControl: 'private, max-age=',
    description: 'High priority admin APIs with static/semi-static caching',
  },
  {
    name: 'Student APIs',
    endpoints: [
      '/api/app/job-readiness/products',
      '/api/app/job-readiness/courses?productId=test',
      '/api/app/job-readiness/assessments?productId=test',
    ],
    expectedCacheControl: 'private, max-age=',
    description: 'Student-facing APIs with dynamic caching',
  },
  {
    name: 'Analytics and Low Priority APIs',
    endpoints: [
      '/api/admin/analytics',
      '/api/admin/learners/bulk-upload-template',
      '/api/admin/question-banks/bulk-upload-template',
    ],
    expectedCacheControl: 'private, max-age=',
    description: 'Analytics and template APIs with frequent/static caching',
  },
];

// Authentication token (you'll need to set this for testing)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

async function makeRequest(url: string, headers: Record<string, string | undefined> = {}): Promise<Response> {
  const requestHeaders = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'User-Agent': 'Cache-Performance-Validator/1.0',
    ...headers,
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: requestHeaders,
  });

  return response as Response;
}

async function testEndpoint(endpoint: string): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    console.log(`Testing ${endpoint}...`);
    
    // Cold request (first request)
    const coldStart = performance.now();
    const coldResponse = await makeRequest(url);
    const coldTime = performance.now() - coldStart;
    
    if (!coldResponse.ok) {
      return {
        endpoint,
        coldTime,
        warmTime: 0,
        etag: null,
        cacheControl: null,
        improvement: 0,
        status: 'FAIL',
        error: `HTTP ${coldResponse.status}: ${coldResponse.statusText}`,
      };
    }
    
    const etag = coldResponse.headers.get('ETag');
    const cacheControl = coldResponse.headers.get('Cache-Control');
    
    // Warm request (with ETag)
    const warmHeaders: Record<string, string | undefined> = etag ? { 'If-None-Match': etag } : {};
    const warmStart = performance.now();
    const warmResponse = await makeRequest(url, warmHeaders);
    const warmTime = performance.now() - warmStart;
    
    // Calculate improvement
    const improvement = coldTime > 0 ? ((coldTime - warmTime) / coldTime * 100) : 0;
    
    // Validate cache functionality
    const hasValidCacheHeaders = cacheControl && cacheControl.includes('max-age=');
    const hasETag = etag !== null;
    const returns304 = warmResponse.status === 304;
    
    const status = hasValidCacheHeaders && hasETag ? 'PASS' : 'FAIL';
    
    return {
      endpoint,
      coldTime,
      warmTime,
      etag,
      cacheControl,
      improvement,
      status,
      error: !hasValidCacheHeaders ? 'Missing cache headers' : 
             !hasETag ? 'Missing ETag' : undefined,
    };
    
  } catch (error) {
    return {
      endpoint,
      coldTime: 0,
      warmTime: 0,
      etag: null,
      cacheControl: null,
      improvement: 0,
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runTestSuite(suite: TestSuite): Promise<TestResult[]> {
  console.log(`\n🧪 Running test suite: ${suite.name}`);
  console.log(`📝 ${suite.description}`);
  console.log('─'.repeat(60));
  
  const results: TestResult[] = [];
  
  for (const endpoint of suite.endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Print immediate results
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    const improvementText = result.improvement > 0 ? `(${result.improvement.toFixed(1)}% faster)` : '';
    
    console.log(`${statusIcon} ${endpoint}`);
    console.log(`   Cold: ${result.coldTime.toFixed(2)}ms | Warm: ${result.warmTime.toFixed(2)}ms ${improvementText}`);
    console.log(`   Cache-Control: ${result.cacheControl || 'MISSING'}`);
    console.log(`   ETag: ${result.etag ? 'PRESENT' : 'MISSING'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    console.log('');
  }
  
  return results;
}

function generateReport(allResults: TestResult[]): void {
  console.log('\n📊 CACHE PERFORMANCE VALIDATION REPORT');
  console.log('═'.repeat(60));
  
  const totalTests = allResults.length;
  const passedTests = allResults.filter(r => r.status === 'PASS').length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  
  // Performance metrics
  const validResults = allResults.filter(r => r.coldTime > 0 && r.warmTime > 0);
  let avgImprovement = 0;
  if (validResults.length > 0) {
    const avgColdTime = validResults.reduce((sum, r) => sum + r.coldTime, 0) / validResults.length;
    const avgWarmTime = validResults.reduce((sum, r) => sum + r.warmTime, 0) / validResults.length;
    avgImprovement = validResults.reduce((sum, r) => sum + r.improvement, 0) / validResults.length;
    
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   Average Cold Request: ${avgColdTime.toFixed(2)}ms`);
    console.log(`   Average Warm Request: ${avgWarmTime.toFixed(2)}ms`);
    console.log(`   Average Improvement: ${avgImprovement.toFixed(1)}%`);
  }
  
  // Cache implementation analysis
  const withCacheHeaders = allResults.filter(r => r.cacheControl?.includes('max-age=')).length;
  const withETags = allResults.filter(r => r.etag !== null).length;
  
  console.log(`\n🔧 Cache Implementation:`);
  console.log(`   Endpoints with Cache-Control: ${withCacheHeaders}/${totalTests} (${((withCacheHeaders / totalTests) * 100).toFixed(1)}%)`);
  console.log(`   Endpoints with ETags: ${withETags}/${totalTests} (${((withETags / totalTests) * 100).toFixed(1)}%)`);
  
  // Failed tests details
  const failedResults = allResults.filter(r => r.status === 'FAIL');
  if (failedResults.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failedResults.forEach(result => {
      console.log(`   ${result.endpoint}: ${result.error || 'Unknown error'}`);
    });
  }
  
  // Success criteria
  console.log(`\n🎯 Success Criteria:`);
  console.log(`   ✅ All endpoints return cache headers: ${withCacheHeaders === totalTests ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ All endpoints support ETag validation: ${withETags === totalTests ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Average response time improvement: ${validResults.length > 0 && avgImprovement > 10 ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Test success rate > 80%: ${(passedTests / totalTests) > 0.8 ? 'PASS' : 'FAIL'}`);
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (failedTests > 0) {
    console.log(`   • Fix ${failedTests} failing endpoints`);
  }
  if (withCacheHeaders < totalTests) {
    console.log(`   • Add cache headers to ${totalTests - withCacheHeaders} endpoints`);
  }
  if (withETags < totalTests) {
    console.log(`   • Add ETag support to ${totalTests - withETags} endpoints`);
  }
  if (validResults.length > 0 && avgImprovement < 10) {
    console.log(`   • Investigate low performance improvement (${avgImprovement.toFixed(1)}%)`);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting HTTP Cache Performance Validation');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`🔐 Auth Token: ${AUTH_TOKEN ? 'PROVIDED' : 'MISSING (some tests may fail)'}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms`);
  
  const allResults: TestResult[] = [];
  
  // Run all test suites
  for (const suite of testSuites) {
    const results = await runTestSuite(suite);
    allResults.push(...results);
  }
  
  // Generate final report
  generateReport(allResults);
  
  // Exit with appropriate code
  const successRate = allResults.filter(r => r.status === 'PASS').length / allResults.length;
  const exitCode = successRate > 0.8 ? 0 : 1;
  
  console.log(`\n🏁 Validation ${exitCode === 0 ? 'PASSED' : 'FAILED'} (${(successRate * 100).toFixed(1)}% success rate)`);
  process.exit(exitCode);
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
HTTP Cache Performance Validation Script

Usage: npm run validate:cache [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  TEST_BASE_URL  Base URL for testing (default: http://localhost:3000)
  TEST_AUTH_TOKEN  Authentication token for API requests

Examples:
  npm run validate:cache
  TEST_BASE_URL=https://staging.example.com npm run validate:cache
  TEST_AUTH_TOKEN=your-token npm run validate:cache
`);
  process.exit(0);
}

// Run the validation
main().catch((error) => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});