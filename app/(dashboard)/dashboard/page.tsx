import { Metadata } from "next";
import { ChartCard } from "@/components/analytics/chart-card";
import { DataCard } from "@/components/analytics/data-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/components/common/export-button";
import { 
  Users, 
  BookOpenCheck, 
  GraduationCap, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard | Upskilling Platform",
  description: "Analytics dashboard for the Upskilling Platform",
};

// This would come from the API in real implementation
const getAnalyticsData = async () => {
  // Simulated data
  const statsData = {
    totalLearners: 1284,
    activeModules: 32,
    completionRate: 78.5,
    averageScore: 82.3,
    totalClients: 15
  };

  const progressOverTime = [
    { month: "Jan", completions: 38, enrollments: 65 },
    { month: "Feb", completions: 42, enrollments: 59 },
    { month: "Mar", completions: 55, enrollments: 80 },
    { month: "Apr", completions: 62, enrollments: 75 },
    { month: "May", completions: 78, enrollments: 90 },
    { month: "Jun", completions: 84, enrollments: 101 },
  ];

  const assessmentScores = [
    { name: "0-50%", value: 15 },
    { name: "51-70%", value: 25 },
    { name: "71-85%", value: 40 },
    { name: "86-100%", value: 20 },
  ];

  const moduleCompletions = [
    { name: "Introduction to Sales", completed: 92, inProgress: 45 },
    { name: "Customer Service Excellence", completed: 78, inProgress: 62 },
    { name: "Leadership Fundamentals", completed: 65, inProgress: 35 },
    { name: "Digital Marketing", completed: 45, inProgress: 58 },
    { name: "Project Management", completed: 35, inProgress: 29 },
  ];

  const recentActivityData = [
    { learner: "Alex Johnson", client: "Acme Corp", module: "Leadership Fundamentals", status: "Completed", date: "2023-11-01", score: 95 },
    { learner: "Samantha Wells", client: "TechSolutions", module: "Digital Marketing", status: "In Progress", date: "2023-11-02", score: null },
    { learner: "Derek Miller", client: "Global Industries", module: "Customer Service Excellence", status: "Completed", date: "2023-11-03", score: 88 },
    { learner: "Emily Chen", client: "Acme Corp", module: "Project Management", status: "Completed", date: "2023-11-03", score: 75 },
    { learner: "Jason Parker", client: "NextGen Inc", module: "Introduction to Sales", status: "Failed", date: "2023-11-04", score: 45 },
  ];

  return {
    statsData,
    progressOverTime,
    assessmentScores,
    moduleCompletions,
    recentActivityData
  };
};

export default async function DashboardPage() {
  const {
    statsData,
    progressOverTime,
    assessmentScores,
    moduleCompletions,
    recentActivityData
  } = await getAnalyticsData();

  const chartLegend = (
    <>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-blue-500" />
        <span className="text-xs">Completions</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-emerald-500" />
        <span className="text-xs">Enrollments</span>
      </div>
    </>
  );

  const moduleChartLegend = (
    <>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-blue-500" />
        <span className="text-xs">Completed</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-amber-500" />
        <span className="text-xs">In Progress</span>
      </div>
    </>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Platform-wide analytics and statistics</p>
        </div>
        <ExportButton 
          endpoint="/api/admin/analytics/export" 
          fileName="platform-analytics.xlsx" 
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DataCard
              title="Total Learners"
              value={statsData.totalLearners}
              icon={<Users className="h-4 w-4" />}
              trend={{ value: 12, direction: "up", label: "from last month" }}
              description="Active students across all clients"
            />
            <DataCard
              title="Active Modules"
              value={statsData.activeModules}
              icon={<BookOpenCheck className="h-4 w-4" />}
              trend={{ value: 4, direction: "up", label: "from last month" }}
              description="Courses and assessments in use"
            />
            <DataCard
              title="Completion Rate"
              value={`${statsData.completionRate}%`}
              icon={<GraduationCap className="h-4 w-4" />}
              trend={{ value: 2.5, direction: "down", label: "from last month" }}
              description="Average module completion rate"
            />
            <DataCard
              title="Total Clients"
              value={statsData.totalClients}
              icon={<Building2 className="h-4 w-4" />}
              trend={{ value: 1, direction: "up", label: "from last month" }}
              description="Organizations using the platform"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <ChartCard
              title="Progress Over Time"
              description="Module completions vs enrollments"
              type="line"
              data={progressOverTime}
              dataKey="completions"
              xAxisDataKey="month"
              categories={["completions", "enrollments"]}
              colors={["#0284c7", "#059669"]}
              className="col-span-4"
              legend={chartLegend}
            />

            <ChartCard
              title="Assessment Score Distribution"
              description="Learner score ranges"
              type="pie"
              data={assessmentScores}
              dataKey="value"
              className="col-span-3"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>The latest learner activity across all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {recentActivityData.map((activity, index) => (
                    <div key={index} className="flex items-start">
                      <div className="mr-4 mt-0.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-muted bg-muted-foreground/20">
                          {activity.status === "Completed" ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : activity.status === "Failed" ? (
                            <ArrowDownRight className="h-4 w-4 text-rose-500" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          )}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.learner} 
                          <span className="text-muted-foreground ml-2">
                            ({activity.client})
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.status} {activity.module}
                          {activity.score !== null && (
                            <span className="ml-2 font-medium">
                              Score: {activity.score}%
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Stats</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Avg. Score</p>
                      <p className="text-2xl font-bold">{statsData.averageScore}%</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Completion</p>
                      <p className="text-2xl font-bold">{statsData.completionRate}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Course Progress</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[78%] rounded-full bg-blue-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assessment Pass Rate</span>
                      <span className="font-medium">82%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[82%] rounded-full bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Top Modules by Completion"
              type="bar"
              data={moduleCompletions}
              dataKey="completed"
              xAxisDataKey="name"
              categories={["completed", "inProgress"]}
              colors={["#0284c7", "#d97706"]}
              legend={moduleChartLegend}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Module Statistics</CardTitle>
                <CardDescription>Performance metrics for all modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {moduleCompletions.map((module, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{module.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {module.completed + module.inProgress} learners
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="flex h-full">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${module.completed / (module.completed + module.inProgress) * 100}%` }} 
                          />
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${module.inProgress / (module.completed + module.inProgress) * 100}%` }} 
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>{Math.round(module.completed / (module.completed + module.inProgress) * 100)}% Completed</span>
                        <span>{Math.round(module.inProgress / (module.completed + module.inProgress) * 100)}% In Progress</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learners" className="space-y-4">
          <p className="text-muted-foreground">Learner-specific analytics content would be shown here.</p>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <p className="text-muted-foreground">Client-specific analytics content would be shown here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
