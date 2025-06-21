import {
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Users, 
  Building2, 
  BarChart3, // For overall product progress
  Activity // For MAL or could use Users again
} from "lucide-react";
// Import the type, no need for the action itself here anymore
import type { AnalyticsSummary } from "@/app/actions/analytics-optimized"; 

// Helper to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Define props for this component
interface AnalyticsSummaryDataCardsProps {
  summary?: AnalyticsSummary;
  error?: string;
}

// Make this a regular component, not async
export function AnalyticsSummaryDataCards({ summary, error }: AnalyticsSummaryDataCardsProps) {
  // Data fetching is removed, component now relies on props

  if (error) {
    // Render error state based on props
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(key => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-500">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">{error || 'Could not load summary.'}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    // Render loading state based on props
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(key => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Render cards using the summary data from props
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Monthly Active Learners</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(summary.totalMal)}</div>
          {/* <p className="text-xs text-muted-foreground">Placeholder for trend</p> */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Avg. Product Progress</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.overallProductProgress.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            ({formatNumber(summary.sumTotalProductCompleted ?? 0)} completed / {formatNumber(summary.sumTotalProductEligible ?? 0)} eligible enrollments)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Products In Progress</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" /> {/* Icon can be changed */}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(summary.sumTotalProductInProgress ?? 0)}</div>
          <p className="text-xs text-muted-foreground">
            (Total eligible: {formatNumber(summary.sumTotalProductEligible ?? 0)})
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Active Learners (Clients)</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(summary.totalClientActiveLearners)}</div>
          {/* <p className="text-xs text-muted-foreground">Placeholder for trend</p> */}
        </CardContent>
      </Card>
    </div>
  );
} 