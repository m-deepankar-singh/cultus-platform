import type { Metadata } from "next"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"
import { 
  getAnalyticsSummary, 
  getModuleCompletionRates, 
  getProductPerformance, 
  getClientUsage,
  getMonthlyActiveLearners
} from "@/app/actions/analytics"

export const metadata: Metadata = {
  title: "Analytics - Upskilling Platform",
  description: "View analytics for the upskilling platform",
}

export default async function AnalyticsPage({ 
  searchParams 
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const yearParam = searchParams?.year;
  const monthParam = searchParams?.month;
  
  const year = typeof yearParam === 'string' ? parseInt(yearParam, 10) : undefined;
  const month = typeof monthParam === 'string' ? parseInt(monthParam, 10) : undefined;
  
  const malParams = (year && month) ? { year, month } : undefined;

  const [
    { summary, error: summaryError }, 
    { rates: moduleRates, error: ratesError },
    { products: productPerformance, error: performanceError },
    { clientMetrics, error: clientUsageError },
    { malCount, filterApplied, error: malError }
  ] = await Promise.all([
    getAnalyticsSummary(),
    getModuleCompletionRates(),
    getProductPerformance(),
    getClientUsage(),
    getMonthlyActiveLearners(malParams)
  ]);
  
  const combinedError = summaryError || ratesError || performanceError || clientUsageError || malError;

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
      />
    </div>
  )
}
