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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Award className="mr-2 h-5 w-5 text-primary" />
            Assessment Results
          </DialogTitle>
          <DialogDescription>
            {result?.assessment_name || "Assessment"} Results
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <p className="text-destructive">{error}</p>
            <Button onClick={onClose} className="mt-4">
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
                  textClassName: "text-2xl"
                }}
              />
            </div>

            <div className="flex justify-center items-center gap-2">
              <Badge 
                variant={result.passed ? "success" : "destructive"}
                className="text-sm py-1 px-3"
              >
                {result.passed ? (
                  <CheckCircle className="mr-1 h-4 w-4" />
                ) : (
                  <XCircle className="mr-1 h-4 w-4" />
                )}
                {result.passed ? "Passed" : "Not Passed"}
              </Badge>
            </div>

            <div className="space-y-2 bg-muted p-4 rounded-md">
              <div className="flex justify-between text-sm">
                <span>Score:</span>
                <span className="font-medium">{result.score}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Correct Answers:</span>
                <span className="font-medium">{result.correct_answers} of {result.total_questions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Submitted:</span>
                <span className="font-medium">{formatDate(result.submitted_at)}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p>No results found for this assessment.</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 