import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { InterviewQuestion, InterviewQuestionsResponse } from '@/lib/types';
import { Background, StudentProfile } from '@/lib/ai/interview-config';

export interface InterviewSessionContextType {
  // Session state
  sessionId: string | null;
  background: Background | null;
  questions: InterviewQuestion[];
  questionsLoading: boolean;
  questionsError: string | null;
  
  // Session lifecycle
  sessionState: 'preparing' | 'ready' | 'active' | 'completed' | 'error';
  
  // Actions
  initializeSession: (backgroundId: string) => Promise<void>;
  generateQuestions: () => Promise<void>;
  startSession: () => void;
  endSession: () => void;
  
  // Settings
  studentProfile: StudentProfile | null;
}

const InterviewSessionContext = createContext<InterviewSessionContextType | undefined>(undefined);

export interface InterviewSessionProviderProps {
  children: ReactNode;
  backgroundId: string;
}

export function InterviewSessionProvider({
  children,
  backgroundId
}: InterviewSessionProviderProps) {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [background, setBackground] = useState<Background | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  
  // Session lifecycle
  const [sessionState, setSessionState] = useState<'preparing' | 'ready' | 'active' | 'completed' | 'error'>('preparing');
  
  // Student profile
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Fetch student profile
  const fetchStudentProfile = useCallback(async (): Promise<StudentProfile> => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const userData = await response.json();
      
      // Transform API response to StudentProfile interface format
      const profile: StudentProfile = {
        id: userData.id,
        full_name: userData.full_name || `${userData.first_name} ${userData.last_name}`,
        background_type: userData.background_type || 'general',
        job_readiness_tier: userData.job_readiness_tier || 'bronze',
        job_readiness_star_level: userData.job_readiness_star_level || '1'
      };
      
      setStudentProfile(profile);
      return profile;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to fetch student profile');
    }
  }, []);

  // Fetch questions from server-side API (now also returns background data)
  const fetchQuestions = useCallback(async (bgId: string): Promise<InterviewQuestionsResponse & { background: Background }> => {
    try {
      const response = await fetch(`/api/app/job-readiness/interviews/questions?backgroundId=${bgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interview questions');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to fetch questions');
    }
  }, []);

  // Generate interview questions (now uses server-side API)
  const generateQuestions = useCallback(async () => {
    if (!backgroundId) {
      setQuestionsError('Background ID not provided');
      return;
    }

    setQuestionsLoading(true);
    setQuestionsError(null);

    try {
      const questionsResponse = await fetchQuestions(backgroundId);
      setQuestions(questionsResponse.questions);
      setSessionState('ready');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate questions';
      setQuestionsError(errorMessage);
      setSessionState('error');
    } finally {
      setQuestionsLoading(false);
    }
  }, [backgroundId, fetchQuestions]);

  // Initialize session
  const initializeSession = useCallback(async (bgId: string) => {
    try {
      setSessionState('preparing');
      setQuestionsError(null);
      
      // Generate session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      
      // Fetch student profile and questions (which includes background data)
      const [profileData, questionsResponse] = await Promise.all([
        fetchStudentProfile(),
        fetchQuestions(bgId)
      ]);
      
      // Extract questions and background from response
      setQuestions(questionsResponse.questions);
      
      // Set background data from questions response if available
      if (questionsResponse.background) {
        setBackground(questionsResponse.background);
      }
      
      setSessionState('ready');
      setQuestionsLoading(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize session';
      setQuestionsError(errorMessage);
      setSessionState('error');
      setQuestionsLoading(false);
    }
  }, [generateSessionId, fetchStudentProfile, fetchQuestions]);

  // Start interview session
  const startSession = useCallback(() => {
    if (sessionState === 'ready' && questions.length > 0) {
      setSessionState('active');
    }
  }, [sessionState, questions]);

  // End interview session
  const endSession = useCallback(() => {
    setSessionState('completed');
  }, []);

  // Initialize session when backgroundId changes
  useEffect(() => {
    if (backgroundId) {
      initializeSession(backgroundId);
    }
  }, [backgroundId, initializeSession]);

  const value: InterviewSessionContextType = {
    sessionId,
    background,
    questions,
    questionsLoading,
    questionsError,
    sessionState,
    initializeSession,
    generateQuestions,
    startSession,
    endSession,
    studentProfile,
  };

  return (
    <InterviewSessionContext.Provider value={value}>
      {children}
    </InterviewSessionContext.Provider>
  );
}

export function useInterviewSession() {
  const context = useContext(InterviewSessionContext);
  if (!context) {
    throw new Error('useInterviewSession must be used within an InterviewSessionProvider');
  }
  return context;
} 