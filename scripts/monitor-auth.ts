#!/usr/bin/env tsx

/**
 * Authentication Performance Monitoring Script
 * 
 * Usage:
 *   pnpm tsx scripts/monitor-auth.ts
 *   pnpm tsx scripts/monitor-auth.ts --watch
 *   pnpm tsx scripts/monitor-auth.ts --detailed
 */

import { createClient } from '@supabase/supabase-js';
import { authCacheManager } from '../lib/auth/auth-cache-manager';
import { cachedRoleService } from '../lib/auth/cached-role-service';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

async function getDatabaseMetrics() {
  try {
    // Get RPC function stats
    const { data: rpcStats, error: rpcError } = await supabase.rpc('get_auth_performance_stats');
    
    // Get materialized view row count
    const { count: cacheCount, error: cacheError } = await supabase
      .from('user_auth_cache')
      .select('*', { count: 'exact', head: true });

    // Get recent cache entries
    const { data: recentEntries, error: recentError } = await supabase
      .from('user_auth_cache')
      .select('cached_at')
      .gte('cached_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);

    return {
      rpcStats: rpcStats || [],
      totalCached: cacheCount || 0,
      hasRecentEntries: (recentEntries?.length || 0) > 0,
      errors: { rpcError, cacheError, recentError }
    };
  } catch (error) {
    console.error('Database metrics error:', error);
    return {
      rpcStats: [],
      totalCached: 0,
      hasRecentEntries: false,
      errors: { error }
    };
  }
}

async function getRedisMetrics() {
  try {
    const cacheMetrics = authCacheManager.getMetrics();
    const roleMetrics = cachedRoleService.getMetrics();
    const healthCheck = await authCacheManager.healthCheck();

    return {
      cacheHits: cacheMetrics.cache_hits + roleMetrics.cache_hits,
      cacheMisses: cacheMetrics.cache_misses + roleMetrics.cache_misses,
      hitRate: cacheMetrics.hit_rate,
      avgResponseTime: cacheMetrics.average_response_time,
      databaseFallbacks: cacheMetrics.database_fallbacks,
      redisHealthy: healthCheck.redis,
      errors: []
    };
  } catch (error) {
    console.error('Redis metrics error:', error);
    return {
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      databaseFallbacks: 0,
      redisHealthy: false,
      errors: [error]
    };
  }
}

function printHeader() {
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log(colorize('🚀 Authentication Performance Monitor - Phase 2', 'bright'));
  console.log(colorize('   Redis + RPC Hybrid Implementation', 'blue'));
  console.log(colorize('═'.repeat(80), 'cyan'));
  console.log();
}

function printDatabaseMetrics(metrics: any) {
  console.log(colorize('📊 Database Performance', 'bright'));
  console.log(colorize('─'.repeat(40), 'blue'));
  
  if (metrics.rpcStats.length > 0) {
    const stat = metrics.rpcStats[0];
    console.log(`Function: ${colorize(stat.function_name, 'cyan')}`);
    console.log(`Total Calls: ${colorize(formatNumber(stat.total_calls), 'green')}`);
    console.log(`Avg Execution Time: ${colorize(formatTime(stat.avg_execution_time), 'yellow')}`);
    console.log(`Cache Hit Ratio: ${colorize(formatPercentage(stat.cache_hit_ratio), 'green')}`);
  } else {
    console.log(colorize('⚠️  No RPC stats available', 'yellow'));
  }
  
  console.log(`Users Cached: ${colorize(formatNumber(metrics.totalCached), 'green')}`);
  console.log(`Cache Freshness: ${colorize(metrics.hasRecentEntries ? '✅ Fresh' : '❌ Stale', metrics.hasRecentEntries ? 'green' : 'red')}`);
  console.log();
}

function printRedisMetrics(metrics: any) {
  console.log(colorize('⚡ Redis Cache Performance', 'bright'));
  console.log(colorize('─'.repeat(40), 'blue'));
  
  console.log(`Redis Health: ${colorize(metrics.redisHealthy ? '✅ Healthy' : '❌ Unhealthy', metrics.redisHealthy ? 'green' : 'red')}`);
  console.log(`Cache Hits: ${colorize(formatNumber(metrics.cacheHits), 'green')}`);
  console.log(`Cache Misses: ${colorize(formatNumber(metrics.cacheMisses), 'red')}`);
  console.log(`Hit Rate: ${colorize(formatPercentage(metrics.hitRate), metrics.hitRate > 90 ? 'green' : metrics.hitRate > 70 ? 'yellow' : 'red')}`);
  console.log(`Avg Response Time: ${colorize(formatTime(metrics.avgResponseTime), metrics.avgResponseTime < 50 ? 'green' : metrics.avgResponseTime < 100 ? 'yellow' : 'red')}`);
  console.log(`Database Fallbacks: ${colorize(formatNumber(metrics.databaseFallbacks), metrics.databaseFallbacks < 10 ? 'green' : 'red')}`);
  console.log();
}

function printHealthScore(dbMetrics: any, redisMetrics: any) {
  console.log(colorize('🏥 System Health Score', 'bright'));
  console.log(colorize('─'.repeat(40), 'blue'));
  
  let score = 0;
  const checks = [];
  
  // Database health
  if (dbMetrics.rpcStats.length > 0 && dbMetrics.totalCached > 0) {
    score += 25;
    checks.push('✅ Database RPC Functions');
  } else {
    checks.push('❌ Database RPC Functions');
  }
  
  // Redis health
  if (redisMetrics.redisHealthy) {
    score += 25;
    checks.push('✅ Redis Connection');
  } else {
    checks.push('❌ Redis Connection');
  }
  
  // Cache performance
  if (redisMetrics.hitRate > 90) {
    score += 25;
    checks.push('✅ Cache Hit Rate');
  } else if (redisMetrics.hitRate > 70) {
    score += 15;
    checks.push('⚠️  Cache Hit Rate');
  } else {
    checks.push('❌ Cache Hit Rate');
  }
  
  // Response time
  if (redisMetrics.avgResponseTime < 50) {
    score += 25;
    checks.push('✅ Response Time');
  } else if (redisMetrics.avgResponseTime < 100) {
    score += 15;
    checks.push('⚠️  Response Time');
  } else {
    checks.push('❌ Response Time');
  }
  
  const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
  console.log(`Overall Score: ${colorize(`${score}/100`, scoreColor)}`);
  console.log();
  
  checks.forEach(check => console.log(`  ${check}`));
  console.log();
}

function printRecommendations(dbMetrics: any, redisMetrics: any) {
  console.log(colorize('💡 Performance Recommendations', 'bright'));
  console.log(colorize('─'.repeat(40), 'blue'));
  
  const recommendations = [];
  
  if (redisMetrics.hitRate < 85) {
    recommendations.push('🔧 Increase Redis TTL or check invalidation patterns');
  }
  
  if (redisMetrics.avgResponseTime > 100) {
    recommendations.push('⚡ Consider Redis connection pooling or geographic distribution');
  }
  
  if (redisMetrics.databaseFallbacks > 10) {
    recommendations.push('🔄 Check Redis connection stability');
  }
  
  if (!redisMetrics.redisHealthy) {
    recommendations.push('🚨 Redis connection issues detected - check configuration');
  }
  
  if (dbMetrics.totalCached === 0) {
    recommendations.push('📊 Materialized view is empty - run cache refresh');
  }
  
  if (recommendations.length === 0) {
    console.log(colorize('🎉 No issues detected! System is performing well.', 'green'));
  } else {
    recommendations.forEach(rec => console.log(`  ${rec}`));
  }
  
  console.log();
}

async function runMonitoring(detailed: boolean = false) {
  printHeader();
  
  console.log(colorize('⏳ Collecting performance metrics...', 'yellow'));
  console.log();
  
  const [dbMetrics, redisMetrics] = await Promise.all([
    getDatabaseMetrics(),
    getRedisMetrics()
  ]);
  
  printDatabaseMetrics(dbMetrics);
  printRedisMetrics(redisMetrics);
  printHealthScore(dbMetrics, redisMetrics);
  printRecommendations(dbMetrics, redisMetrics);
  
  if (detailed) {
    console.log(colorize('🔍 Detailed Metrics', 'bright'));
    console.log(colorize('─'.repeat(40), 'blue'));
    console.log('Database Metrics:', JSON.stringify(dbMetrics, null, 2));
    console.log('Redis Metrics:', JSON.stringify(redisMetrics, null, 2));
    console.log();
  }
  
  console.log(colorize(`📅 Report generated at: ${new Date().toLocaleString()}`, 'cyan'));
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  const watch = args.includes('--watch');
  const detailed = args.includes('--detailed');
  
  if (watch) {
    console.log(colorize('👀 Starting watch mode (updates every 30 seconds)', 'bright'));
    console.log(colorize('Press Ctrl+C to stop', 'yellow'));
    console.log();
    
    // Run immediately
    await runMonitoring(detailed);
    
    // Then run every 30 seconds
    setInterval(async () => {
      console.clear();
      await runMonitoring(detailed);
    }, 30000);
  } else {
    await runMonitoring(detailed);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(colorize('\n👋 Monitoring stopped', 'yellow'));
  process.exit(0);
});

main().catch(console.error);