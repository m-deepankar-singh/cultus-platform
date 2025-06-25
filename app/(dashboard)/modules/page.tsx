import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VirtualizedModulesTableWrapper } from '@/components/modules/virtualized-modules-table-wrapper'

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
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 mb-6">
          <TabsTrigger value="all">All Modules</TabsTrigger>
          <TabsTrigger value="course">Course Modules</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Modules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <VirtualizedModulesTableWrapper isAdmin={isAdmin} initialType="all" />
        </TabsContent>
        
        <TabsContent value="course">
          <VirtualizedModulesTableWrapper isAdmin={isAdmin} initialType="Course" />
        </TabsContent>
        
        <TabsContent value="assessment">
          <VirtualizedModulesTableWrapper isAdmin={isAdmin} initialType="Assessment" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
