import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { 
  ChevronLeft, 
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
import { DeleteModuleButton } from "@/components/modules/delete-module-button"
import { LessonManager } from "@/components/modules/lesson-manager"
import { AssessmentQuestionManager } from "@/components/modules/assessment-question-manager"
import { QuestionsTabButton } from "@/components/modules/questions-tab-button"

interface ModulePageProps {
  params: Promise<{
    moduleId: string
  }>
}

export default async function ModuleDetailPage({ params }: ModulePageProps) {
  // Await params before destructuring to avoid NextJS error
  const { moduleId } = await params;
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
          <DeleteModuleButton moduleId={moduleId} />
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

      {module.type === "Course" && (
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
      )}
      
      {module.type === "Assessment" && (
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
      )}
    </div>
  )
} 