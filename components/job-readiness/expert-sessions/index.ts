// Phase 3: Enhanced Expert Session Components
export { EnhancedExpertSessionPlayer } from './EnhancedExpertSessionPlayer'
export { MilestoneProgressIndicator } from './MilestoneProgressIndicator'
export { EnhancedVideoControls } from './EnhancedVideoControls'

// Phase 4: Progress Context and State Management
export { 
  ExpertSessionProgressProvider, 
  useExpertSessionProgress 
} from './contexts/ExpertSessionProgressContext'

export type { 
  ExpertSessionProgressContextValue, 
  ExpertSessionProgressState, 
  ProgressUpdate 
} from './contexts/ExpertSessionProgressContext' 