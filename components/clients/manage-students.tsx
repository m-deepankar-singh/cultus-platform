"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, UserPlus, Mail, UserX, EyeOff, Eye } from "lucide-react"
import { EnrollStudentModal } from "@/components/clients/enroll-student-modal"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface Student {
  id: string
  full_name: string
  email: string | null
  created_at: string
  is_active: boolean
  last_login_at: string | null
}

interface ManageStudentsProps {
  clientId: string
  clientName: string
}

export function ManageStudents({ clientId, clientName }: ManageStudentsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const { toast } = useToast()

  // Fetch enrolled students
  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/staff/clients/${clientId}/students`)
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      toast({
        title: "Error",
        description: "Failed to load enrolled students. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Unenroll a student
  const handleUnenrollStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unenroll "${studentName}" from this client?`)) {
      return
    }

    try {
      const response = await fetch(`/api/staff/clients/${clientId}/students?studentId=${studentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      toast({
        title: "Student unenrolled",
        description: `${studentName} has been unenrolled from ${clientName}.`,
      })
      
      // Refresh the list
      fetchStudents()
    } catch (error) {
      console.error("Failed to unenroll student:", error)
      toast({
        title: "Error",
        description: "Failed to unenroll student. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Toggle student active status
  const handleToggleActiveStatus = async (studentId: string, studentName: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    const action = newStatus ? "activate" : "deactivate"
    
    if (!confirm(`Are you sure you want to ${action} "${studentName}"?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/staff/clients/${clientId}/students?studentId=${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: newStatus }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      toast({
        title: `Student ${action}d`,
        description: `${studentName} has been ${action}d.`,
      })
      
      // Refresh the list
      fetchStudents()
    } catch (error) {
      console.error(`Failed to ${action} student:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} student. Please try again.`,
        variant: "destructive",
      })
    }
  }

  // Load students on component mount
  useEffect(() => {
    fetchStudents()
  }, [clientId])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>Students enrolled under this client</CardDescription>
        </div>
        <Button onClick={() => setShowEnrollModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Enroll Student
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-800"></div>
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No students enrolled yet.
          </p>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between rounded-md border p-4 hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {student.full_name}
                      {!student.is_active && (
                        <Badge variant="outline" className="ml-2 text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-1 h-3.5 w-3.5" />
                      <span>{student.email || "No email"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground mr-2">
                    Enrolled: {student.created_at ? format(new Date(student.created_at), "MMM d, yyyy") : "Unknown"}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className={student.is_active ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}
                    onClick={() => handleToggleActiveStatus(student.id, student.full_name, student.is_active)}
                    title={student.is_active ? "Deactivate student" : "Activate student"}
                  >
                    {student.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleUnenrollStudent(student.id, student.full_name)}
                    title="Unenroll student"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <EnrollStudentModal
        open={showEnrollModal}
        setOpen={setShowEnrollModal}
        clientId={clientId}
        clientName={clientName}
        onSuccess={fetchStudents}
      />
    </Card>
  )
} 