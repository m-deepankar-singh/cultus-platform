'use client';

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtendSession: () => void;
  onLogout: () => void;
  formatTimeRemaining: (milliseconds: number) => string;
}

export function SessionTimeoutWarning({ 
  isOpen, 
  timeRemaining, 
  onExtendSession, 
  onLogout, 
  formatTimeRemaining 
}: SessionTimeoutWarningProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire in <strong>{formatTimeRemaining(timeRemaining)}</strong> due to inactivity.
            </p>
            <p className="text-sm text-muted-foreground">
              You will be automatically logged out after 48 hours of inactivity for security reasons.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={onLogout}
            className="sm:w-auto w-full"
          >
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onExtendSession}
            className="sm:w-auto w-full"
          >
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
