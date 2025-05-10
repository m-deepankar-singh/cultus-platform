export const queryKeys = {
  // User/Auth related keys
  currentUser: () => ['me'] as const,

  // Student App: Courses/Modules
  allCourses: () => ['courses'] as const,
  courseById: (courseId: string) => ['courses', courseId] as const,
  courseContent: (courseId: string) => ['courses', courseId, 'content'] as const,
  
  // Student App: Modules (if distinct from courses, or as a general term)
  allModules: () => ['modules'] as const,
  moduleById: (moduleId: string) => ['modules', moduleId] as const,

  // Student App: Assessments
  allAssessments: () => ['assessments'] as const, // General list, if applicable
  assessmentById: (assessmentId: string) => ['assessments', assessmentId] as const,
  assessmentDetails: (assessmentId: string) => ['assessments', assessmentId, 'details'] as const,
  moduleAssessments: (moduleId: string) => ['modules', moduleId, 'assessments'] as const, // Assessments for a specific module

  // Student App: User Progress
  userProgress: () => ['progress'] as const, // Overall progress for the current user
  userCourseProgress: (courseId: string) => ['progress', 'course', courseId] as const,
  userAssessmentProgress: (assessmentId: string) => ['progress', 'assessment', assessmentId] as const,

  // Admin Panel: Users
  allUsers: (filters?: Record<string, any>) => ['admin', 'users', filters ?? {}] as const,
  userById: (userId: string) => ['admin', 'users', userId] as const,

  // Admin Panel: Clients
  allClients: (filters?: Record<string, any>) => ['admin', 'clients', filters ?? {}] as const,
  clientById: (clientId: string) => ['admin', 'clients', clientId] as const,

  // Admin Panel: Products
  allAdminProducts: (filters?: Record<string, any>) => ['admin', 'products', filters ?? {}] as const,
  adminProductById: (productId: string) => ['admin', 'products', productId] as const,
  adminProductModules: (productId: string) => ['admin', 'products', productId, 'modules'] as const,
  adminProductClients: (productId: string) => ['admin', 'products', productId, 'clients'] as const,

  // Admin Panel: Modules (Managed by Admin)
  allAdminModules: (filters?: Record<string, any>) => ['admin', 'modules', filters ?? {}] as const,
  adminModuleById: (moduleId: string) => ['admin', 'modules', moduleId] as const,
  adminModuleLessons: (moduleId: string) => ['admin', 'modules', moduleId, 'lessons'] as const,
  adminModuleLessonById: (moduleId: string, lessonId: string) => ['admin', 'modules', moduleId, 'lessons', lessonId] as const,
  adminModuleAssessmentQuestions: (moduleId: string) => ['admin', 'modules', moduleId, 'assessmentQuestions'] as const,
  adminModuleAssessmentQuestionById: (moduleId: string, questionId: string) => ['admin', 'modules', moduleId, 'assessmentQuestions', questionId] as const,
  
  // Admin Panel: Question Banks
  allQuestionBanks: (filters?: Record<string, any>) => ['admin', 'questionBanks', filters ?? {}] as const,
  questionBankById: (questionBankId: string) => ['admin', 'questionBanks', questionBankId] as const, 
  questionBankQuestionById: (questionBankId: string, questionId: string) => ['admin', 'questionBanks', questionBankId, 'questions', questionId] as const,
  
  // Admin Panel: Analytics
  adminAnalyticsMau: () => ['admin', 'analytics', 'mau'] as const,
  // Add more specific analytic keys as needed, e.g., by date range, by entity
}; 