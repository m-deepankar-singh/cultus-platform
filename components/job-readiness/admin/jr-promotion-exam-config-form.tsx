"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { JrPromotionExamConfig } from "./jr-promotion-exam-config-table"

const formSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  is_enabled: z.boolean().default(true),
  question_count: z.number().min(1, "Must have at least 1 question").max(100, "Cannot exceed 100 questions"),
  pass_threshold: z.number().min(1, "Pass threshold must be at least 1%").max(100, "Pass threshold cannot exceed 100%"),
  time_limit_minutes: z.number().min(1, "Time limit must be at least 1 minute").max(480, "Time limit cannot exceed 8 hours"),
  system_prompt: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Product {
  id: string
  name: string
}

interface JrPromotionExamConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: JrPromotionExamConfig | null
  products: Product[]
  onSubmit: (data: FormData) => Promise<void>
  isLoading?: boolean
}

export function JrPromotionExamConfigForm({
  open,
  onOpenChange,
  config,
  products,
  onSubmit,
  isLoading = false,
}: JrPromotionExamConfigFormProps) {
  const isEditing = !!config

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: "",
      is_enabled: true,
      question_count: 25,
      pass_threshold: 70,
      time_limit_minutes: 60,
      system_prompt: "",
    },
  })

  // Reset form when config changes
  React.useEffect(() => {
    if (config) {
      form.reset({
        product_id: config.product_id,
        is_enabled: config.is_enabled,
        question_count: config.question_count,
        pass_threshold: config.pass_threshold,
        time_limit_minutes: config.time_limit_minutes,
        system_prompt: config.system_prompt || "",
      })
    } else {
      form.reset({
        product_id: "",
        is_enabled: true,
        question_count: 25,
        pass_threshold: 70,
        time_limit_minutes: 60,
        system_prompt: "",
      })
    }
  }, [config, form])

  const handleSubmit = async (data: FormData) => {
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Form submission error:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Promotion Exam Configuration" : "Create Promotion Exam Configuration"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the promotion exam configuration settings."
              : "Configure promotion exam settings for a Job Readiness product."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isEditing} // Don't allow changing product when editing
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {isEditing 
                        ? "Product cannot be changed when editing a configuration."
                        : "Select the Job Readiness product for this exam configuration."
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Exam</FormLabel>
                      <FormDescription>
                        When enabled, students can take the promotion exam for this product.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="question_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of questions in the exam (1-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pass_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pass Threshold (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum score to pass (1-100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time_limit_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="480"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Time limit in minutes (1-480)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="system_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter custom system prompt for AI-generated questions..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Custom system prompt for AI question generation. Leave empty to use default prompt.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Configuration" : "Create Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 