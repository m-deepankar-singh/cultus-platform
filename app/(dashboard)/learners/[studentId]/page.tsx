import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { format } from 'date-fns';

// Loading fallback component
function LearnerDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-10 w-24 bg-gray-200 animate-pulse rounded-md"></div>
      <Card>
        <CardHeader className="h-20 bg-gray-100 animate-pulse"></CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="h-24 bg-gray-200 animate-pulse rounded-md"></div>
            <div className="h-64 bg-gray-200 animate-pulse rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function LearnerDetail({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  
  // Fetch student data
  const { data: student, error } = await supabase
    .from('students')
    .select('id, created_at, updated_at, client_id, is_active, full_name, email, phone_number, star_rating, last_login_at')
    .eq('id', studentId)
    .single();
  
  if (error || !student) {
    console.error('Error fetching student:', error);
    notFound();
  }
  
  // Fetch client data
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', student.client_id)
    .single();
  
  // Fetch student progress data
  const { data: moduleProgress } = await supabase
    .from('student_module_progress')
    .select('*, module:modules(id, name, type)')
    .eq('student_id', studentId);
  
  // Fetch student product assignments
  const { data: productAssignments, error: productError } = await supabase
    .from('student_product_assignments')
    .select('*, product:products(id, name, description)')
    .eq('student_id', studentId);
    
  if (productError) {
    console.error('Error fetching product assignments:', productError);
  }
  
  // Generate initials from the student's name
  const initials = student.full_name
    .split(' ')
    .map((name: string) => name[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/learners">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Learners
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{student.full_name}</CardTitle>
              <CardDescription>
                {student.email || 'No email provided'}
              </CardDescription>
            </div>
            <Badge variant={student.is_active ? "success" : "secondary"}>
              {student.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Client</span>
                <span>{client?.name || 'Unknown'}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span>{student.phone_number || 'Not provided'}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Enrolled on</span>
                <span>{student.created_at ? format(new Date(student.created_at), 'PPP') : 'Unknown'}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span>{student.last_login_at ? format(new Date(student.last_login_at), 'PPP') : 'Never'}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Tabs defaultValue="progress">
                <TabsList>
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                </TabsList>
                
                <TabsContent value="progress" className="pt-4">
                  {moduleProgress && moduleProgress.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="px-4 py-3 font-medium">Module Progress</div>
                      <div className="border-t">
                        {moduleProgress.map((progress) => (
                          <div key={progress.module_id} className="px-4 py-3 flex items-center justify-between border-b last:border-0">
                            <div>
                              <div className="font-medium">{progress.module?.name || `Module ID: ${progress.module_id}`}</div>
                              <div className="text-sm text-muted-foreground">
                                Status: {progress.status}
                              </div>
                              {progress.module?.type && (
                                <div className="text-xs text-muted-foreground">
                                  Type: {progress.module.type}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div>{progress.progress_percentage ?? 0}%</div>
                              {progress.completed_at && (
                                <div className="text-sm text-muted-foreground">
                                  Completed: {format(new Date(progress.completed_at), 'PPP')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No progress data available for this learner.
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="products" className="pt-4">
                  {productAssignments && productAssignments.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="px-4 py-3 font-medium">Assigned Products</div>
                      <div className="border-t">
                        {productAssignments.map((assignment) => (
                          <div key={assignment.product_id} className="px-4 py-3 flex flex-col gap-1 border-b last:border-0">
                            <div className="font-medium">{assignment.product?.name || 'Unknown Product'}</div>
                            <div className="text-sm text-muted-foreground">
                              {assignment.product?.description || 'No description available'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Assigned: {assignment.created_at ? format(new Date(assignment.created_at), 'PPP') : 'Unknown'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No products assigned to this learner.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function LearnerDetailPage({
  params,
}: {
  params: { studentId: string };
}) {
  // Parse params before using them, ensuring they're properly awaited
  const studentId = params.studentId;
  
  return (
    <div className="p-4 md:p-8">
      <Suspense fallback={<LearnerDetailSkeleton />}>
        <LearnerDetail studentId={studentId} />
      </Suspense>
    </div>
  );
} 