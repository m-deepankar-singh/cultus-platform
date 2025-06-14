"use client"

import { BarChart, BookOpen, Building2, FileText, GraduationCap, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserEngagement } from "@/components/analytics/user-engagement"
import { CompletionRates } from "@/components/analytics/completion-rates"
import { ProductPerformance } from "@/components/analytics/product-performance"
import { ClientUsage } from "@/components/analytics/client-usage"
import { AnalyticsSummaryDataCards } from "./analytics-summary-data-cards"
import type { 
  AnalyticsSummary, 
  ModuleCompletionRate, 
  ProductPerformance as ProductPerformanceData, 
  ClientUsageMetrics, 
  // Define or import the type for filterApplied if not already done
  // Assuming it's: { year: number; month: number } | 'last30days' | undefined
} from "@/app/actions/analytics";

interface AnalyticsDashboardProps {
  summary?: AnalyticsSummary;
  moduleRates?: ModuleCompletionRate[];
  productPerformance?: ProductPerformanceData[];
  clientUsage?: ClientUsageMetrics[];
  malCount?: number;
  malFilterApplied?: { year: number; month: number } | 'last30days';
  error?: string;
  cached?: boolean;
  loadTime?: number;
}

export function AnalyticsDashboard({ summary, moduleRates, productPerformance, clientUsage, malCount, malFilterApplied, error, cached, loadTime }: AnalyticsDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Performance indicator */}
      {(cached !== undefined || loadTime !== undefined) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          <div className="flex items-center gap-2">
            {cached !== undefined && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                cached 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}>
                {cached ? 'Cached Data' : 'Fresh Data'}
              </span>
            )}
            {loadTime !== undefined && (
              <span className="text-xs">
                Load time: {loadTime}ms
              </span>
            )}
          </div>
          <span className="text-xs">
            Optimized Analytics • Single Query
          </span>
        </div>
      )}
      
      <AnalyticsSummaryDataCards summary={summary} error={error} />

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">User Engagement</span>
          </TabsTrigger>
          <TabsTrigger value="completion" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Completion Rates</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Client Usage</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Monthly Active Learners & Trend (Dummy)</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <UserEngagement malCount={malCount} malFilterApplied={malFilterApplied} error={error} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Completion Rates</CardTitle>
                <CardDescription>Course and assessment completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <CompletionRates rates={moduleRates} error={error} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>User Engagement</CardTitle>
              <CardDescription>Monthly Active Learners & Trend (Dummy)</CardDescription>
            </CardHeader>
            <CardContent>
              <UserEngagement malCount={malCount} malFilterApplied={malFilterApplied} error={error} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="completion">
          <Card>
            <CardHeader>
              <CardTitle>Completion Rates</CardTitle>
              <CardDescription>Detailed completion rate metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <CompletionRates rates={moduleRates} error={error} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Client Usage</CardTitle>
              <CardDescription>Product usage by client</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientUsage clientMetrics={clientUsage} error={error} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>Performance metrics for top products</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductPerformance products={productPerformance} error={error} />
        </CardContent>
      </Card>
    </div>
  )
}
