import { useQuery } from "@tanstack/react-query"

interface JobReadinessModule {
  id: string
  name: string
  type: string
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
    job_readiness_star_level: number
    job_readiness_tier: 'BRONZE' | 'SILVER' | 'GOLD'
    job_readiness_background_type: string
    job_readiness_promotion_eligible: boolean
  }
  products: JobReadinessProduct[]
}

// Transform the API response to a more convenient format
interface JobReadinessProgress {
  currentStars: number
  currentTier: 'BRONZE' | 'SILVER' | 'GOLD'
  backgroundType: string
  promotionEligible: boolean
  products: JobReadinessProduct[]
  modules: {
    assessments: { unlocked: boolean; completed: boolean }
    courses: { unlocked: boolean; completed: boolean }
    expert_sessions: { unlocked: boolean; completed: boolean }
    projects: { unlocked: boolean; completed: boolean }
  }
}

export function useJobReadinessProgress() {
  return useQuery<JobReadinessProgress>({
    queryKey: ['job-readiness', 'progress'],
    queryFn: async () => {
      const response = await fetch('/api/app/job-readiness/products')
      if (!response.ok) {
        throw new Error('Failed to fetch Job Readiness progress')
      }
      const data: JobReadinessProgressResponse = await response.json()
      
      // Transform the response to match our interface
      const modules = {
        assessments: { unlocked: false, completed: false },
        courses: { unlocked: false, completed: false },
        expert_sessions: { unlocked: false, completed: false },
        projects: { unlocked: false, completed: false }
      }
      
      // Process modules from all products to determine unlock/complete status
      data.products.forEach(product => {
        product.modules.forEach(module => {
          const moduleType = module.type.toLowerCase()
          // Map API fields correctly: is_unlocked -> unlocked, progress.status === 'Completed' -> completed
          const isUnlocked = module.is_unlocked || false
          const isCompleted = module.progress?.status === 'Completed' || false
          
          if (moduleType.includes('assessment')) {
            modules.assessments.unlocked = modules.assessments.unlocked || isUnlocked
            modules.assessments.completed = modules.assessments.completed || isCompleted
          } else if (moduleType.includes('course')) {
            modules.courses.unlocked = modules.courses.unlocked || isUnlocked
            modules.courses.completed = modules.courses.completed || isCompleted
          } else if (moduleType.includes('expert')) {
            modules.expert_sessions.unlocked = modules.expert_sessions.unlocked || isUnlocked
            modules.expert_sessions.completed = modules.expert_sessions.completed || isCompleted
          } else if (moduleType.includes('project')) {
            modules.projects.unlocked = modules.projects.unlocked || isUnlocked
            modules.projects.completed = modules.projects.completed || isCompleted
          }
        })
      })
      
      // Convert star level string to number
      const starLevelMap: Record<string, number> = {
        'ONE': 1,
        'TWO': 2,
        'THREE': 3,
        'FOUR': 4,
        'FIVE': 5
      }
      
      const starLevel = data.student.job_readiness_star_level || 'ONE'
      const currentStars = starLevelMap[starLevel] || 1
      
      return {
        currentStars,
        currentTier: data.student.job_readiness_tier || 'BRONZE',
        backgroundType: data.student.job_readiness_background_type || '',
        promotionEligible: data.student.job_readiness_promotion_eligible || false,
        products: data.products,
        modules
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}