'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout';
import { PerformantAnimatedCard, CardGrid } from '@/components/ui/performant-animated-card';
import { OptimizedProgressRing } from '@/components/ui/optimized-progress-ring';
import { AnimatedButton } from '@/components/ui/animated-button';
import { DashboardLoadingSkeleton } from '@/components/ui/dashboard-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
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

// Component to display score with color coding using OptimizedProgressRing
const ScoreDisplay = ({ score, maxScore = 10, label, delay = 0 }: { score: number; maxScore?: number; label: string; delay?: number }) => {
  const percentage = (score / maxScore) * 100;
  
  const getProgressColor = (): "primary" | "success" | "warning" | "danger" => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    if (percentage >= 40) return 'warning';
    return 'danger';
  };

  const getTextColor = () => {
    if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (percentage >= 60) return 'text-amber-600 dark:text-amber-400';
    if (percentage >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-neutral-50/50 to-neutral-100/50 dark:from-neutral-800/50 dark:to-neutral-900/50 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-sm">
      <div className="flex-shrink-0">
        <OptimizedProgressRing
          value={percentage}
          size={48}
          strokeWidth={4}
          showValue={false}
          color={getProgressColor()}
          delay={delay}
        />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={`text-sm font-bold ${getTextColor()}`}>
            {score}/{maxScore}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {Math.round(percentage)}% score
        </div>
      </div>
    </div>
  );
};

// Component to display priority badges with dark mode support
const PriorityBadge = ({ priority }: { priority: 'HIGH' | 'MEDIUM' | 'LOW' }) => {
  const variants = {
    HIGH: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
  };

  return (
    <Badge className={cn("border font-medium", variants[priority])}>
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
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="glow"
        staggerIndex={0}
        className="dashboard-card text-center"
      >
        <AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-foreground">Analysis Data Incomplete</h3>
        <p className="text-muted-foreground">The analysis results are incomplete. Please try refreshing the page.</p>
      </PerformantAnimatedCard>
    );
  }

  const totalScore = overall_assessment.total_score || 0;
  const decision = final_verdict.decision || 'REJECTED';

  return (
    <div className="space-y-8">
      {/* Final Verdict Banner */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="glow"
        staggerIndex={0}
        className={cn(
          "dashboard-card border-2",
          decision === 'APPROVED' 
            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-900/30 dark:to-green-900/30 dark:border-emerald-600' 
            : 'border-red-500 bg-gradient-to-br from-red-50/80 to-rose-50/80 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-600'
        )}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {decision === 'APPROVED' ? (
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              )}
              <div>
                <h3 className={cn(
                  "text-xl font-bold",
                  decision === 'APPROVED' 
                    ? 'text-emerald-800 dark:text-emerald-200' 
                    : 'text-red-800 dark:text-red-200'
                )}>
                  {decision === 'APPROVED' ? 'Congratulations! You Passed!' : 'Interview Not Passed'}
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  decision === 'APPROVED' 
                    ? 'text-emerald-700 dark:text-emerald-300' 
                    : 'text-red-700 dark:text-red-300'
                )}>
                  Confidence Level: {final_verdict.confidence_level || 'MEDIUM'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3">
                <OptimizedProgressRing
                  value={totalScore}
                  size={60}
                  strokeWidth={4}
                  showValue={true}
                  color={decision === 'APPROVED' ? 'success' : 'danger'}
                  delay={300}
                />
                <div>
                  <div className={cn(
                    "text-3xl font-bold",
                    decision === 'APPROVED' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    {totalScore}/100
                  </div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white/60 dark:bg-neutral-800/60 rounded-xl border border-white/50 dark:border-neutral-700/50 backdrop-blur-sm">
            <p className="text-sm font-semibold mb-2 text-foreground">Decision Reasoning:</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{final_verdict.reasoning || 'No reasoning provided'}</p>
          </div>
        </div>
      </PerformantAnimatedCard>

      {/* Skills Breakdown */}
      <CardGrid columns={2} gap="lg">
        {/* Communication Skills */}
        {communication_skills && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={1}
            className="dashboard-card space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">💬</div>
              <h3 className="text-lg font-semibold text-foreground">Communication Skills</h3>
            </div>
            <div className="space-y-3">
              <ScoreDisplay score={communication_skills.clarity_score || 0} label="Clarity & Articulation" delay={400} />
              <ScoreDisplay score={communication_skills.pace_score || 0} label="Speaking Pace" delay={500} />
              <ScoreDisplay score={communication_skills.professional_language_score || 0} label="Professional Language" delay={600} />
              <ScoreDisplay score={communication_skills.overall_score || 0} label="Overall Communication" delay={700} />
            </div>
            
            <div className="p-4 bg-blue-50/60 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Feedback:</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{communication_skills.feedback || 'No feedback available'}</p>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Technical Knowledge */}
        {technical_knowledge && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={2}
            className="dashboard-card space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔧</div>
              <h3 className="text-lg font-semibold text-foreground">Technical Knowledge</h3>
            </div>
            <div className="space-y-3">
              <ScoreDisplay score={technical_knowledge.domain_understanding_score || 0} label="Domain Understanding" delay={800} />
              <ScoreDisplay score={technical_knowledge.depth_of_knowledge_score || 0} label="Knowledge Depth" delay={900} />
              <ScoreDisplay score={technical_knowledge.accuracy_score || 0} label="Technical Accuracy" delay={1000} />
              <ScoreDisplay score={technical_knowledge.overall_score || 0} label="Overall Technical" delay={1100} />
            </div>
            
            <div className="p-4 bg-green-50/60 dark:bg-green-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50 backdrop-blur-sm">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Feedback:</p>
              <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">{technical_knowledge.feedback || 'No feedback available'}</p>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Problem Solving */}
        {problem_solving && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={3}
            className="dashboard-card space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🧠</div>
              <h3 className="text-lg font-semibold text-foreground">Problem Solving</h3>
            </div>
            <div className="space-y-3">
              <ScoreDisplay score={problem_solving.structured_thinking_score || 0} label="Structured Thinking" delay={1200} />
              <ScoreDisplay score={problem_solving.logical_approach_score || 0} label="Logical Approach" delay={1300} />
              <ScoreDisplay score={problem_solving.creativity_score || 0} label="Creativity" delay={1400} />
              <ScoreDisplay score={problem_solving.overall_score || 0} label="Overall Problem Solving" delay={1500} />
            </div>
            
            <div className="p-4 bg-purple-50/60 dark:bg-purple-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50 backdrop-blur-sm">
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">Feedback:</p>
              <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">{problem_solving.feedback || 'No feedback available'}</p>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Confidence & Presence */}
        {confidence_and_presence && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={4}
            className="dashboard-card space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎭</div>
              <h3 className="text-lg font-semibold text-foreground">Confidence & Presence</h3>
            </div>
            <div className="space-y-3">
              <ScoreDisplay score={confidence_and_presence.body_language_score || 0} label="Body Language" delay={1600} />
              <ScoreDisplay score={confidence_and_presence.eye_contact_score || 0} label="Eye Contact" delay={1700} />
              <ScoreDisplay score={confidence_and_presence.overall_confidence_score || 0} label="Overall Confidence" delay={1800} />
              <ScoreDisplay score={confidence_and_presence.overall_score || 0} label="Overall Presence" delay={1900} />
            </div>
            
            <div className="p-4 bg-orange-50/60 dark:bg-orange-900/20 rounded-xl border border-orange-200/50 dark:border-orange-700/50 backdrop-blur-sm">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">Feedback:</p>
              <p className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">{confidence_and_presence.feedback || 'No feedback available'}</p>
            </div>
          </PerformantAnimatedCard>
        )}
      </CardGrid>

      {/* Areas for Improvement */}
      {areas_for_improvement && areas_for_improvement.length > 0 && (
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          staggerIndex={5}
          className="dashboard-card space-y-6"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xl font-semibold text-foreground">Areas for Improvement</h3>
          </div>
          <div className="space-y-4">
            {areas_for_improvement.map((area, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200/50 dark:border-amber-700/50 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-foreground">{area.area}</h4>
                  <PriorityBadge priority={area.priority} />
                </div>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{area.specific_feedback}</p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Examples: </span>
                  <span className="italic">{area.examples}</span>
                </div>
              </div>
            ))}
          </div>
        </PerformantAnimatedCard>
      )}

      {/* Strengths */}
      {strengths && strengths.length > 0 && (
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          staggerIndex={6}
          className="dashboard-card space-y-6"
        >
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xl font-semibold text-foreground">Your Strengths</h3>
          </div>
          <div className="space-y-4">
            {strengths.map((strength, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-emerald-50/60 to-green-50/60 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3">{strength.strength}</h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3 leading-relaxed">{strength.evidence}</p>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="font-semibold">Impact: </span>
                  <span className="italic">{strength.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </PerformantAnimatedCard>
      )}

      {/* Recommendation */}
      <PerformantAnimatedCard 
        variant="glass" 
        hoverEffect="lift"
        staggerIndex={7}
        className="dashboard-card space-y-6"
      >
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-semibold text-foreground">Next Steps & Recommendations</h3>
        </div>
        <div className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-sm">
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{final_verdict.recommendation || 'No recommendations available'}</p>
        </div>
      </PerformantAnimatedCard>
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
  const [mounted, setMounted] = useState(false);

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

  // Animation setup
  useEffect(() => {
    setMounted(true);
    
    if (!isLoading && !error) {
      // GSAP animations for card entrance
      gsap.fromTo(
        ".dashboard-card",
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          stagger: 0.1, 
          duration: 0.6, 
          ease: "power2.out"
        }
      );
    }
  }, [isLoading, error]);

  const handleRetakeInterview = () => {
    router.push('/app/job-readiness/interviews');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    fetchSubmission();
  };

  if (isLoading) {
    return <DashboardLoadingSkeleton message="Loading your interview feedback..." />;
  }

  if (error) {
    return (
      <JobReadinessLayout title="Interview Results" description="Unable to load interview feedback">
        <div className="max-w-4xl mx-auto space-y-6">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="glow"
            staggerIndex={0}
            className="dashboard-card"
          >
            <Alert variant="destructive" className="bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-800 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 flex gap-3">
              <AnimatedButton variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </AnimatedButton>
              <AnimatedButton variant="outline" asChild>
                <Link href="/app/job-readiness/interviews">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Interviews
                </Link>
              </AnimatedButton>
            </div>
          </PerformantAnimatedCard>
        </div>
      </JobReadinessLayout>
    );
  }

  if (!submission) {
    return (
      <JobReadinessLayout title="Interview Results" description="Interview submission not found">
        <div className="max-w-4xl mx-auto">
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="glow"
            staggerIndex={0}
            className="dashboard-card text-center space-y-6"
          >
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Submission Not Found</h2>
              <p className="text-muted-foreground mb-6">The interview submission could not be found.</p>
            </div>
            <AnimatedButton asChild>
              <Link href="/app/job-readiness/interviews">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Interviews
              </Link>
            </AnimatedButton>
          </PerformantAnimatedCard>
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
          <AnimatedButton variant="ghost" size="sm" asChild>
            <Link href="/app/job-readiness/interviews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Interviews
            </Link>
          </AnimatedButton>
          <div className="flex gap-3">
            <AnimatedButton variant="outline" onClick={handleRetakeInterview}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Interview
            </AnimatedButton>
          </div>
        </div>

        {/* Status Overview */}
        <PerformantAnimatedCard 
          variant="glass" 
          hoverEffect="lift"
          staggerIndex={0}
          className="dashboard-card"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {submission.passed ? (
                  <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Interview {submission.passed ? 'Passed' : 'Needs Improvement'}
                  </h2>
                  <p className="text-muted-foreground">
                    {submission.createdAt ? 
                      `Submitted ${new Date(submission.createdAt).toLocaleDateString()}` :
                      'Submission date unavailable'
                    }
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <Badge 
                    variant={submission.passed ? "default" : "secondary"} 
                    className={cn(
                      "text-sm font-medium mb-2",
                      submission.passed 
                        ? "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" 
                        : "bg-amber-500/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    )}
                  >
                    {statusInfo.label}
                  </Badge>
                  {submission.score && (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(submission.score)}%
                      </span>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                    </div>
                  )}
                </div>
                {submission.score && (
                  <OptimizedProgressRing
                    value={submission.score}
                    size={60}
                    strokeWidth={4}
                    showValue={false}
                    color={submission.passed ? "success" : "warning"}
                    delay={200}
                  />
                )}
              </div>
            </div>
            {!isAnalyzed && (
              <Alert className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 backdrop-blur-sm">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Your interview is being analyzed. Results will be available shortly.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </PerformantAnimatedCard>

        {/* Structured Analysis Results */}
        {isAnalyzed && analysisResult && (
          <StructuredFeedback analysisResult={analysisResult} />
        )}

        {/* Fallback for old feedback format */}
        {isAnalyzed && submission.feedback && !analysisResult && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={1}
            className="dashboard-card space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">📋</div>
              <div>
                <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">Your Interview Feedback</h3>
                <p className="text-muted-foreground">Here's your personalized analysis and recommendations</p>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-neutral-50/60 to-neutral-100/60 dark:from-neutral-800/60 dark:to-neutral-900/60 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 backdrop-blur-sm">
              <div className="prose max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {submission.feedback}
                </div>
              </div>
            </div>
          </PerformantAnimatedCard>
        )}

        {/* Next Steps */}
        {isAnalyzed && (
          <PerformantAnimatedCard 
            variant="glass" 
            hoverEffect="lift"
            staggerIndex={2}
            className="dashboard-card space-y-6"
          >
            <h3 className="text-xl font-semibold text-foreground">Next Steps</h3>
            <div className="space-y-4">
              {submission.passed ? (
                <div className="bg-gradient-to-r from-emerald-50/60 to-green-50/60 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">🎉</div>
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Congratulations!</h4>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm mb-4 leading-relaxed">
                    You've successfully completed the simulated interview and earned your 5th star! 
                    You're now ready for the job market.
                  </p>
                  <AnimatedButton className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white" asChild>
                    <Link href="/app/job-readiness">
                      <Award className="h-4 w-4 mr-2" />
                      Return to Job Readiness Dashboard
                    </Link>
                  </AnimatedButton>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/50 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">📈</div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Keep Practicing</h4>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300 text-sm mb-4 leading-relaxed">
                    Use the feedback above to improve your interview skills. You can retake 
                    the interview as many times as needed to pass.
                  </p>
                  <div className="flex gap-3">
                    <AnimatedButton className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white" onClick={handleRetakeInterview}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Try Again
                    </AnimatedButton>
                    <AnimatedButton variant="outline" className="border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" asChild>
                      <Link href="/app/job-readiness">
                        Back to Dashboard
                      </Link>
                    </AnimatedButton>
                  </div>
                </div>
              )}
            </div>
          </PerformantAnimatedCard>
        )}
      </div>
    </JobReadinessLayout>
  );
} 