'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface InactivityWarningProps {
  isVisible: boolean;
  onDismiss: () => void;
  onContinue: () => void;
  timeUntilDisconnect?: number; // seconds
}

export function InactivityWarning({ 
  isVisible, 
  onDismiss, 
  onContinue, 
  timeUntilDisconnect = 120 
}: InactivityWarningProps) {
  const [timeLeft, setTimeLeft] = useState(timeUntilDisconnect);

  useEffect(() => {
    if (!isVisible) return;

    setTimeLeft(timeUntilDisconnect);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, timeUntilDisconnect]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-orange-200 bg-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <AlertTriangle className="h-12 w-12 text-orange-600" />
          </div>
          <CardTitle className="text-orange-800">
            Are you still there?
          </CardTitle>
          <CardDescription className="text-orange-700">
            We haven't detected any activity for a while
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-100">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Your interview session will be automatically saved and ended in{' '}
              <span className="font-bold text-orange-900">
                {formatTime(timeLeft)}
              </span>
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-orange-700 space-y-2">
            <p>
              • Your progress has been automatically saved
            </p>
            <p>
              • You can continue where you left off by clicking "Continue Interview"
            </p>
            <p>
              • Or submit your current progress by letting the timer expire
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={onContinue}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Continue Interview
            </Button>
            <Button 
              onClick={onDismiss}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              End Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 