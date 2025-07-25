/**
 * Logout Hook with Session Cleanup
 * 
 * Provides enhanced logout functionality that properly cleans up
 * session preferences before triggering Supabase logout
 */

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SessionService } from "@/lib/auth/session-service";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { SESSION_TIMEOUT_CONFIG } from "@/lib/auth/session-timeout-constants";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const logout = async (userType?: 'admin' | 'student', reason?: string) => {
    try {
      // Clear session preferences and timeout data first
      SessionService.clearAllPreferences();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
      }

      // CRITICAL FIX: Clear auth cache BEFORE API call and redirect
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.clear(); // Clear all queries to ensure clean state

      // Call logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout API failed');
      }

      // CRITICAL FIX: Wait for cache invalidation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Show success message
      const isSessionTimeout = reason && reason.includes('session') || reason?.includes('timeout');
      toast({
        title: isSessionTimeout ? "Session Expired" : "Logged out successfully",
        description: isSessionTimeout 
          ? "Your session expired due to inactivity. Please log in again." 
          : "You have been securely logged out.",
        variant: isSessionTimeout ? "destructive" : "default",
      });

      // Redirect based on user type or to homepage
      const redirectPath = userType === 'admin' ? '/admin/login' : 
                          userType === 'student' ? '/app/login' : '/';
      router.push(redirectPath);

    } catch (error: any) {
      // Enhanced error handling with forced cache clear
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.clear();
      
      // Even if logout fails, clear preferences and timeout data
      SessionService.clearAllPreferences();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_TIMEOUT_CONFIG.LAST_ACTIVITY_KEY);
      }
      
      // Fallback: try direct Supabase logout
      try {
        await supabase.auth.signOut();
      } catch (fallbackError) {
        // Silent fail on fallback
      }
      
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: "There was an issue logging out. You have been redirected to login.",
      });

      // Fallback redirect based on user type or to homepage
      const redirectPath = userType === 'admin' ? '/admin/login' : 
                          userType === 'student' ? '/app/login' : '/';
      router.push(redirectPath);
    }
  };

  return { logout };
} 