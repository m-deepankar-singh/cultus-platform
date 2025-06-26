'use client';

import { useState, ReactNode } from 'react';
import { JobReadinessLayout } from '@/components/job-readiness/JobReadinessLayout';
import { InterviewSessionProvider } from '@/components/job-readiness/providers/InterviewSessionProvider';
import { LiveInterviewProvider } from '@/components/job-readiness/contexts/LiveInterviewContext';
import { InterviewSetup } from '@/components/job-readiness/interviews/InterviewSetup';
import { LiveInterviewInterface } from '@/components/job-readiness/interviews/LiveInterviewInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInterviewSession } from '@/components/job-readiness/providers/InterviewSessionProvider';
import { useLiveInterviewContext } from '@/components/job-readiness/contexts/LiveInterviewContext';

// Test configuration - using real data from database
const TEST_BACKGROUND_ID = 'df8e996e-df6f-43f0-9bfa-c308a7604624'; // Real Computer Science background ID
const TEST_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

function TestInterviewFlow() {
  const [currentStep, setCurrentStep] = useState<'info' | 'setup' | 'interview'>('info');
  const { sessionState, questionsLoading, questionsError, background, questions } = useInterviewSession();
  const { connected, connecting, error: liveError } = useLiveInterviewContext();

  // Check for API key
  const hasValidApiKey = TEST_API_KEY && TEST_API_KEY !== 'test-key' && TEST_API_KEY.length > 10;

  const handleStartSetup = () => {
    setCurrentStep('setup');
  };

  const handleSetupComplete = () => {
    setCurrentStep('interview');
  };

  const handleBackToInfo = () => {
    setCurrentStep('info');
  };

  const handleInterviewComplete = () => {
    // In real implementation, this would redirect to results page
  };

  if (currentStep === 'info') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧪 Interview Component Testing
              <Badge variant="outline">Phase 3 Complete</Badge>
            </CardTitle>
            <CardDescription>
              Test the implemented interview components and functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* API Key Warning */}
            {!hasValidApiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ API Keys Required</h4>
                <p className="text-yellow-700 text-sm mb-3">
                  The AI interview system requires TWO API keys in your <code>.env</code> file:
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-yellow-700 text-sm font-medium">1. Client-side (for Live WebSocket connection):</p>
                    <div className="mt-1 p-2 bg-yellow-100 rounded font-mono text-xs">
                      NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
                    </div>
                  </div>
                  <div>
                    <p className="text-yellow-700 text-sm font-medium">2. Server-side (for question generation):</p>
                    <div className="mt-1 p-2 bg-yellow-100 rounded font-mono text-xs">
                      GEMINI_API_KEY=your_api_key_here
                    </div>
                  </div>
                </div>
                <p className="text-yellow-700 text-sm mt-3">
                  💡 You can use the same API key for both. Get it from: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
                </p>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">✅ Implemented Components</h3>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• LiveInterviewContext</li>
                  <li>• InterviewSessionProvider</li>
                  <li>• InterviewSetup (4-step process)</li>
                  <li>• LiveInterviewInterface</li>
                  <li>• useVideoRecording hook</li>
                  <li>• useLiveInterview hook</li>
                </ul>
              </Card>
              
              <Card className="p-4">
                <h3 className="font-semibold mb-2">🔧 Test Environment</h3>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Background ID: {TEST_BACKGROUND_ID}</li>
                  <li>• Session State: {sessionState}</li>
                  <li>• Questions Loading: {questionsLoading ? 'Yes' : 'No'}</li>
                  <li>• Questions Count: {questions.length}</li>
                  <li>• WebSocket Status: {connected ? 'Connected' : connecting ? 'Connecting' : 'Disconnected'}</li>
                  <li>• API Key: {hasValidApiKey ? '✅ Valid' : '❌ Missing/Invalid'}</li>
                </ul>
              </Card>
            </div>

            {/* Status Display */}
            <div className="space-y-2">
              <h3 className="font-semibold">Current Status</h3>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={sessionState === 'ready' ? 'default' : 'secondary'}>
                  Session: {sessionState}
                </Badge>
                <Badge variant={questionsLoading ? 'secondary' : questions.length > 0 ? 'default' : 'destructive'}>
                  Questions: {questionsLoading ? 'Loading...' : `${questions.length} loaded`}
                </Badge>
                <Badge variant={background ? 'default' : 'destructive'}>
                  Background: {background ? background.name : 'Not loaded'}
                </Badge>
              </div>
            </div>

            {/* Error Display */}
            {(questionsError || liveError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Errors Detected:</h4>
                {questionsError && <p className="text-red-700 text-sm">Questions: {questionsError}</p>}
                {liveError && <p className="text-red-700 text-sm">Live Client: {liveError}</p>}
              </div>
            )}

            {/* Test Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleStartSetup}
                className="flex-1"
                disabled={questionsLoading || !hasValidApiKey}
              >
                {questionsLoading ? 'Loading...' : !hasValidApiKey ? 'API Key Required' : 'Start Interview Setup Test'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reset Test
              </Button>
            </div>

            {/* Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Testing Notes:</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Make sure camera and microphone permissions are enabled</li>
                <li>• WebSocket connection requires NEXT_PUBLIC_GOOGLE_API_KEY</li>
                <li>• Question generation requires GEMINI_API_KEY (server-side)</li>
                <li>• Video recording will test browser MediaRecorder API</li>
                <li>• Questions are generated based on background data</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'setup') {
    return (
      <InterviewSetup 
        onSetupComplete={handleSetupComplete}
        onBack={handleBackToInfo}
      />
    );
  }

  if (currentStep === 'interview') {
    return (
      <LiveInterviewInterface 
        onComplete={handleInterviewComplete}
      />
    );
  }

  return null;
}

export default function InterviewTestPage() {
  const apiKey = TEST_API_KEY || '';
  
  return (
    <JobReadinessLayout
      title="Interview Components Test"
      description="Testing the implemented AI interview components and functionality"
      showProgress={false}
    >
      <InterviewSessionProvider backgroundId={TEST_BACKGROUND_ID}>
        <LiveInterviewProvider 
          backgroundId={TEST_BACKGROUND_ID}
          apiKey={apiKey}
        >
          <TestInterviewFlow />
        </LiveInterviewProvider>
      </InterviewSessionProvider>
    </JobReadinessLayout>
  );
} 