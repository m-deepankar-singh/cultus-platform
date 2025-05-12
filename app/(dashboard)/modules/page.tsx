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
  
  // Get current user and role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()
  
  const isAdmin = userProfile?.role === 'Admin'
  
  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Modules Management</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Create and manage all modules from this centralized location" 
              : "View all modules from this centralized location"}
          </p>
        </div>
        
        {isAdmin && <ModuleCreateButton />}
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
              <CardTitle>All Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <ModulesTable initialModules={[]} isAdmin={isAdmin} initialType="all" />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="course">
          <Card>
            <CardHeader>
              <CardTitle>Course Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <ModulesTable initialModules={[]} isAdmin={isAdmin} initialType="Course" />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assessment">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <ModulesTable initialModules={[]} isAdmin={isAdmin} initialType="Assessment" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
