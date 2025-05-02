import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { StandaloneModuleForm } from "@/components/modules/standalone-module-form"

export default async function CreateModulePage({
  searchParams
}: {
  searchParams: { type?: string }
}) {
  const supabase = await createClient()
  
  // Check authentication and admin role
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect("/admin/login")
  }
  
  // Check if the user has admin role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  
  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard")
  }
  
  // Validate and extract module type from query params
  const moduleType = searchParams.type?.toLowerCase() === "assessment" 
    ? "Assessment" 
    : "Course"
  
  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/modules">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Modules
          </Link>
        </Button>
      </div>
      
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Create New Module</h1>
        <p className="text-muted-foreground">
          Configure a new module to add to your learning platform
        </p>
      </div>
      
      <Tabs defaultValue={moduleType.toLowerCase()} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="course">Course Module</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Module</TabsTrigger>
        </TabsList>
        
        <TabsContent value="course">
          <StandaloneModuleForm type="Course" />
        </TabsContent>
        
        <TabsContent value="assessment">
          <StandaloneModuleForm type="Assessment" />
        </TabsContent>
      </Tabs>
    </div>
  )
} 