import { AssessmentInterface } from "@/components/assessment-interface"

export default async function AssessmentPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  return <AssessmentInterface courseId={resolvedParams.id} />
}
