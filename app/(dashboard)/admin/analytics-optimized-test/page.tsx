import { 
  getOptimizedAnalytics, 
  getOptimizedAnalyticsSummary,
  getAnalyticsCachePerformance 
} from "@/app/actions/analytics-optimized";

export default async function OptimizedAnalyticsTestPage() {
  // Test the main optimized analytics function
  const optimizedResult = await getOptimizedAnalytics();
  
  // Test the summary function for backward compatibility
  const summaryResult = await getOptimizedAnalyticsSummary();
  
  // Test cache performance monitoring
  const cachePerformanceResult = await getAnalyticsCachePerformance();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Optimized Analytics Test Page</h1>
      
      {/* Main Optimized Analytics Results */}
      <section style={{ marginBottom: '30px', border: '2px solid #4CAF50', padding: '15px', backgroundColor: '#f0f8f0' }}>
        <h2>🚀 Optimized Analytics (Single RPC Call)</h2>
        {optimizedResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{optimizedResult.error}</pre>
          </div>
        )}
        {optimizedResult.data && (
          <div style={{ color: 'green', padding: '10px', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', border: '1px solid #4CAF50', borderRadius: '5px' }}>
                <strong>Load Time:</strong> <span style={{ fontSize: '1.5em', color: '#2196F3' }}>{optimizedResult.loadTime}ms</span>
              </div>
              <div style={{ padding: '10px', border: '1px solid #4CAF50', borderRadius: '5px' }}>
                <strong>Cache Status:</strong> <span style={{ fontSize: '1.2em', color: optimizedResult.cached ? '#4CAF50' : '#FF9800' }}>
                  {optimizedResult.cached ? '✅ HIT' : '⚡ MISS'}
                </span>
              </div>
              <div style={{ padding: '10px', border: '1px solid #4CAF50', borderRadius: '5px' }}>
                <strong>Total MAL:</strong> <span style={{ fontSize: '1.5em', color: '#4CAF50' }}>{optimizedResult.data.summary.totalMal}</span>
              </div>
            </div>
            
            <h4>📊 Summary Data:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px' }}>
              <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                <strong>Overall Progress:</strong><br/>
                {optimizedResult.data.summary.overallProductProgress.toFixed(2)}%
              </div>
              <div style={{ padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '5px' }}>
                <strong>Completed:</strong><br/>
                {optimizedResult.data.summary.sumTotalProductCompleted}
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px' }}>
                <strong>In Progress:</strong><br/>
                {optimizedResult.data.summary.sumTotalProductInProgress}
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fce4ec', borderRadius: '5px' }}>
                <strong>Not Started:</strong><br/>
                {optimizedResult.data.summary.sumTotalProductNotStarted}
              </div>
            </div>

            <h4>📈 Module Rates ({optimizedResult.data.moduleRates.length} modules):</h4>
            <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {optimizedResult.data.moduleRates.map((module, index) => (
                <div key={index} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f9f9f9' }}>
                  <strong>{module.moduleName}</strong> ({module.moduleType}): {module.completionRate.toFixed(1)}% 
                  ({module.totalCompletedByEligible}/{module.totalEligibleStudents})
                </div>
              ))}
            </div>

            <h4>🏢 Product Performance ({optimizedResult.data.productPerformance.length} products):</h4>
            <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {optimizedResult.data.productPerformance.map((product, index) => (
                <div key={index} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f9f9f9' }}>
                  <strong>{product.productName}</strong>: {product.averageOverallProductProgress.toFixed(1)}% avg progress
                  ({product.totalEligibleLearners} learners)
                </div>
              ))}
            </div>

            <h4>👥 Client Usage ({optimizedResult.data.clientUsage.length} clients):</h4>
            <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {optimizedResult.data.clientUsage.map((client, index) => (
                <div key={index} style={{ marginBottom: '5px', padding: '5px', backgroundColor: '#f9f9f9' }}>
                  <strong>{client.clientName}</strong>: {client.activeLearnersInClient} active learners
                  (Avg progress: {client.averageProductProgressInClient.toFixed(1)}%)
                </div>
              ))}
            </div>
          </div>
        )}
        <details style={{ marginTop: '15px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📋 Full Optimized Result (JSON)</summary>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(optimizedResult, null, 2)}
          </pre>
        </details>
      </section>

      {/* Backward Compatibility Test */}
      <section style={{ marginBottom: '30px', border: '2px solid #2196F3', padding: '15px', backgroundColor: '#f0f4ff' }}>
        <h2>🔄 Backward Compatibility Test (Summary Only)</h2>
        {summaryResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{summaryResult.error}</pre>
          </div>
        )}
        {summaryResult.summary && (
          <div style={{ padding: '10px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ padding: '5px 10px', backgroundColor: summaryResult.cached ? '#4CAF50' : '#FF9800', color: 'white', borderRadius: '3px' }}>
                {summaryResult.cached ? 'CACHED' : 'FRESH'}
              </span>
              <span><strong>Total MAL:</strong> {summaryResult.summary.totalMal}</span>
              <span><strong>Overall Progress:</strong> {summaryResult.summary.overallProductProgress.toFixed(2)}%</span>
            </div>
          </div>
        )}
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📋 Summary Result (JSON)</summary>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(summaryResult, null, 2)}
          </pre>
        </details>
      </section>

      {/* Cache Performance Monitoring */}
      <section style={{ marginBottom: '30px', border: '2px solid #9C27B0', padding: '15px', backgroundColor: '#f8f0ff' }}>
        <h2>📊 Cache Performance Monitoring</h2>
        {cachePerformanceResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{cachePerformanceResult.error}</pre>
          </div>
        )}
        {cachePerformanceResult.performance && (
          <div style={{ padding: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: '#e1bee7', borderRadius: '5px' }}>
                <strong>Total Entries:</strong><br/>
                {cachePerformanceResult.performance.total_entries}
              </div>
              <div style={{ padding: '10px', backgroundColor: '#e1bee7', borderRadius: '5px' }}>
                <strong>Avg Hit Count:</strong><br/>
                {cachePerformanceResult.performance.average_hit_count.toFixed(2)}
              </div>
              <div style={{ padding: '10px', backgroundColor: '#e1bee7', borderRadius: '5px' }}>
                <strong>Max Hit Count:</strong><br/>
                {cachePerformanceResult.performance.max_hit_count}
              </div>
              <div style={{ padding: '10px', backgroundColor: '#e1bee7', borderRadius: '5px' }}>
                <strong>Reuse Rate:</strong><br/>
                {cachePerformanceResult.performance.reuse_percentage.toFixed(1)}%
              </div>
              <div style={{ padding: '10px', backgroundColor: '#e1bee7', borderRadius: '5px' }}>
                <strong>Expired Entries:</strong><br/>
                {cachePerformanceResult.performance.expired_entries}
              </div>
            </div>
          </div>
        )}
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📋 Cache Performance (JSON)</summary>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(cachePerformanceResult, null, 2)}
          </pre>
        </details>
      </section>

      {/* Performance Comparison */}
      <section style={{ marginBottom: '30px', border: '2px solid #FF5722', padding: '15px', backgroundColor: '#fff3f0' }}>
        <h2>⚡ Performance Comparison</h2>
        <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '5px' }}>
          <h3>🎯 Expected Improvements:</h3>
          <ul style={{ lineHeight: '1.6' }}>
            <li><strong>Load Time:</strong> ~3-5 seconds → &lt;500ms (90% improvement)</li>
            <li><strong>Database Queries:</strong> 4+ RPC calls → 1 cached call (75% reduction)</li>
            <li><strong>Authentication Checks:</strong> 4x checks → 1x check (75% reduction)</li>
            <li><strong>Network Requests:</strong> 4 requests → 1 request (75% reduction)</li>
            <li><strong>Cache Hit Rate:</strong> Target &gt;85% during normal usage</li>
          </ul>
          
          <h3>🔍 What to Look For:</h3>
          <ul style={{ lineHeight: '1.6' }}>
            <li><strong>First Call:</strong> Should show "MISS" status (cache miss)</li>
            <li><strong>Second Call:</strong> Should show "HIT" status (cache hit)</li>
            <li><strong>Load Time:</strong> Should be sub-millisecond for cache hits</li>
            <li><strong>Data Consistency:</strong> Same results as original implementation</li>
          </ul>
        </div>
      </section>

      {/* Instructions */}
      <section style={{ border: '2px solid #607D8B', padding: '15px', backgroundColor: '#f5f7fa' }}>
        <h2>🧪 Testing Instructions</h2>
        <ol style={{ lineHeight: '1.6' }}>
          <li><strong>Refresh this page</strong> to see cache miss → cache hit behavior</li>
          <li><strong>Check load times</strong> - should be very fast for cache hits</li>
          <li><strong>Compare data</strong> with original analytics test page</li>
          <li><strong>Monitor cache performance</strong> metrics above</li>
          <li><strong>Test cache invalidation</strong> by updating student data</li>
        </ol>
      </section>
    </div>
  );
} 