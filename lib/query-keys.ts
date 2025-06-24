export const queryKeys = {
  // Student App Keys
  studentDashboard: ['student', 'dashboard'] as const,
  studentProgress: ['student', 'progress'] as const,
  
  // Job Readiness Keys (standardize existing)
  jobReadinessProgress: ['job-readiness', 'progress'] as const,
  jobReadinessProducts: (productId?: string) => 
    productId ? ['job-readiness', 'products', productId] : ['job-readiness', 'products'] as const,
  jobReadinessAssessments: (productId: string) => 
    ['job-readiness', 'assessments', productId] as const,
  jobReadinessCourses: (productId: string) => 
    ['job-readiness', 'courses', productId] as const,
  jobReadinessExpertSessions: (productId: string) => 
    ['job-readiness', 'expert-sessions', productId] as const,
  jobReadinessProjects: (productId: string) => 
    ['job-readiness', 'projects', productId] as const,
  
  // Course & Assessment Keys
  assessmentDetails: (moduleId: string) => ['assessments', 'details', moduleId] as const,
  assessmentProgress: (moduleId: string) => ['assessments', 'progress', moduleId] as const,
  courseContent: (courseId: string) => ['courses', 'content', courseId] as const,
  courseProgress: (courseId: string) => ['courses', 'progress', courseId] as const,

  // Admin Keys - with proper filter serialization
  adminLearners: (filters: Record<string, any>) => ['admin', 'learners', filters] as const,
  adminUsers: (filters: Record<string, any>) => ['admin', 'users', filters] as const,
  adminClients: (filters: Record<string, any>) => ['admin', 'clients', filters] as const,
  adminModules: (filters: Record<string, any>) => ['admin', 'modules', filters] as const,
  adminProducts: (filters: Record<string, any>) => ['admin', 'products', filters] as const,
  adminQuestionBanks: (filters: Record<string, any>) => ['admin', 'question-banks', filters] as const,
  
  // Expert Sessions Keys
  expertSessions: (productId?: string) => 
    productId ? ['expert-sessions', productId] : ['expert-sessions'] as const,
  expertSessionProgress: (sessionId: string) => 
    ['expert-sessions', 'progress', sessionId] as const,
    
  // Interview Keys  
  interviews: ['interviews'] as const,
  interviewQuestions: ['interviews', 'questions'] as const,
  interviewSubmissions: (filters: Record<string, any>) => 
    ['interviews', 'submissions', filters] as const,
    
  // Current User Keys
  currentUser: ['auth', 'me'] as const,
  userProfile: (userId: string) => ['users', 'profile', userId] as const,
} as const

// Type helpers for query keys
export type QueryKeys = typeof queryKeys
export type QueryKey<T extends keyof QueryKeys> = QueryKeys[T] 