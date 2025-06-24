'use client'

import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-6 border border-red-200 rounded-lg bg-red-50 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      </div>
      <p className="text-red-600 mb-4">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button 
        onClick={resetErrorBoundary}
        variant="outline"
        className="w-full border-red-300 text-red-700 hover:bg-red-100"
      >
        Try again
      </Button>
    </div>
  )
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={reset}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
} 