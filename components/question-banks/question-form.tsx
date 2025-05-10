'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Define the Question types
interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ';
  options: Option[];
  correct_answer: string | { answers: string[] };
  topic?: string | null;
  difficulty?: string | null;
  created_by?: string | null;
}

// Form schema for MCQ
const mcqFormSchema = z.object({
  question_text: z.string().min(1, { message: 'Question text is required' }),
  question_type: z.literal('MCQ'),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1, { message: 'Option text is required' })
    })
  ).min(2, { message: 'At least two options are required' }),
  correct_answer: z.string().min(1, { message: 'Correct answer is required' }),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  bank_type: z.enum(['assessment', 'course']),
});

// Form schema for MSQ
const msqFormSchema = z.object({
  question_text: z.string().min(1, { message: 'Question text is required' }),
  question_type: z.literal('MSQ'),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1, { message: 'Option text is required' })
    })
  ).min(2, { message: 'At least two options are required' }),
  correct_answers: z.array(z.string()).min(1, { message: 'At least one correct answer is required' }),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  bank_type: z.enum(['assessment', 'course']),
});

// Union type for both form schemas
const formSchema = z.discriminatedUnion('question_type', [
  mcqFormSchema,
  msqFormSchema,
]);

type FormValues = z.infer<typeof formSchema>;

interface QuestionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankType: 'assessment' | 'course';
  questionToEdit?: Question;
}

export function QuestionForm({ open, onOpenChange, bankType, questionToEdit }: QuestionFormProps) {
  const router = useRouter();
  const [questionType, setQuestionType] = useState<'MCQ' | 'MSQ'>(questionToEdit?.question_type || 'MCQ');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized function to get default values
  const getDefaultValues = useCallback((): Partial<FormValues> => {
    if (questionToEdit) {
      if (questionToEdit.question_type === 'MCQ') {
        return {
          question_text: questionToEdit.question_text,
          question_type: 'MCQ',
          options: questionToEdit.options.map(opt => ({ ...opt })), // Deep copy options
          correct_answer: questionToEdit.correct_answer as string,
          topic: questionToEdit.topic || '',
          difficulty: questionToEdit.difficulty || 'none',
          bank_type: bankType,
        };
      } else { // MSQ
        return {
          question_text: questionToEdit.question_text,
          question_type: 'MSQ',
          options: questionToEdit.options.map(opt => ({ ...opt })), // Deep copy options
          // Ensure correct_answers is an array, even if it's initially null/undefined from DB
          correct_answers: Array.isArray((questionToEdit.correct_answer as { answers: string[] })?.answers)
            ? [...(questionToEdit.correct_answer as { answers: string[] }).answers] // Deep copy
            : [],
          topic: questionToEdit.topic || '',
          difficulty: questionToEdit.difficulty || 'none',
          bank_type: bankType,
        };
      }
    }
    // For new questions, use the current `questionType` state
    return {
      question_text: '',
      question_type: questionType, // Uses the local questionType state for new questions
      options: [
        { id: 'opt_a', text: '' },
        { id: 'opt_b', text: '' },
      ],
      ...(questionType === 'MCQ' ? { correct_answer: '' } : { correct_answers: [] }), // Uses local questionType state
      topic: '',
      difficulty: 'none',
      bank_type: bankType,
    };
  }, [questionToEdit, bankType, questionType]); // Dependencies for useCallback

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // defaultValues are set by useEffect/reset, but useForm needs an initial value.
    // This will use the initial state of questionToEdit & questionType on first mount.
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      // Determine the type based on the question being edited, or default for new questions
      const initialType = questionToEdit?.question_type || 'MCQ';
      // Only set if different to avoid unnecessary re-renders if the type is already correct.
      if (questionType !== initialType) {
        setQuestionType(initialType);
      }
      // Reset the form with the (potentially new) default values.
      // getDefaultValues is memoized and will have an updated reference if questionToEdit or questionType changed,
      // triggering this effect again if needed for the reset to use the latest state.
      form.reset(getDefaultValues());
    }
  }, [open, questionToEdit, form, getDefaultValues, questionType]); // Added questionType because setQuestionType can cause it to change

  // Update form when question type changes manually by the user
  const handleQuestionTypeChange = (value: 'MCQ' | 'MSQ') => {
    setQuestionType(value);
    form.setValue('question_type', value);
    
    // Reset correct answer/answers when switching types
    if (value === 'MCQ') {
      form.setValue('correct_answer', '');
    } else {
      form.setValue('correct_answers', []);
    }
  };

  // Add a new option
  const addOption = () => {
    const options = form.getValues('options');
    // Generate a new option ID (in reality, you might want a more robust ID generation)
    const newId = `opt_${String.fromCharCode(97 + options.length)}`;
    form.setValue('options', [...options, { id: newId, text: '' }]);
  };

  // Remove an option
  const removeOption = (index: number) => {
    const options = form.getValues('options');
    if (options.length <= 2) return; // Enforce minimum 2 options
    
    const updatedOptions = options.filter((_, i) => i !== index);
    form.setValue('options', updatedOptions);
    
    // Update correct answer if the removed option was selected
    const removedOption = options[index];
    if (questionType === 'MCQ') {
      const currentCorrectAnswer = form.getValues('correct_answer');
      if (currentCorrectAnswer === removedOption.id) {
        form.setValue('correct_answer', '');
      }
    } else {
      const currentCorrectAnswers = form.getValues('correct_answers');
      if (currentCorrectAnswers.includes(removedOption.id)) {
        form.setValue(
          'correct_answers', 
          currentCorrectAnswers.filter(id => id !== removedOption.id)
        );
      }
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Transform the data for the API
      const apiData = {
        question_text: data.question_text,
        question_type: data.question_type,
        options: data.options,
        bank_type: data.bank_type,
        // Convert empty strings or 'none' to null
        topic: (!data.topic || data.topic === '') ? null : data.topic,
        difficulty: (!data.difficulty || data.difficulty === '' || data.difficulty === 'none') ? null : data.difficulty,
        // Transform correct_answers to the expected format for MSQ
        ...(data.question_type === 'MCQ' 
          ? { correct_answer: data.correct_answer } 
          : { correct_answer: { answers: data.correct_answers } }
        ),
      };
      
      // Determine if we're creating a new question or updating an existing one
      const url = questionToEdit 
        ? `/api/admin/question-banks/${questionToEdit.id}` 
        : '/api/admin/question-banks';
      
      const response = await fetch(url, {
        method: questionToEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${questionToEdit ? 'update' : 'create'} question`);
      }
      
      // Close the dialog and refresh the data
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {questionToEdit ? 'Edit Question' : 'Add New Question'}
          </DialogTitle>
          <DialogDescription>
            {questionToEdit 
              ? 'Update the question details below.' 
              : `Create a new ${bankType} question.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Question Type */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Type</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={(value: 'MCQ' | 'MSQ') => {
                      field.onChange(value);
                      handleQuestionTypeChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="MSQ">Multiple Select (MSQ)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {questionType === 'MCQ' 
                      ? 'Multiple Choice: Select one correct answer.' 
                      : 'Multiple Select: Select one or more correct answers.'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Question Text */}
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the question text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Options */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FormLabel>Options</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addOption}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
              
              {form.watch('options').map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`options.${index}.id`}
                    render={({ field }) => (
                      <FormItem className="w-1/4">
                        <FormLabel className="sr-only">Option ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ID" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`options.${index}.text`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="sr-only">Option Text</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Option text" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={form.watch('options').length <= 2}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove option</span>
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Correct Answer(s) */}
            {questionType === 'MCQ' ? (
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the correct answer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.watch('options').map((option, index) => (
                          <SelectItem key={index} value={option.id}>
                            {option.text || `Option ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="correct_answers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answers</FormLabel>
                    <div className="space-y-2">
                      {form.watch('options').map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`correct-${option.id}`}
                            className="h-4 w-4"
                            value={option.id}
                            checked={field.value?.includes(option.id)}
                            onChange={(e) => {
                              const updatedValues = e.target.checked
                                ? [...(field.value || []), option.id]
                                : (field.value || []).filter((id) => id !== option.id);
                              field.onChange(updatedValues);
                            }}
                          />
                          <label htmlFor={`correct-${option.id}`}>
                            {option.text || `Option ${index + 1}`}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Topic */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Mathematics, Programming, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Difficulty */}
            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty (Optional)</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Hidden field for bank_type */}
            <input type="hidden" {...form.register('bank_type')} value={bankType} />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (questionToEdit ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 