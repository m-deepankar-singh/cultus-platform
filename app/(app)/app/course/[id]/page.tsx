import { CourseView } from "@/components/course-view"

export default function CoursePage({ params }: { params: { id: string } }) {
  return <CourseView courseId={params.id} />
}
