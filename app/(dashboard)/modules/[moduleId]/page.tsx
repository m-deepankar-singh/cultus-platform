import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { 
  ChevronLeft, 
  Pencil, 
  Trash, 
  Tag, 
  Calendar, 
  Clock, 
  Book, 
  FileText
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteModuleButton } from "@/components/modules/delete-module-button"
import { LessonManager } from "@/components/modules/lesson-manager"
import { AssessmentQuestionManager } from "@/components/modules/assessment-question-manager"
import { QuestionsTabButton } from "@/components/modules/questions-tab-button"

interface ModulePageProps {
  params: {
    moduleId: string
  }
}

export default async function ModuleDetailPage({ params }: ModulePageProps) {
  // Await params before destructuring to avoid NextJS error
  const resolvedParams = await Promise.resolve(params);
  const { moduleId } = resolvedParams;
  const supabase = await createClient()

  // Fetch basic module info to display
  const { data: module, error } = await supabase
    .from("modules")
    .select("*, products(id, name)")
    .eq("id", moduleId)
    .single()

  if (error || !module) {
    console.error("Error fetching module:", error)
    notFound()
  }

  // Extract product info
  const product = module.products && module.products.length > 0 ? module.products[0] : null

  return (
    <div className="container py-10">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/modules">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Modules
        </Link>
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{module.name}</h1>
            <Badge variant={module.type === "Course" ? "default" : "secondary"}>
              {module.type === "Course" ? <Book className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
              {module.type}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {product ? (
              <span>Assigned to product: <Link href={`/products/${product.id}`} className="text-blue-600 hover:underline">{product.name}</Link></span>
            ) : (
              "Not assigned to any product"
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/modules/${moduleId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Module
            </Link>
          </Button>
          <DeleteModuleButton id={moduleId} name={module.name} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Calendar className="h-4 w-4 inline mr-1" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{format(new Date(module.created_at), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Calendar className="h-4 w-4 inline mr-1" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{format(new Date(module.updated_at), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Tag className="h-4 w-4 inline mr-1" />
              Module ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs">{module.id}</p>
          </CardContent>
        </Card>
      </div>

      {module.description && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{module.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Module Details</TabsTrigger>
          {module.type === "Course" && <TabsTrigger value="lessons">Lessons</TabsTrigger>}
          {module.type === "Assessment" && <TabsTrigger value="questions">Questions</TabsTrigger>}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Module Configuration</CardTitle>
              <CardDescription>
                Configuration settings for this {module.type.toLowerCase()} module
              </CardDescription>
            </CardHeader>
            <CardContent>
              {module.type === "Course" && (
                <div>
                  {module.configuration?.video_url && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Intro Video</h3>
                      <a 
                        href={module.configuration.video_url as string} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {module.configuration.video_url as string}
                      </a>
                    </div>
                  )}
                  
                  <div className="bg-muted rounded-md p-6 text-center">
                    <h3 className="font-semibold mb-2">Lesson Management</h3>
                    <p className="text-muted-foreground mb-4">
                      Add, edit, and reorder lessons using the Lessons tab above
                    </p>
                    <Button asChild variant="outline">
                      <Link href="#" className="cursor-not-allowed opacity-70">
                        <span>Lesson Editor Coming Soon</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
              
              {module.type === "Assessment" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-semibold">Time Limit</h3>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{module.configuration?.time_limit_minutes || 60} minutes</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-semibold">Pass Threshold</h3>
                    <span>{module.configuration?.pass_threshold || 70}%</span>
                  </div>
                  
                  <div className="bg-muted rounded-md p-6 text-center">
                    <h3 className="font-semibold mb-2">Question Management</h3>
                    <p className="text-muted-foreground mb-4">
                      Add and manage assessment questions using the Questions tab above
                    </p>
                    <QuestionsTabButton />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lessons">
          <Card>
            <CardHeader>
              <CardTitle>Lessons</CardTitle>
              <CardDescription>
                Manage the lessons for this course module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LessonManager moduleId={moduleId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Questions</CardTitle>
              <CardDescription>
                Manage the questions for this assessment module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssessmentQuestionManager moduleId={moduleId} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Module Settings</CardTitle>
              <CardDescription>
                Configure advanced settings for this module
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">Advanced Settings Coming Soon</h3>
                <p className="max-w-lg mx-auto mb-6">
                  Advanced configuration options for this module will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 