import type { Metadata } from "next"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { 
  getOptimizedAnalytics
} from "@/app/actions/analytics-optimized"

export const metadata: Metadata = {
  title: "Analytics - Upskilling Platform",
  description: "View analytics for the upskilling platform",
}

export default async function AnalyticsPage({ 
  searchParams 
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const yearParam = resolvedSearchParams?.year;
  const monthParam = resolvedSearchParams?.month;
  
  const year = typeof yearParam === 'string' ? parseInt(yearParam, 10) : undefined;
  const month = typeof monthParam === 'string' ? parseInt(monthParam, 10) : undefined;
  
  // Single optimized analytics call instead of 4 separate calls
  const { data: analyticsData, error: analyticsError, cached, loadTime } = await getOptimizedAnalytics({
    year,
    month
  });

  // Extract data from the optimized response
  const summary = analyticsData?.summary;
  const moduleRates = analyticsData?.moduleRates;
  const productPerformance = analyticsData?.productPerformance;
  const clientMetrics = analyticsData?.clientUsage;
  const malCount = analyticsData?.malData.malCount;
  const filterApplied = analyticsData?.malData.filterApplied;
  
  const combinedError = analyticsError;

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <AnalyticsHeader />
              <AnalyticsDashboard 
          summary={summary}
          moduleRates={moduleRates}
          productPerformance={productPerformance}
          clientUsage={clientMetrics}
          malCount={malCount}
          malFilterApplied={filterApplied}
          error={combinedError}
          cached={cached}
          loadTime={loadTime}
        />
    </div>
  )
}
