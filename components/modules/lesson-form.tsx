"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { VideoUploader } from "./video-uploader"
import { QuizSelector } from "./quiz-selector"

// Question interface to match quiz-selector component
interface Question {
  id: string
  question_text: string
  question_type: "MCQ" | "MSQ"
  options: { id: string; text: string }[]
  correct_answer: string | { answers: string[] }
  topic?: string
  difficulty?: string
}

// Form schema for lessons
const lessonSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  has_quiz: z.boolean().default(false),
})

type LessonFormValues = z.infer<typeof lessonSchema> & {
  video_url?: string | null
  video_path?: string | null
  quiz_questions?: Question[]
}

interface LessonFormProps {
  moduleId: string
  lesson?: {
    id?: string
    title: string
    description?: string | null
    video_url?: string | null
    has_quiz?: boolean
    quiz_questions?: Question[]
  }
  onSubmit: (values: LessonFormValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function LessonForm({
  moduleId,
  lesson,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: LessonFormProps) {
  const [videoUrl, setVideoUrl] = useState<string | undefined>(
    lesson?.video_url || undefined
  )
  const [videoPath, setVideoPath] = useState<string>("")
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(
    lesson?.quiz_questions || []
  )

  // Initialize the form with existing values or defaults
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: lesson?.title || "",
      description: lesson?.description || "",
      has_quiz: lesson?.has_quiz || false,
      video_url: lesson?.video_url || "",
      quiz_questions: lesson?.quiz_questions || [],
    },
  })

  // Get the current value of has_quiz
  const hasQuiz = form.watch("has_quiz")

  // Handle video upload completion
  const handleVideoUpload = (url: string, path: string) => {
    setVideoUrl(url)
    setVideoPath(path)
    form.setValue("video_url", url)
  }

  // Handle quiz questions change
  const handleQuizQuestionsChange = (questions: Question[]) => {
    setQuizQuestions(questions)
  }

  // Handle form submission
  const handleSubmitForm = async (values: LessonFormValues) => {
    // Validation Check 1: Video URL must exist
    if (!videoUrl) {
      form.setError("video_url", { // We don't have a direct field for video_url in the schema
        type: "manual",
        message: "A video must be uploaded for the lesson.",
      });
      // Optionally use toast for a general message
      // toast({ variant: "destructive", title: "Validation Error", description: "Missing video URL." });
      return; 
    }
    
    // Validation Check 2: If has_quiz is true, quizQuestions must not be empty
    if (values.has_quiz && quizQuestions.length === 0) {
      form.setError("has_quiz", { // Associate error with the checkbox
        type: "manual",
        message: "If 'Include Quiz' is checked, you must select at least one quiz question.",
      });
      // toast({ variant: "destructive", title: "Validation Error", description: "Quiz questions missing." });
      return; 
    }
    
    // Clear potential previous manual errors if validation passes now
    form.clearErrors("video_url"); 
    form.clearErrors("has_quiz");

    // Include the video path and quiz questions in the submission
    const formData = {
      ...values,
      video_url: videoUrl || null,
      video_path: videoPath || null, // Assuming videoPath state is managed correctly
      quiz_questions: hasQuiz ? quizQuestions : [],
    }
    
    await onSubmit(formData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
        {/* Add a scrollable container for the form content */}
        <div className="space-y-6 overflow-y-auto scroll-smooth pr-4 max-h-[65vh]"> 
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter lesson title" {...field} />
                </FormControl>
                <FormDescription>
                  A clear, concise title for this lesson
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter a description of this lesson"
                    className="resize-none min-h-[120px]"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Briefly describe what this lesson covers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Lesson Video</FormLabel>
            <VideoUploader
              onUploadComplete={handleVideoUpload}
              currentVideoUrl={lesson?.video_url || undefined}
              moduleId={moduleId}
            />
            <FormDescription>
              Upload a video for this lesson (MP4 format recommended)
            </FormDescription>
            {/* Display validation error for video_url here */}
            {form.formState.errors.video_url && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.video_url.message}
              </p>
            )}
          </div>

          <FormField
            control={form.control}
            name="has_quiz"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Include Quiz
                  </FormLabel>
                  <FormDescription>
                    Add a quiz at the end of this lesson
                  </FormDescription>
                </div>
                {/* Display validation error for has_quiz here */}
                {form.formState.errors.has_quiz && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.has_quiz.message}
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Show quiz selector only when has_quiz is true */}
          {hasQuiz && (
            <div className="pt-4 border-t">
              <QuizSelector
                selectedQuestions={quizQuestions}
                onChange={handleQuizQuestionsChange}
                disabled={isSubmitting}
                lessonId={lesson?.id}
              />
            </div>
          )}
        </div>
        {/* Move buttons outside the scrollable div */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lesson?.id ? "Update Lesson" : "Create Lesson"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 