import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartCard } from "@/components/analytics/chart-card";
import { DataCard } from "@/components/analytics/data-card";
import { ExportButton } from "@/components/common/export-button";
import { CourseProgress, AssessmentStatus } from "@/components/analytics/progress-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BookOpenCheck, 
  GraduationCap,
  ArrowUpRight
} from "lucide-react";

export const metadata: Metadata = {
  title: "Client Reports | Upskilling Platform",
  description: "Progress reports for client learners",
};

// This would come from the API in real implementation
const getClientData = async (clientId: string) => {
  // Simulated data - in real implementation, this would be fetched from API
  const clientInfo = {
    id: clientId,
    name: "Acme Corporation",
    contactPerson: "John Smith",
    email: "jsmith@acme.com",
    totalLearners: 42,
    activeLearners: 35,
    activeModules: 5,
    avgCompletionRate: 72.4,
    avgAssessmentScore: 84.2
  };
  
  const learnerProgress = [
    { id: "1", name: "Alex Johnson", modules: 3, avgProgress: 85, assessmentsPassed: 2, lastActive: "2023-10-28" },
    { id: "2", name: "Maria Garcia", modules: 2, avgProgress: 62, assessmentsPassed: 1, lastActive: "2023-10-30" },
    { id: "3", name: "David Chen", modules: 4, avgProgress: 95, assessmentsPassed: 4, lastActive: "2023-11-01" },
    { id: "4", name: "Sarah Williams", modules: 2, avgProgress: 42, assessmentsPassed: 0, lastActive: "2023-10-25" },
    { id: "5", name: "Michael Brown", modules: 1, avgProgress: 28, assessmentsPassed: 0, lastActive: "2023-10-29" },
  ];
  
  const moduleData = [
    { 
      id: "m1", 
      name: "Introduction to Sales", 
      type: "course",
      learnerCount: 32,
      averageCompletion: 78,
      learnerStatus: [
        { status: "completed", count: 18 },
        { status: "in_progress", count: 10 },
        { status: "not_started", count: 4 }
      ]
    },
    { 
      id: "m2", 
      name: "Customer Service Excellence", 
      type: "course",
      learnerCount: 28,
      averageCompletion: 65,
      learnerStatus: [
        { status: "completed", count: 12 },
        { status: "in_progress", count: 14 },
        { status: "not_started", count: 2 }
      ]
    },
    { 
      id: "m3", 
      name: "Sales Assessment", 
      type: "assessment",
      learnerCount: 22,
      averageScore: 82,
      learnerStatus: [
        { status: "passed", count: 15 },
        { status: "failed", count: 3 },
        { status: "not_started", count: 4 }
      ]
    }
  ];
  
  const weeklyActivity = [
    { week: "Oct 2-8", completions: 4, assessments: 2 },
    { week: "Oct 9-15", completions: 6, assessments: 3 },
    { week: "Oct 16-22", completions: 8, assessments: 5 },
    { week: "Oct 23-29", completions: 5, assessments: 3 },
    { week: "Oct 30-Nov 5", completions: 7, assessments: 4 },
  ];
  
  return {
    clientInfo,
    learnerProgress,
    moduleData,
    weeklyActivity
  };
};

export default async function ClientReportsPage({
  params
}: {
  params: { clientId: string }
}) {
  const { clientId } = params;
  
  // In a real implementation, we'd check if the client exists
  // For now, we'll just simulate the data
  const {
    clientInfo,
    learnerProgress,
    moduleData,
    weeklyActivity
  } = await getClientData(clientId);
  
  if (!clientInfo) {
    notFound();
  }
  
  const chartLegend = (
    <>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-blue-500" />
        <span className="text-xs">Completions</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-emerald-500" />
        <span className="text-xs">Assessments</span>
      </div>
    </>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {clientInfo.name} Reports
          </h2>
          <p className="text-muted-foreground">
            Progress data for {clientInfo.name} learners
          </p>
        </div>
        <ExportButton 
          endpoint={`/api/client-staff/progress/export`} 
          params={{ clientId }} 
          fileName={`${clientInfo.name.replace(/\s+/g, "-").toLowerCase()}-report.xlsx`} 
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DataCard
              title="Total Learners"
              value={clientInfo.totalLearners}
              icon={<Users className="h-4 w-4" />}
              description={`${clientInfo.activeLearners} currently active`}
            />
            <DataCard
              title="Active Modules"
              value={clientInfo.activeModules}
              icon={<BookOpenCheck className="h-4 w-4" />}
              description="Assigned courses and assessments"
            />
            <DataCard
              title="Avg. Completion"
              value={`${clientInfo.avgCompletionRate}%`}
              icon={<GraduationCap className="h-4 w-4" />}
              description="For course modules"
            />
            <DataCard
              title="Avg. Assessment Score"
              value={`${clientInfo.avgAssessmentScore}%`}
              description="For completed assessments"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard
              title="Weekly Activity"
              description="Course completions and assessments taken"
              type="bar"
              data={weeklyActivity}
              dataKey="completions"
              xAxisDataKey="week"
              categories={["completions", "assessments"]}
              colors={["#0284c7", "#059669"]}
              legend={chartLegend}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Module Status Overview</CardTitle>
                <CardDescription>Status breakdown across all modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {moduleData.map((module) => (
                    <div key={module.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{module.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {module.learnerCount} learners
                        </span>
                      </div>
                      
                      {module.type === "course" ? (
                        <>
                          <CourseProgress percentComplete={module.averageCompletion || 0} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{module.learnerStatus.find(s => s.status === "completed")?.count || 0} Completed</span>
                            <span>{module.learnerStatus.find(s => s.status === "in_progress")?.count || 0} In Progress</span>
                            <span>{module.learnerStatus.find(s => s.status === "not_started")?.count || 0} Not Started</span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Score: {module.averageScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <div>
                              <AssessmentStatus status="passed" />
                              <div className="mt-1 text-xs text-muted-foreground">
                                {module.learnerStatus.find(s => s.status === "passed")?.count || 0} Learners
                              </div>
                            </div>
                            <div>
                              <AssessmentStatus status="failed" />
                              <div className="mt-1 text-xs text-muted-foreground">
                                {module.learnerStatus.find(s => s.status === "failed")?.count || 0} Learners
                              </div>
                            </div>
                            <div>
                              <AssessmentStatus status="not_started" />
                              <div className="mt-1 text-xs text-muted-foreground">
                                {module.learnerStatus.find(s => s.status === "not_started")?.count || 0} Learners
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learner Progress</CardTitle>
              <CardDescription>Individual progress for all learners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Learner</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Modules</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Avg. Progress</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Assessments Passed</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {learnerProgress.map((learner) => (
                      <tr key={learner.id}>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium">
                          {learner.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm">
                          {learner.modules}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <CourseProgress 
                            percentComplete={learner.avgProgress || 0} 
                            size="sm" 
                            showLabel={false} 
                          />
                          <div className="mt-1 text-xs">{learner.avgProgress}%</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm">
                          {learner.assessmentsPassed}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
                          {new Date(learner.lastActive).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {moduleData.map((module) => (
              <Card key={module.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-base">{module.name}</CardTitle>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors capitalize">
                      {module.type}
                    </span>
                  </div>
                  <CardDescription>
                    {module.learnerCount} enrolled learners
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {module.type === "course" ? (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 text-sm font-medium">Average Completion</div>
                        <CourseProgress percentComplete={module.averageCompletion || 0} />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Status Breakdown</div>
                        <ul className="space-y-2">
                          {module.learnerStatus.map((status) => (
                            <li key={status.status} className="flex items-center justify-between text-sm">
                              <span className="capitalize">{status.status.replace("_", " ")}</span>
                              <div className="flex items-center gap-2">
                                <span>{status.count}</span>
                                <span className="text-muted-foreground">
                                  ({Math.round((status.count / module.learnerCount) * 100)}%)
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 text-sm font-medium">Average Score</div>
                        <div className="text-2xl font-bold">{module.averageScore}%</div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Status Breakdown</div>
                        <ul className="space-y-3">
                          {module.learnerStatus.map((status) => (
                            <li key={status.status} className="flex items-center justify-between">
                              <div>
                                <AssessmentStatus 
                                  status={status.status as any} 
                                  variant="badge"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{status.count}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round((status.count / module.learnerCount) * 100)}%)
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 