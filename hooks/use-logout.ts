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

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      // Show success message
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out.",
      });

      // Redirect to appropriate login page
      if (userType === 'student') {
        router.push("/app/login");
      } else if (userType === 'admin') {
        router.push("/admin/login");
      } else {
        // Auto-detect based on current path or stored user type
        const storedUserType = SessionService.getUserType();
        if (storedUserType === 'student') {
          router.push("/app/login");
        } else {
          router.push("/admin/login");
        }
      }

    } catch (error: any) {
      // Even if logout fails, clear preferences and redirect
      SessionService.clearAllPreferences();
      
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: "There was an issue logging out. You have been redirected to login.",
      });

      // Fallback redirect
      if (userType === 'student') {
        router.push("/app/login");
      } else {
        router.push("/admin/login");
      }
    }
  };

  return { logout };
} 