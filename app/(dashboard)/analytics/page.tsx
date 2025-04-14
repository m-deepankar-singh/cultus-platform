import type { Metadata } from "next"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"

export const metadata: Metadata = {
  title: "Analytics - Upskilling Platform",
  description: "View analytics for the upskilling platform",
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
      <AnalyticsHeader />
      <AnalyticsDashboard />
    </div>
  )
}
