"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";
import { cn } from "@/lib/utils";

interface AssessmentResultModalProps {
  assessmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AssessmentResult {
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  submitted_at: string;
  assessment_name?: string;
}

export function AssessmentResultModal({
  assessmentId,
  isOpen,
  onClose,
}: AssessmentResultModalProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && assessmentId) {
      fetchAssessmentResult();
    }
  }, [isOpen, assessmentId]);

  const fetchAssessmentResult = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      console.log("Fetching results for assessment ID:", assessmentId);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("Authentication error. Please log in again.");
      }
      
      const studentId = user.id;

      // First check if the assessment exists
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("modules")
        .select("name")
        .eq("id", assessmentId)
        .single();

      if (assessmentError) {
        console.error("Error fetching assessment:", assessmentError);
        throw new Error(`Assessment not found: ${assessmentError.message}`);
      }

      // Fetch the assessment submission for this specific student
      const { data: resultData, error: resultError } = await supabase
        .from("assessment_submissions")
        .select("score, passed, total_questions, correct_answers, submitted_at")
        .eq("assessment_id", assessmentId)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to handle case where no records found

      if (resultError) {
        console.error("Error fetching submission:", resultError);
        throw new Error(`Submission data error: ${resultError.message}`);
      }

      if (!resultData) {
        throw new Error("No submission data found for this assessment");
      }

      setResult({
        score: resultData.score,
        passed: resultData.passed,
        total_questions: resultData.total_questions,
        correct_answers: resultData.correct_answers,
        submitted_at: resultData.submitted_at,
        assessment_name: assessmentData.name,
      });

    } catch (error: any) {
      console.error("Error fetching assessment result:", error);
      setError(error.message || "Failed to load assessment results. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-white/20 dark:border-neutral-800/30">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Award className="mr-2 h-5 w-5 text-neutral-800 dark:text-neutral-300" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-400">
              Assessment Results
            </span>
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            {result?.assessment_name || "Assessment"} Results
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 dark:border-neutral-300"></div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500 dark:text-red-400 mb-2" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button 
              onClick={onClose} 
              className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
            >
              Close
            </Button>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex justify-center py-4">
              <Gauge 
                value={result.score} 
                size={150} 
                primary={
                  result.passed ? "success" : "danger"
                }
                strokeWidth={10}
                className={{
                  textClassName: "text-2xl font-semibold text-neutral-800 dark:text-white"
                }}
              />
            </div>

            <div className="flex justify-center items-center gap-2">
              <Badge 
                variant={result.passed ? "outline" : "outline"}
                className={cn(
                  "text-sm py-1.5 px-3 backdrop-blur-sm border",
                  result.passed 
                    ? "border-emerald-200 bg-emerald-50/40 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400" 
                    : "border-red-200 bg-red-50/40 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400"
                )}
              >
                {result.passed ? (
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                ) : (
                  <XCircle className="mr-1.5 h-4 w-4" />
                )}
                {result.passed ? "Passed" : "Not Passed"}
              </Badge>
            </div>

            <div className="space-y-2 bg-neutral-100/50 dark:bg-neutral-800/40 backdrop-blur-sm p-4 rounded-md border border-neutral-200/50 dark:border-neutral-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Score:</span>
                <span className="font-medium text-neutral-800 dark:text-white">{result.score}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Correct Answers:</span>
                <span className="font-medium text-neutral-800 dark:text-white">{result.correct_answers} of {result.total_questions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">Submitted:</span>
                <span className="font-medium text-neutral-800 dark:text-white">{formatDate(result.submitted_at)}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                onClick={onClose}
                className="bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">No results found for this assessment.</p>
            <Button 
              onClick={onClose} 
              className="mt-4 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 dark:from-neutral-200 dark:to-white dark:hover:from-neutral-300 dark:hover:to-neutral-100 text-white dark:text-neutral-900"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 