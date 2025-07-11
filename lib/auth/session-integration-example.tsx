/**
 * Example integration of session timeout functionality
 * 
 * Add this to your main layout or dashboard components to enable 
 * automatic session timeout with 48-hour inactivity checks
 */

'use client';

import { useEffect } from 'react';
import { SessionTimeoutWarning } from '@/components/ui/session-timeout-warning';
import { useLogout } from '@/hooks/use-logout';
import { sessionTimeout } from '@/lib/auth/session-timeout';

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { logout } = useLogout();

  useEffect(() => {
    // Initialize session tracking on app start
    sessionTimeout.updateLastActivity();
    
    // Start monitoring session timeout
    sessionTimeout.startMonitoring();
  }, []);

  const handleExtendSession = () => {
    // Optional: Add any additional session extension logic here
    console.log('Session extended successfully');
  };

  const handleSessionExpired = () => {
    // Handle session expiration
    logout();
  };

  return (
    <>
      {children}
      {/* SessionTimeoutWarning is now handled by SessionTimeoutProvider */}
    </>
  );
}

/**
 * Usage in your app:
 * 
 * // In app/layout.tsx or app/(dashboard)/layout.tsx
 * import { SessionTimeoutProvider } from '@/lib/auth/session-integration-example';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SessionTimeoutProvider>
 *           {children}
 *         </SessionTimeoutProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */

/**
 * For API routes, add this header to track activity:
 * 
 * // In your API middleware or individual routes
 * headers: {
 *   'x-last-activity': Date.now().toString()
 * }
 */

/**
 * Manual session checking in components:
 * 
 * import { useSessionTimeoutWarning } from '@/components/ui/session-timeout-warning';
 * 
 * function MyComponent() {
 *   const { isExpired, shouldWarn, timeRemaining, extendSession } = useSessionTimeoutWarning();
 * 
 *   if (isExpired) {
 *     // Handle expired session
 *   }
 * 
 *   if (shouldWarn) {
 *     // Show warning or call extendSession()
 *   }
 * }
 */