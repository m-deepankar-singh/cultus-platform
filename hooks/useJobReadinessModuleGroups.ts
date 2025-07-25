import { useQuery } from "@tanstack/react-query"

interface JobReadinessModule {
  id: string
  name: string
  type: string
  configuration: any
  is_unlocked: boolean
  progress: {
    status: string
    progress_percentage: number
    completed_at?: string
  } | null
}

interface JobReadinessProduct {
  id: string
  name: string
  description: string
  configuration: any
  modules: JobReadinessModule[]
}

interface InterviewStatus {
  hasAttempted: boolean
  isPassed: boolean
  isCompleted: boolean
  lastAttemptDate: string | null
  submissionId: string | null
}

interface JobReadinessProgressResponse {
  student: {
    id: string
    name: string
    email: string
    job_readiness_star_level: string | null
    job_readiness_tier: 'BRONZE' | 'SILVER' | 'GOLD'
    job_readiness_background_type: string | null
    job_readiness_promotion_eligible: boolean
  }
  products: JobReadinessProduct[]
  interviewStatus: InterviewStatus
}

interface ModuleGroup {
  type: 'assessments' | 'courses' | 'expert_sessions' | 'projects' | 'interviews'
  title: string
  description: string
  icon: string
  requiredStars: number
  modules: JobReadinessModule[]
  isUnlocked: boolean
  isCompleted: boolean
  completedCount: number
  totalCount: number
  href: string
}

export interface JobReadinessModuleGroups {
  student: {
    id: string
    name: string
    email: string
    currentStars: number
    currentTier: 'BRONZE' | 'SILVER' | 'GOLD'
    backgroundType: string | null
    promotionEligible: boolean
  }
  moduleGroups: ModuleGroup[]
  primaryProduct: JobReadinessProduct | null
  interviewStatus: InterviewStatus
}

export function useJobReadinessModuleGroups() {
  return useQuery<JobReadinessModuleGroups>({
    queryKey: ['job-readiness', 'module-groups'],
    queryFn: async () => {
      // Add cache-busting parameter and headers to ensure fresh data for interview status
      const timestamp = Date.now();
      const response = await fetch(`/api/app/job-readiness/products?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness module groups')
      }
      const data: JobReadinessProgressResponse = await response.json()
      
      console.log('API Response:', data)
      
      // Get the primary product (first one with modules)
      const primaryProduct = data.products?.[0] || null
      const allModules = primaryProduct?.modules || []
      
      console.log('Modules found:', allModules.length)
      
      // Group modules by type
      const assessmentModules = allModules.filter(m => m.type === 'Assessment')
      const courseModules = allModules.filter(m => m.type === 'Course')
      const expertSessionModules = allModules.filter(m => m.type === 'expert_session')
      const projectModules = allModules.filter(m => m.type === 'project')
      
      // Calculate star level (convert string to number)
      const starLevelMap: { [key: string]: number } = {
        'ONE': 1,
        'TWO': 2,
        'THREE': 3,
        'FOUR': 4,
        'FIVE': 5
      }
      // Don't default to 'ONE' if star level is null - show 0 stars instead
      const currentStars = data.student.job_readiness_star_level 
        ? (starLevelMap[data.student.job_readiness_star_level] || 0) 
        : 0
      
      // Helper function to calculate group status
      const calculateGroupStatus = (modules: JobReadinessModule[], requiredStars: number, moduleType?: string) => {
        // Special handling for Expert Sessions - if user has 3+ stars, they've completed expert sessions
        if (moduleType === 'expert_sessions') {
          const totalSessions = 5;
          const isUnlocked = currentStars >= requiredStars || requiredStars === 0;
          const isCompleted = currentStars >= 3; // 3+ stars means expert sessions are completed
          const completedSessions = isCompleted ? totalSessions : 0; // Show 5/5 if completed, 0/5 if not
          
          return { completedCount: completedSessions, totalCount: totalSessions, isUnlocked, isCompleted };
        }
        
        // Special handling for Projects - if user has 4+ stars, they've completed projects
        if (moduleType === 'projects') {
          const totalProjects = modules.length || 1; // Default to 1 if no modules found
          const isUnlocked = currentStars >= requiredStars || requiredStars === 0;
          const isCompleted = currentStars >= 4; // 4+ stars means projects are completed
          const completedProjects = isCompleted ? totalProjects : 0; // Show all projects completed if star 4+
          
          return { completedCount: completedProjects, totalCount: totalProjects, isUnlocked, isCompleted };
        }
        
        // Default handling for other module types
        const completedCount = modules.filter(m => m.progress?.status === 'Completed').length
        const totalCount = modules.length
        // Clearer unlock logic: assessments (star 0) are always unlocked, others require appropriate star level
        const isUnlocked = requiredStars === 0 || currentStars >= requiredStars
        const isCompleted = totalCount > 0 && completedCount === totalCount
        
        return { completedCount, totalCount, isUnlocked, isCompleted }
      }
      
      // Helper function for interview status
      const calculateInterviewStatus = () => {
        const isUnlocked = currentStars >= 4 // Unlocked after projects (star 4)
        const isCompleted = data.interviewStatus?.isCompleted || false
        const completedCount = data.interviewStatus?.hasAttempted ? 1 : 0
        const totalCount = 1
        
        return { completedCount, totalCount, isUnlocked, isCompleted }
      }
      
      // Create module groups
      const moduleGroups: ModuleGroup[] = [
        {
          type: 'assessments',
          title: 'Initial Assessments',
          description: 'Complete foundational assessments to determine your starting tier',
          icon: 'FileText',
          requiredStars: 0,
          modules: assessmentModules,
          href: `/app/job-readiness/assessments?productId=${primaryProduct?.id}`,
          ...calculateGroupStatus(assessmentModules, 0)
        },
        {
          type: 'courses',
          title: 'Course Modules',
          description: 'Learn through video content and AI-generated quizzes',
          icon: 'BookOpen',
          requiredStars: 1,
          modules: courseModules,
          href: `/app/job-readiness/courses?productId=${primaryProduct?.id}`,
          ...calculateGroupStatus(courseModules, 1)
        },
        {
          type: 'expert_sessions',
          title: 'Expert Sessions',
          description: 'Watch industry expert sessions (complete 5 to proceed)',
          icon: 'GraduationCap',
          requiredStars: 2,
          modules: expertSessionModules,
          href: `/app/job-readiness/expert-sessions?productId=${primaryProduct?.id}`,
          ...calculateGroupStatus(expertSessionModules, 2, 'expert_sessions')
        },
        {
          type: 'projects',
          title: 'Real-World Projects',
          description: 'Complete AI-generated projects tailored to your background',
          icon: 'Briefcase',
          requiredStars: 3,
          modules: projectModules,
          href: `/app/job-readiness/projects?productId=${primaryProduct?.id}`,
          ...calculateGroupStatus(projectModules, 3, 'projects')
        },
        {
          type: 'interviews',
          title: 'Simulated Interviews',
          description: 'Complete AI-powered mock interviews to demonstrate your skills',
          icon: 'Video',
          requiredStars: 4,
          modules: [], // Interviews don't use the traditional module system
          href: `/app/job-readiness/interviews`,
          ...calculateInterviewStatus()
        }
      ]
      
      return {
        student: {
          id: data.student.id,
          name: data.student.name,
          email: data.student.email,
          currentStars,
          currentTier: data.student.job_readiness_tier,
          backgroundType: data.student.job_readiness_background_type,
          promotionEligible: data.student.job_readiness_promotion_eligible
        },
        moduleGroups,
        primaryProduct,
        interviewStatus: data.interviewStatus
      }
    },
    staleTime: 30 * 1000, // Reduced from 2 minutes to 30 seconds for more frequent interview status updates
    gcTime: 2 * 60 * 1000, // Reduced from 5 minutes to 2 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: 'always', // Always refetch on mount to get latest data
  })
} 
 