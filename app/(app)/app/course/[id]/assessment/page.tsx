import { AssessmentInterface } from "@/components/assessment-interface"

export default function AssessmentPage({ params }: { params: { id: string } }) {
  return <AssessmentInterface courseId={params.id} />
}
