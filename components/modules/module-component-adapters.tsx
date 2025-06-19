"use client"

import { ModuleComponent } from "./module-save-manager"

// Module Core Component
export class ModuleCoreAdapter implements ModuleComponent {
  id: string
  type: string
  data: {
    moduleId: string
    name: string
    description?: string
    type: "Course" | "Assessment"
    configuration: Record<string, any>
  }

  constructor(moduleId: string, moduleData: any) {
    this.id = moduleId
    this.type = "Module Core"
    this.data = {
      moduleId,
      name: moduleData?.name || "",
      description: moduleData?.description || "",
      type: moduleData?.type || "Course",
      configuration: moduleData?.configuration || {}
    }
  }

  validate() {
    if (!this.data.name || this.data.name.trim() === "") {
      return {
        isValid: false,
        message: "Module name is required",
        field: "name"
      }
    }

    if (this.data.type === "Assessment") {
      if (!this.data.configuration.time_limit_minutes) {
        return {
          isValid: false,
          message: "Time limit is required for Assessment modules",
          field: "time_limit_minutes"
        }
      }
    }

    return { isValid: true, message: "Valid" }
  }

  async save() {
    try {
      const response = await fetch(`/api/admin/modules/${this.data.moduleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.data.name,
          description: this.data.description,
          configuration: this.data.configuration
        }),
      })

      if (!response.ok) {
        // Check if response has content before trying to parse it as JSON
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            throw new Error(errorData.message || `Failed to save module core data: ${response.status} ${response.statusText}`)
          } catch {
            // If JSON parsing fails, use the status text
            throw new Error(`Failed to save module core data: ${response.status} ${response.statusText}`)
          }
        } else {
          throw new Error(`Failed to save module core data: ${response.status} ${response.statusText}`)
        }
      }

      return await response.json()
    } catch (error) {
      console.error("Error saving module core:", error)
      throw error
    }
  }
}

// Course Lessons Component
export class CourseLessonsAdapter implements ModuleComponent {
  id: string
  type: string
  data: {
    moduleId: string
    lessons: any[]
  }

  constructor(moduleId: string, lessons: any[] = []) {
    this.id = `${moduleId}-lessons`
    this.type = "Course Lessons"
    this.data = {
      moduleId,
      lessons
    }
  }

  validate() {
    // Check if lessons exist
    if (this.data.lessons.length === 0) {
      return {
        isValid: false,
        message: "Course module must have at least one lesson",
        field: "lessons"
      }
    }

    // Check each lesson has required fields
    for (let i = 0; i < this.data.lessons.length; i++) {
      const lesson = this.data.lessons[i]
      
      if (!lesson.title || lesson.title.trim() === "") {
        return {
          isValid: false,
          message: `Lesson ${i + 1} must have a title`,
          field: `lesson_${i}_title`
        }
      }

      if (!lesson.video_url) {
        return {
          isValid: false,
          message: `Lesson ${i + 1} must have a video`,
          field: `lesson_${i}_video`
        }
      }

      // If lesson has quiz enabled, it must have questions
      if (lesson.has_quiz && (!lesson.quiz_questions || lesson.quiz_questions.length === 0)) {
        return {
          isValid: false,
          message: `Lesson ${i + 1} has quiz enabled but no questions selected`,
          field: `lesson_${i}_quiz`
        }
      }
    }

    return { isValid: true, message: "Valid" }
  }

  async save() {
    try {
      // First, ensure the lessons have proper sequence numbers
      const updatedLessons = this.data.lessons.map((lesson, index) => ({
        ...lesson,
        sequence: index + 1
      }))

      // Save lesson order
      const response = await fetch(`/api/admin/modules/${this.data.moduleId}/lessons/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessons: updatedLessons.map(l => ({ id: l.id, sequence: l.sequence })) }),
      })

      if (!response.ok) {
        // Check if response has content before trying to parse it as JSON
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            throw new Error(errorData.message || `Failed to save lesson order: ${response.status} ${response.statusText}`)
          } catch {
            // If JSON parsing fails, use the status text
            throw new Error(`Failed to save lesson order: ${response.status} ${response.statusText}`)
          }
        } else {
          throw new Error(`Failed to save lesson order: ${response.status} ${response.statusText}`)
        }
      }

      return await response.json()
    } catch (error) {
      console.error("Error saving course lessons:", error)
      throw error
    }
  }
}

// Assessment Questions Component
export class AssessmentQuestionsAdapter implements ModuleComponent {
  id: string
  type: string
  data: {
    moduleId: string
    questions: any[]
  }

  constructor(moduleId: string, questions: any[] = []) {
    this.id = `${moduleId}-questions`
    this.type = "Assessment Questions"
    this.data = {
      moduleId,
      questions
    }
  }

  validate() {
    // Check if questions exist
    if (this.data.questions.length === 0) {
      return {
        isValid: false,
        message: "Assessment module must have at least one question",
        field: "questions"
      }
    }

    // Check minimum number of questions
    if (this.data.questions.length < 5) {
      return {
        isValid: false,
        message: "Assessment should have at least 5 questions",
        field: "questions_count"
      }
    }

    // Validate individual questions
    for (let i = 0; i < this.data.questions.length; i++) {
      const question = this.data.questions[i]
      
      if (!question.question_text || question.question_text.trim() === "") {
        return {
          isValid: false,
          message: `Question ${i + 1} must have question text`,
          field: `question_${i}_text`
        }
      }

      // Make sure all questions have correct answers
      if (!question.correct_answer || 
          (Array.isArray(question.correct_answer) && question.correct_answer.length === 0)) {
        return {
          isValid: false,
          message: `Question ${i + 1} must have a correct answer specified`,
          field: `question_${i}_answer`
        }
      }
    }

    return { isValid: true, message: "Valid" }
  }

  async save() {
    try {
      // Prepare the data with updated sequence numbers
      const updatedQuestions = this.data.questions.map((q, index) => ({
        id: q.id,
        sequence: index + 1,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer
      }))
      
      // Make API call to update questions
      const response = await fetch(`/api/admin/modules/${this.data.moduleId}/assessment-questions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions: updatedQuestions }),
      })

      if (!response.ok) {
        // Check if response has content before trying to parse it as JSON
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            throw new Error(errorData.message || `Failed to save assessment questions: ${response.status} ${response.statusText}`)
          } catch {
            // If JSON parsing fails, use the status text
            throw new Error(`Failed to save assessment questions: ${response.status} ${response.statusText}`)
          }
        } else {
          throw new Error(`Failed to save assessment questions: ${response.status} ${response.statusText}`)
        }
      }

      return await response.json()
    } catch (error) {
      console.error("Error saving assessment questions:", error)
      throw error
    }
  }
}

// Factory function to create appropriate component adapters
export function createModuleComponentAdapters(moduleId: string, moduleType: "Course" | "Assessment", moduleData: any) {
  const components: ModuleComponent[] = []
  
  // Add core module adapter
  components.push(new ModuleCoreAdapter(moduleId, moduleData))
  
  // Add type-specific components
  if (moduleType === "Course") {
    components.push(new CourseLessonsAdapter(moduleId, moduleData.lessons || []))
  } else if (moduleType === "Assessment") {
    components.push(new AssessmentQuestionsAdapter(moduleId, moduleData.questions || []))
  }
  
  return components
} 