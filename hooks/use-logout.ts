/**
 * Logout Hook with Session Cleanup
 * 
 * Provides enhanced logout functionality that properly cleans up
 * session preferences before triggering Supabase logout
 */

import { useRouter } from "next/navigation";
import { SessionService } from "@/lib/auth/session-service";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useLogout() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const logout = async (userType?: 'admin' | 'student') => {
    try {
      // Clear session preferences first
      SessionService.clearAllPreferences();

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

      // Show success message
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out.",
      });

      // Redirect based on user type or to homepage
      const redirectPath = userType === 'admin' ? '/admin/login' : 
                          userType === 'student' ? '/app/login' : '/';
      router.push(redirectPath);

    } catch (error: any) {
      // Even if logout fails, clear preferences and redirect
      SessionService.clearAllPreferences();
      
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