'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertCircle, PlayCircle, ArrowLeft, RefreshCw, XCircle, Star, TrendingUp, TrendingDown, Award, Target } from 'lucide-react';
import Link from 'next/link';

interface AnalysisResult {
  communication_skills: {
    clarity_score: number;
    pace_score: number;
    professional_language_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  technical_knowledge: {
    domain_understanding_score: number;
    depth_of_knowledge_score: number;
    accuracy_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  problem_solving: {
    structured_thinking_score: number;
    logical_approach_score: number;
    creativity_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  confidence_and_presence: {
    body_language_score: number;
    eye_contact_score: number;
    overall_confidence_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  interview_engagement: {
    responsiveness_score: number;
    engagement_level_score: number;
    listening_skills_score: number;
    overall_score: number;
    feedback: string;
    specific_examples: string;
  };
  areas_for_improvement: Array<{
    area: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    specific_feedback: string;
    examples: string;
  }>;
  strengths: Array<{
    strength: string;
    evidence: string;
    impact: string;
  }>;
  overall_assessment: {
    total_score: number;
    tier_appropriate: boolean;
    background_alignment: boolean;
    summary: string;
    key_concerns: string[];
    key_positives: string[];
  };
  final_verdict: {
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
  status: 'submitted' | 'analyzing' | 'analyzed' | 'error';
  feedback?: string;
  analysis_result?: AnalysisResult;
  score?: number;
  passed?: boolean;
  final_verdict?: string;
  createdAt: string;
  analyzedAt?: string;
  errorMessage?: string;
  questionsUsed: any[];
  background: string;
  tier: string;
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
                <CheckCircle2 className="h-8 w-8 text-green-600" />
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

      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Overall Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{totalScore}/100</div>
              <div className="text-sm text-gray-600">Total Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-lg font-semibold ${overall_assessment.tier_appropriate ? 'text-green-600' : 'text-red-600'}`}>
                {overall_assessment.tier_appropriate ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-600">Tier Appropriate</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-lg font-semibold ${overall_assessment.background_alignment ? 'text-green-600' : 'text-red-600'}`}>
                {overall_assessment.background_alignment ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-600">Background Aligned</div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Performance Summary</h4>
            <p className="text-sm text-blue-700">{overall_assessment.summary || 'No summary available'}</p>
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

      {/* Interview Engagement */}
      {interview_engagement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Interview Engagement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreDisplay score={interview_engagement.responsiveness_score || 0} label="Responsiveness" />
              <ScoreDisplay score={interview_engagement.engagement_level_score || 0} label="Engagement Level" />
              <ScoreDisplay score={interview_engagement.listening_skills_score || 0} label="Listening Skills" />
            </div>
            <ScoreDisplay score={interview_engagement.overall_score || 0} label="Overall Engagement" />
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
              <p className="text-sm text-gray-600">{interview_engagement.feedback || 'No feedback available'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Areas for Improvement */}
      {areas_for_improvement.length > 0 && (
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
      {strengths.length > 0 && (
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

export default function InterviewSubmittedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const submissionId = searchParams.get('submissionId');
  
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  // Fetch submission status
  const fetchStatus = async () => {
    if (!submissionId) {
      setError('No submission ID provided');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/app/job-readiness/interviews/status/${submissionId}`);
      const data = await response.json();

      if (data.success) {
        setSubmission(data.submission);
        
        // Stop polling if analysis is complete or failed
        if (data.submission.status === 'analyzed' || data.submission.status === 'error') {
          setPolling(false);
        }
      } else {
        setError(data.error || 'Failed to fetch submission status');
        setPolling(false);
      }
    } catch (err) {
      setError('Failed to fetch submission status');
      setPolling(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus();

    // Poll every 5 seconds if still analyzing
    let interval: NodeJS.Timeout;
    if (polling) {
      interval = setInterval(fetchStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [submissionId, polling]);

  // Handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchStatus();
  };

  // Redirect to dashboard
  const handleBackToDashboard = () => {
    router.push('/app/dashboard');
  };

  if (loading && !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading Submission Details...</h2>
            <p className="text-gray-600">Please wait while we fetch your interview status.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-800">Unable to Load Submission</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <div className="space-x-4">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={handleBackToDashboard}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
            <p className="text-gray-600 mb-6">The interview submission could not be found.</p>
            <Button onClick={handleBackToDashboard}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'submitted':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Submitted',
          description: 'Your interview has been uploaded and is queued for analysis.'
        };
      case 'analyzing':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Analyzing',
          description: 'Our AI is currently analyzing your interview performance.'
        };
      case 'analyzed':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Complete',
          description: 'Your interview has been analyzed and feedback is ready.'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Error',
          description: 'There was an issue analyzing your interview.'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          description: 'Status unknown.'
        };
    }
  };

  const statusInfo = getStatusInfo(submission.status);
  const StatusIcon = statusInfo.icon;

  // Parse structured feedback
  let analysisResult: AnalysisResult | null = null;
  if (submission.status === 'analyzed' && submission.feedback) {
    try {
      analysisResult = JSON.parse(submission.feedback);
    } catch (e) {
      console.error('Failed to parse structured feedback:', e);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Submitted Successfully! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for completing your interview. Here's what happens next.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Status Card */}
          <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <StatusIcon className={`h-8 w-8 ${statusInfo.color} ${submission.status === 'analyzing' ? 'animate-spin' : ''}`} />
                <div>
                  <CardTitle className={statusInfo.color}>
                    {statusInfo.label}
                  </CardTitle>
                  <CardDescription className="text-gray-700">
                    {statusInfo.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Submission ID:</span>
                  <span className="text-gray-600 font-mono text-xs">{submission.id}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Submitted:</span>
                  <span className="text-gray-600">
                    {new Date(submission.createdAt).toLocaleDateString()} {new Date(submission.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {submission.analyzedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Analyzed:</span>
                    <span className="text-gray-600">
                      {new Date(submission.analyzedAt).toLocaleDateString()} {new Date(submission.analyzedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {submission.status === 'analyzing' && (
                <div className="mt-4 p-3 bg-white/50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analysis in progress... This page will update automatically.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interview Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlayCircle className="h-5 w-5" />
                <span>Interview Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Background:</span>
                  <p className="text-gray-600 capitalize">
                    {submission.background.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tier Level:</span>
                  <Badge variant="outline" className="ml-2">
                    {submission.tier}
                  </Badge>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Questions Asked:</span>
                <p className="text-gray-600 text-sm mt-1">
                  {submission.questionsUsed.length} questions covering your background and experience
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">What's Next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Your video is being analyzed using advanced AI</li>
                  <li>• You'll receive detailed feedback on your performance</li>
                  <li>• Results will be available in your dashboard</li>
                  <li>• Analysis typically takes 2-5 minutes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Structured Feedback Section */}
        {submission.status === 'analyzed' && analysisResult && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">📋 Your Detailed Interview Analysis</h2>
              <p className="text-lg text-gray-600">
                Here's your comprehensive performance breakdown and personalized recommendations
              </p>
            </div>
            
            <StructuredFeedback analysisResult={analysisResult} />
          </div>
        )}

        {/* Fallback for old feedback format */}
        {submission.status === 'analyzed' && submission.feedback && !analysisResult && (
          <Card className="mt-8">
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

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleBackToDashboard} size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {submission.status === 'analyzed' && (
            <Button asChild variant="outline" size="lg">
              <Link href="/app/job-readiness">
                <PlayCircle className="w-4 h-4 mr-2" />
                Take Another Interview
              </Link>
            </Button>
          )}
          
          {(submission.status === 'submitted' || submission.status === 'analyzing') && (
            <Button onClick={handleRefresh} variant="outline" size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}