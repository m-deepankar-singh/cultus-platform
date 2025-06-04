'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  RotateCcw, 
  RefreshCw,
  Star,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Target
} from 'lucide-react';
import Link from 'next/link';

interface AnalysisResult {
  communication_skills?: {
    clarity_score: number;
    pace_score: number;
    professional_language_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  technical_knowledge?: {
    domain_understanding_score: number;
    depth_of_knowledge_score: number;
    accuracy_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  problem_solving?: {
    structured_thinking_score: number;
    logical_approach_score: number;
    creativity_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  confidence_and_presence?: {
    body_language_score: number;
    eye_contact_score: number;
    overall_confidence_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  interview_engagement?: {
    responsiveness_score: number;
    engagement_level_score: number;
    listening_skills_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  areas_for_improvement?: Array<{
    area: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    specific_feedback: string;
    examples: string;
  }>;
  strengths?: Array<{
    strength: string;
    evidence: string;
    impact: string;
  }>;
  overall_assessment?: {
    total_score: number;
    tier_appropriate: boolean;
    background_alignment: boolean;
    summary: string;
    key_concerns: string[];
    key_positives: string[];
  };
  final_verdict?: {
    decision: 'APPROVED' | 'REJECTED';
    confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning: string;
    minimum_score_met: boolean;
    tier_requirements_met: boolean;
    recommendation: string;
  };
}

interface SubmissionStatus {
  id: string;
  status?: 'submitted' | 'analyzing' | 'analyzed' | 'error';
  feedback?: string;
  analysis_result?: AnalysisResult;
  score?: number;
  passed?: boolean;
  final_verdict?: string;
  createdAt?: string;
  analyzedAt?: string;
  errorMessage?: string;
  questionsUsed?: any[];
  background?: string;
  tier?: string;
}

// Component to display score with color coding
const ScoreDisplay = ({ score, maxScore = 10, label }: { score: number; maxScore?: number; label: string }) => {
  const percentage = (score / maxScore) * 100;
  const getColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBarColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${getColor()}`}>
          {score}/{maxScore}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Component to display priority badges
const PriorityBadge = ({ priority }: { priority: 'HIGH' | 'MEDIUM' | 'LOW' }) => {
  const variants = {
    HIGH: 'bg-red-100 text-red-800 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <Badge className={`${variants[priority]} border`}>
      {priority}
    </Badge>
  );
};

// Component to display the structured feedback
const StructuredFeedback = ({ analysisResult }: { analysisResult: AnalysisResult }) => {
  const { 
    communication_skills, 
    technical_knowledge, 
    problem_solving, 
    confidence_and_presence, 
    interview_engagement,
    areas_for_improvement = [],
    strengths = [],
    overall_assessment,
    final_verdict
  } = analysisResult;

  // Safety checks for required data
  if (!overall_assessment || !final_verdict) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analysis Data Incomplete</h3>
          <p className="text-gray-600">The analysis results are incomplete. Please try refreshing the page.</p>
        </CardContent>
      </Card>
    );
  }

  const totalScore = overall_assessment.total_score || 0;
  const decision = final_verdict.decision || 'REJECTED';

  return (
    <div className="space-y-8">
      {/* Final Verdict Banner */}
      <Card className={`border-2 ${decision === 'APPROVED' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {decision === 'APPROVED' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <h3 className={`text-xl font-bold ${decision === 'APPROVED' ? 'text-green-800' : 'text-red-800'}`}>
                  {decision === 'APPROVED' ? 'Congratulations! You Passed!' : 'Interview Not Passed'}
                </h3>
                <p className={`text-sm ${decision === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                  Confidence Level: {final_verdict.confidence_level || 'MEDIUM'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${decision === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                {totalScore}/100
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white/50 rounded-lg">
            <p className="text-sm text-gray-800 font-medium mb-2">Decision Reasoning:</p>
            <p className="text-sm text-gray-700">{final_verdict.reasoning || 'No reasoning provided'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Skills Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Skills */}
        {communication_skills && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💬 Communication Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreDisplay score={communication_skills.clarity_score || 0} label="Clarity & Articulation" />
              <ScoreDisplay score={communication_skills.pace_score || 0} label="Speaking Pace" />
              <ScoreDisplay score={communication_skills.professional_language_score || 0} label="Professional Language" />
              <ScoreDisplay score={communication_skills.overall_score || 0} label="Overall Communication" />
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
                <p className="text-sm text-gray-600">{communication_skills.feedback || 'No feedback available'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Knowledge */}
        {technical_knowledge && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔧 Technical Knowledge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreDisplay score={technical_knowledge.domain_understanding_score || 0} label="Domain Understanding" />
              <ScoreDisplay score={technical_knowledge.depth_of_knowledge_score || 0} label="Knowledge Depth" />
              <ScoreDisplay score={technical_knowledge.accuracy_score || 0} label="Technical Accuracy" />
              <ScoreDisplay score={technical_knowledge.overall_score || 0} label="Overall Technical" />
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
                <p className="text-sm text-gray-600">{technical_knowledge.feedback || 'No feedback available'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problem Solving */}
        {problem_solving && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🧠 Problem Solving</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreDisplay score={problem_solving.structured_thinking_score || 0} label="Structured Thinking" />
              <ScoreDisplay score={problem_solving.logical_approach_score || 0} label="Logical Approach" />
              <ScoreDisplay score={problem_solving.creativity_score || 0} label="Creativity" />
              <ScoreDisplay score={problem_solving.overall_score || 0} label="Overall Problem Solving" />
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
                <p className="text-sm text-gray-600">{problem_solving.feedback || 'No feedback available'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confidence & Presence */}
        {confidence_and_presence && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎭 Confidence & Presence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreDisplay score={confidence_and_presence.body_language_score || 0} label="Body Language" />
              <ScoreDisplay score={confidence_and_presence.eye_contact_score || 0} label="Eye Contact" />
              <ScoreDisplay score={confidence_and_presence.overall_confidence_score || 0} label="Overall Confidence" />
              <ScoreDisplay score={confidence_and_presence.overall_score || 0} label="Overall Presence" />
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
                <p className="text-sm text-gray-600">{confidence_and_presence.feedback || 'No feedback available'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Areas for Improvement */}
      {areas_for_improvement && areas_for_improvement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Areas for Improvement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {areas_for_improvement.map((area, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-800">{area.area}</h4>
                    <PriorityBadge priority={area.priority} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{area.specific_feedback}</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Examples: </span>
                    {area.examples}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Your Strengths</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strengths.map((strength, index) => (
                <div key={index} className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">{strength.strength}</h4>
                  <p className="text-sm text-green-700 mb-2">{strength.evidence}</p>
                  <div className="text-xs text-green-600">
                    <span className="font-medium">Impact: </span>
                    {strength.impact}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5" />
            <span>Next Steps & Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{final_verdict.recommendation || 'No recommendations available'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function InterviewFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmission = async () => {
    if (!submissionId) {
      setError('No submission ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/app/job-readiness/interviews/status/${submissionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch interview results');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSubmission(data.submission);
      } else {
        setError(data.error || 'Failed to fetch submission status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const handleRetakeInterview = () => {
    router.push('/app/job-readiness/interviews');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    fetchSubmission();
  };

  if (isLoading) {
    return (
      <JobReadinessLayout title="Interview Results" description="Loading your interview feedback">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </JobReadinessLayout>
    );
  }

  if (error) {
    return (
      <JobReadinessLayout title="Interview Results" description="Unable to load interview feedback">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/app/job-readiness/interviews">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Interviews
              </Link>
            </Button>
          </div>
        </div>
      </JobReadinessLayout>
    );
  }

  if (!submission) {
    return (
      <JobReadinessLayout title="Interview Results" description="Interview submission not found">
        <div className="max-w-4xl mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
          <p className="text-gray-600 mb-6">The interview submission could not be found.</p>
          <Button asChild>
            <Link href="/app/job-readiness/interviews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interviews
            </Link>
          </Button>
        </div>
      </JobReadinessLayout>
    );
  }

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'submitted':
        return { label: 'Submitted', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
      case 'analyzing':
        return { label: 'Analyzing', color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'analyzed':
        return { label: 'Complete', color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'error':
        return { label: 'Error', color: 'text-red-600', bgColor: 'bg-red-50' };
      default:
        return { label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const statusInfo = getStatusInfo(submission.status);
  const isAnalyzed = submission.status === 'analyzed';

  // Parse structured feedback
  let analysisResult: AnalysisResult | null = null;
  if (isAnalyzed && submission.feedback) {
    try {
      analysisResult = JSON.parse(submission.feedback);
    } catch (e) {
      console.error('Failed to parse structured feedback:', e);
    }
  }

  return (
    <JobReadinessLayout
      title="Interview Results"
      description="Your AI-powered interview analysis and feedback"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/job-readiness/interviews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interviews
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRetakeInterview}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Interview
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {submission.passed ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <CardTitle className="text-xl">
                    Interview {submission.passed ? 'Passed' : 'Needs Improvement'}
                  </CardTitle>
                  <CardDescription>
                    {submission.createdAt ? 
                      `Submitted ${new Date(submission.createdAt).toLocaleDateString()}` :
                      'Submission date unavailable'
                    }
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={submission.passed ? "default" : "secondary"} className="text-sm">
                  {statusInfo.label}
                </Badge>
                {submission.score && (
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-blue-600">
                      {Math.round(submission.score)}%
                    </span>
                    <span className="text-sm text-gray-600 ml-1">Overall Score</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          {!isAnalyzed && (
            <CardContent>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Your interview is being analyzed. Results will be available shortly.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>

        {/* Structured Analysis Results */}
        {isAnalyzed && analysisResult && (
          <StructuredFeedback analysisResult={analysisResult} />
        )}

        {/* Fallback for old feedback format */}
        {isAnalyzed && submission.feedback && !analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">📋 Your Interview Feedback</CardTitle>
              <CardDescription>
                Here's your personalized analysis and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">
                  {submission.feedback}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {isAnalyzed && (
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {submission.passed ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">🎉 Congratulations!</h4>
                    <p className="text-green-700 text-sm mb-3">
                      You've successfully completed the simulated interview and earned your 5th star! 
                      You're now ready for the job market.
                    </p>
                    <Button asChild>
                      <Link href="/app/job-readiness">
                        Return to Job Readiness Dashboard
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 mb-2">Keep Practicing</h4>
                    <p className="text-orange-700 text-sm mb-3">
                      Use the feedback above to improve your interview skills. You can retake 
                      the interview as many times as needed to pass.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleRetakeInterview}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/app/job-readiness">
                          Back to Dashboard
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </JobReadinessLayout>
  );
} 