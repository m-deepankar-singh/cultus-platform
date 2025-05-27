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
}

export function useJobReadinessModuleGroups() {
  return useQuery<JobReadinessModuleGroups>({
    queryKey: ['job-readiness', 'module-groups'],
    queryFn: async () => {
      const response = await fetch('/api/app/job-readiness/products')
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness module groups')
      }
      const data: JobReadinessProgressResponse = await response.json()
      
      // Get the single Job Readiness product (enforced by database constraint)
      const primaryProduct = data.products?.[0] || null
      const allModules = primaryProduct?.modules || []
      
      // If no Job Readiness product found, return empty state
      if (!primaryProduct || !primaryProduct.id) {
        console.warn('No Job Readiness product found for student')
        return {
          student: {
            id: data.student.id,
            name: data.student.name,
            email: data.student.email,
            currentStars: 0,
            currentTier: data.student.job_readiness_tier || 'BRONZE',
            backgroundType: data.student.job_readiness_background_type,
            promotionEligible: data.student.job_readiness_promotion_eligible
          },
          moduleGroups: [],
          primaryProduct: null
        }
      }
      
      // Group modules by type (handle both lowercase and uppercase)
      const assessmentModules = allModules.filter(m => 
        m.type === 'Assessment' || m.type === 'assessment'
      )
      const courseModules = allModules.filter(m => 
        m.type === 'Course' || m.type === 'course'
      )
      const expertSessionModules = allModules.filter(m => 
        m.type === 'Expert_Session' || m.type === 'expert_session'
      )
      const projectModules = allModules.filter(m => 
        m.type === 'Project' || m.type === 'project'
      )
      const interviewModules = allModules.filter(m => 
        m.type === 'Interview' || m.type === 'interview'
      )
      
      // Calculate star level (convert string to number)
      const starLevelMap: { [key: string]: number } = {
        'ONE': 1,
        'TWO': 2,
        'THREE': 3,
        'FOUR': 4,
        'FIVE': 5
      }
      const currentStars = starLevelMap[data.student.job_readiness_star_level || 'ONE'] || 0
      
      // Helper function to calculate group status
      const calculateGroupStatus = (modules: JobReadinessModule[], requiredStars: number) => {
        const completedCount = modules.filter(m => m.progress?.status === 'Completed').length
        const totalCount = modules.length
        const isUnlocked = currentStars >= requiredStars || requiredStars === 0
        const isCompleted = totalCount > 0 && completedCount === totalCount
        
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
          href: primaryProduct?.id 
            ? `/app/job-readiness/assessments?productId=${primaryProduct.id}`
            : `/app/job-readiness/assessments`,
          ...calculateGroupStatus(assessmentModules, 0)
        },
        {
          type: 'courses',
          title: 'Course Modules',
          description: 'Learn through video content and AI-generated quizzes',
          icon: 'BookOpen',
          requiredStars: 1,
          modules: courseModules,
          href: primaryProduct?.id 
            ? `/app/job-readiness/courses?productId=${primaryProduct.id}`
            : `/app/job-readiness/courses`,
          ...calculateGroupStatus(courseModules, 1)
        },
        {
          type: 'expert_sessions',
          title: 'Expert Sessions',
          description: 'Watch industry expert sessions (complete 5 to proceed)',
          icon: 'GraduationCap',
          requiredStars: 2,
          modules: expertSessionModules,
          href: primaryProduct?.id 
            ? `/app/job-readiness/expert-sessions?productId=${primaryProduct.id}`
            : `/app/job-readiness/expert-sessions`,
          ...calculateGroupStatus(expertSessionModules, 2)
        },
        {
          type: 'projects',
          title: 'Real-World Projects',
          description: 'Complete AI-generated projects tailored to your background',
          icon: 'Briefcase',
          requiredStars: 3,
          modules: projectModules,
          href: primaryProduct?.id 
            ? `/app/job-readiness/projects?productId=${primaryProduct.id}`
            : `/app/job-readiness/projects`,
          ...calculateGroupStatus(projectModules, 3)
        },
        {
          type: 'interviews',
          title: 'Interview Simulation',
          description: 'Record and submit video responses to AI-generated interview questions',
          icon: 'Video',
          requiredStars: 4,
          modules: interviewModules,
          href: primaryProduct?.id 
            ? `/app/job-readiness/interviews?productId=${primaryProduct.id}`
            : `/app/job-readiness/interviews`,
          ...calculateGroupStatus(interviewModules, 4)
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
        primaryProduct
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
} 