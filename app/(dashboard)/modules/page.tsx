import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModuleCreateButton } from '@/components/modules/module-create-button'
import { ModulesTable } from '@/components/modules/modules-table'

export const dynamic = 'force-dynamic'

export default async function ModulesPage() {
  const supabase = await createClient()
  
  // Fetch all modules
  const { data: modules, error } = await supabase
    .from("modules")
    .select(`
      id,
      name,
      type,
      created_at,
      updated_at,
      sequence,
      product_id,
      configuration,
      products (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error("Error fetching modules:", error)
  }
  
  // Separate modules by type
  const courseModules = modules?.filter(module => module.type === 'Course') || []
  const assessmentModules = modules?.filter(module => module.type === 'Assessment') || []
  
  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Modules Management</h1>
          <p className="text-muted-foreground">
            Create and manage all modules from this centralized location
          </p>
        </div>
        
        <ModuleCreateButton />
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 mb-6">
          <TabsTrigger value="all">All Modules</TabsTrigger>
          <TabsTrigger value="course">Course Modules</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Modules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Modules ({modules?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <ModulesTable modules={modules || []} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="course">
          <Card>
            <CardHeader>
              <CardTitle>Course Modules ({courseModules.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ModulesTable modules={courseModules} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Modules ({assessmentModules.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ModulesTable modules={assessmentModules} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
