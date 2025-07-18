import { getOptimizedMonthlyActiveLearners, getOptimizedModuleCompletionRates, getOptimizedProductPerformance, getOptimizedClientUsage, getOptimizedAnalyticsSummary } from "@/app/actions/analytics-optimized";

export const dynamic = 'force-dynamic';

export default async function AnalyticsTestPage() {
  // Test MAL (Optional - can comment out if focusing on module rates)
  const malResult = await getOptimizedMonthlyActiveLearners();

  // Test Module Completion Rates
  const moduleRatesResult = await getOptimizedModuleCompletionRates();
  
  // Test Product Performance
  const productPerformanceResult = await getOptimizedProductPerformance();
  
  // Test Client Usage
  const clientUsageResult = await getOptimizedClientUsage();

  // Test Analytics Summary
  const analyticsSummaryResult = await getOptimizedAnalyticsSummary();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Analytics Test Page</h1>
      
      {/* MAL Results */}
      <section style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px' }}>
        <h2>Monthly Active Learners (MAL)</h2>
        {malResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{malResult.error}</pre>
          </div>
        )}
        {malResult.malCount !== undefined && (
          <div style={{ color: 'green', border: '1px solid green', padding: '10px', marginTop: '10px' }}>
            <strong>MAL Count:</strong> <pre style={{ fontSize: '2em' }}>{malResult.malCount}</pre>
          </div>
        )}
        <h4>Full MAL Result:</h4>
        <pre>{JSON.stringify(malResult, null, 2)}</pre>
      </section>

      {/* Module Completion Rates Results */}
      <section style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px' }}>
        <h2>Module Completion Rates</h2>
        {moduleRatesResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{moduleRatesResult.error}</pre>
          </div>
        )}
        {moduleRatesResult.rates && moduleRatesResult.rates.length > 0 && (
          <div>
            <h3>Results (Per Module):</h3>
            <ul style={{ listStyleType: 'none', padding: '0' }}>
              {moduleRatesResult.rates.map((rate, index) => (
                <li key={index} style={{ 
                  margin: '10px 0', 
                  padding: '10px', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '5px',
                  borderLeft: '4px solid #4CAF50'
                }}>
                  <strong>{rate.moduleName}</strong> ({rate.moduleType})<br />
                  <span>Completion Rate: {rate.completionRate.toFixed(2)}%</span><br />
                  <span style={{ fontSize: '0.9em' }}>
                    (Eligible: {rate.totalEligibleStudents}, 
                    Completed: {rate.totalCompletedByEligible}, 
                    In Progress: {rate.totalInProgressByEligible}, 
                    Not Started: {rate.totalNotStartedByEligible})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h4>Full Module Rates Result (Per Module):</h4>
        <pre>{JSON.stringify(moduleRatesResult, null, 2)}</pre>
      </section>
      
      {/* Product Performance Results */}
      <section style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px' }}>
        <h2>Product Performance Metrics (Per Product)</h2>
        {productPerformanceResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{productPerformanceResult.error}</pre>
          </div>
        )}
        {productPerformanceResult.products && productPerformanceResult.products.length > 0 && (
          <div>
            <h3>Results:</h3>
            <ul style={{ listStyleType: 'none', padding: '0' }}>
              {productPerformanceResult.products.map((product, index) => (
                <li key={index} style={{ 
                  margin: '10px 0', 
                  padding: '10px', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '5px',
                  borderLeft: '4px solid #3F51B5'
                }}>
                  <strong>{product.productName}</strong><br />
                  <span>Avg. Progress (Weighted by eligible): {product.averageOverallProductProgress.toFixed(2)}%</span><br />
                  <span>Completion Rate: {product.completionRate !== undefined ? product.completionRate.toFixed(2) : 'N/A'}%</span><br />
                  <span style={{ fontSize: '0.9em' }}>
                    (Eligible: {product.totalEligibleLearners}, 
                    Engaged: {product.totalEngagedLearners}, 
                    Completed All: {product.completedCount}, 
                    In Progress: {product.inProgressCount}, 
                    Not Started: {product.notStartedCount})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h4>Full Product Performance Result (Per Product):</h4>
        <pre>{JSON.stringify(productPerformanceResult, null, 2)}</pre>
      </section>

      {/* Client Usage Metrics Results */}
      <section style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px' }}>
        <h2>Client Usage Metrics</h2>
        {clientUsageResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{clientUsageResult.error}</pre>
          </div>
        )}
        {clientUsageResult.clientMetrics && clientUsageResult.clientMetrics.length > 0 && (
          <div>
            <h3>Results:</h3>
            <ul style={{ listStyleType: 'none', padding: '0' }}>
              {clientUsageResult.clientMetrics.map((client, index) => (
                <li key={index} style={{ 
                  margin: '10px 0', 
                  padding: '10px', 
                  backgroundColor: '#f0f8ff', 
                  borderRadius: '5px',
                  borderLeft: '4px solid #FFC107'
                }}>
                  <strong>{client.clientName}</strong> (ID: {client.clientId})<br />
                  <span>Active Learners: {client.activeLearnersInClient}</span><br />
                  <span>Avg. Product Progress: {client.averageProductProgressInClient.toFixed(2)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(!clientUsageResult.clientMetrics || clientUsageResult.clientMetrics.length === 0) && !clientUsageResult.error && (
          <p>No client usage data available.</p>
        )}
        <h4>Full Client Usage Result:</h4>
        <pre>{JSON.stringify(clientUsageResult, null, 2)}</pre>
      </section>

      {/* Analytics Summary Results */}
      <section style={{ marginBottom: '30px', border: '1px solid #eee', padding: '15px', backgroundColor: '#e6ffe6' }}>
        <h2>Analytics Summary</h2>
        {analyticsSummaryResult.error && (
          <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginTop: '10px' }}>
            <strong>Error:</strong> <pre>{analyticsSummaryResult.error}</pre>
          </div>
        )}
        {analyticsSummaryResult.summary && (
          <div style={{ padding: '10px'}}>
            <p><strong>Total Monthly Active Learners (MAL):</strong> {analyticsSummaryResult.summary.totalMal}</p>
            <hr style={{ margin: '10px 0' }} />
            <h4>Overall Product Engagement:</h4>
            <p><strong>Overall Average Product Progress (Weighted by eligible):</strong> {analyticsSummaryResult.summary.overallProductProgress.toFixed(2)}%</p>
            <p style={{ marginLeft: '20px' }}>- Total Product Enrollments (Eligible): {analyticsSummaryResult.summary.sumTotalProductEligible}</p>
            <p style={{ marginLeft: '20px' }}>- Total Product Completions: {analyticsSummaryResult.summary.sumTotalProductCompleted}</p>
            <p style={{ marginLeft: '20px' }}>- Total Products In Progress: {analyticsSummaryResult.summary.sumTotalProductInProgress}</p>
            <p style={{ marginLeft: '20px' }}>- Total Products Not Started (by eligible): {analyticsSummaryResult.summary.sumTotalProductNotStarted}</p>
            <hr style={{ margin: '10px 0' }} />
            <p><strong>Total Active Learners Across Clients:</strong> {analyticsSummaryResult.summary.totalClientActiveLearners}</p>
          </div>
        )}
        <h4>Full Analytics Summary Result:</h4>
        <pre>{JSON.stringify(analyticsSummaryResult, null, 2)}</pre>
      </section>
    </div>
  );
} 