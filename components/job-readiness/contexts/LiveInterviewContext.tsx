import { createContext, useContext, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { InterviewLiveClient } from '@/lib/ai/gemini-live-client';
import { ScreenRecorder } from '@/lib/ai/screen-recorder';
import { AudioStreamer } from '@/lib/ai/audio-streamer';
import { AudioRecorder } from '@/lib/ai/audio-recorder';
import { audioContext } from '@/lib/ai/utils';
import { InterviewQuestion } from '@/lib/types';
import { Modality } from '@google/genai';
import { sessionManager } from '@/lib/ai/simple-session-manager';
import { useDirectUpload } from '@/hooks/useDirectUpload';

export interface LiveInterviewContextType {
  // WebSocket client and connection state
  client: InterviewLiveClient | null;
  connected: boolean;
  connecting: boolean;
  
  // Interview session state
  recording: boolean;
  timeRemaining: number;
  interviewStarted: boolean;
  
  // Screen recording
  screenRecorder: ScreenRecorder | null;
  videoBlob: Blob | null;
  hasSystemAudio: boolean;
  screenShareInterrupted: boolean;
  
  // Upload state
  uploading: boolean;
  uploadProgress: number;
  
  // Audio streaming for AI voice playback
  audioStreamer: AudioStreamer | null;
  
  // Audio recording for voice input to AI
  audioRecorder: AudioRecorder | null;
  audioInputEnabled: boolean;
  
  // Generated questions for this interview
  generatedQuestions: InterviewQuestion[];
  
  // Session management
  sessionActive: boolean;
  inactivityWarning: boolean;
  
  // Actions
  connect: (questions?: InterviewQuestion[]) => Promise<void>;
  disconnect: () => void;
  startInterview: (questions: InterviewQuestion[]) => Promise<void>;
  submitInterview: () => Promise<string | null>;
  toggleAudioInput: () => void;
  resetInactivityTimer: () => void;
  
  // Error handling
  error: string | null;
}

const LiveInterviewContext = createContext<LiveInterviewContextType | undefined>(undefined);

export interface LiveInterviewProviderProps {
  children: ReactNode;
  backgroundId: string;
  apiKey: string;
}

export function LiveInterviewProvider({ 
  children, 
  backgroundId, 
  apiKey 
}: LiveInterviewProviderProps) {
  // WebSocket client state
  const [client, setClient] = useState<InterviewLiveClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // Interview session state
  const [recording, setRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  // Screen recording
  const [screenRecorder, setScreenRecorder] = useState<ScreenRecorder | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [hasSystemAudio, setHasSystemAudio] = useState<boolean>(false);
  const [screenShareInterrupted, setScreenShareInterrupted] = useState<boolean>(false);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Audio streaming for playback
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  
  // Audio recording for voice input
  const [audioRecorder, setAudioRecorder] = useState<AudioRecorder | null>(null);
  const [audioInputEnabled, setAudioInputEnabled] = useState(false);
  
  // Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState<InterviewQuestion[]>([]);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  
  // Timer management
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Interview state
  const [pendingQuestions, setPendingQuestions] = useState<InterviewQuestion[]>([]);

  // Session management
  const [sessionActive, setSessionActive] = useState(true);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  
  // Session management timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string | null>(null);
  
  // Session configuration
  const INACTIVITY_WARNING_TIME = 8 * 60 * 1000; // 8 minutes
  const INACTIVITY_DISCONNECT_TIME = 10 * 60 * 1000; // 10 minutes
  const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

  // Direct upload hook for interview recordings
  const { uploadFile, uploading: videoUploading } = useDirectUpload({
    uploadType: 'interviewRecordings',
    onProgress: (progress) => {
      setUploadProgress(progress.percentage);
    },
    onSuccess: (result) => {
      handleSubmitToAPI(result);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error}`);
      setUploading(false);
    },
  });

  // Initialize client
  useEffect(() => {
    // Only create client if we have a valid API key
    if (!apiKey || apiKey.length < 10) {
      console.log('Skipping client initialization - invalid API key');
      return;
    }

    console.log('Initializing InterviewLiveClient with API key');
    const liveClient = new InterviewLiveClient({ apiKey });
    setClient(liveClient);
    
    return () => {
      console.log('Cleaning up InterviewLiveClient');
      try {
        if (liveClient && liveClient.isConnected()) {
          liveClient.disconnect();
        }
      } catch (error) {
        console.warn('Error during client cleanup:', error);
        // Don't throw - just log the warning
      }
    };
  }, [apiKey]);

  // Initialize audio streamer for AI voice playback
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "interview-audio-out" }).then((audioCtx: AudioContext) => {
        console.log('Creating AudioStreamer for AI voice playback');
        audioStreamerRef.current = new AudioStreamer(audioCtx);
      }).catch((error) => {
        console.warn('Failed to create AudioStreamer:', error);
      });
    }
  }, []);

  // Initialize audio recorder for voice input
  useEffect(() => {
    if (!audioRecorder) {
      console.log('Creating AudioRecorder for voice input');
      const recorder = new AudioRecorder();
      setAudioRecorder(recorder);
      
      return () => {
        console.log('Cleaning up AudioRecorder');
        try {
          if (recorder.recording) {
            recorder.stop();
          }
        } catch (error) {
          console.warn('Error during AudioRecorder cleanup:', error);
        }
      };
    }
  }, [audioRecorder]);

  // Handle audio recorder data and send to AI
  useEffect(() => {
    if (!audioRecorder || !client || !connected || !audioInputEnabled) return;

    const handleAudioData = (base64Data: string) => {
      console.log('Sending audio data to AI:', base64Data.length, 'chars');
      client.sendRealtimeInput([{
        mimeType: "audio/pcm",
        data: base64Data
      }]);
    };

    const handleVolumeChange = (volume: number) => {
      // Optional: Could emit volume levels for UI feedback
      console.log('Audio input volume:', volume);
    };

    audioRecorder.on('data', handleAudioData);
    audioRecorder.on('volume', handleVolumeChange);

    return () => {
      audioRecorder.off('data', handleAudioData);
      audioRecorder.off('volume', handleVolumeChange);
    };
  }, [audioRecorder, client, connected, audioInputEnabled]);

  // Start/stop audio recording based on audioInputEnabled state
  useEffect(() => {
    if (!audioRecorder || !interviewStarted) return;

    if (audioInputEnabled && !audioRecorder.recording) {
      console.log('Starting audio recording for voice input');
      audioRecorder.start().catch((error) => {
        console.error('Failed to start audio recording:', error);
        setError('Failed to start microphone recording');
      });
    } else if (!audioInputEnabled && audioRecorder.recording) {
      console.log('Stopping audio recording');
      audioRecorder.stop();
    }
  }, [audioInputEnabled, audioRecorder, interviewStarted]);

  // Set up client event listeners
  useEffect(() => {
    if (!client) return;

    const handleOpen = () => {
      console.log('WebSocket connection opened successfully');
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    const handleClose = (event: CloseEvent) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setConnected(false);
      setConnecting(false);
      stopTimer();
    };

    const handleError = (error: ErrorEvent) => {
      console.error('WebSocket error:', error);
      setError(error.message || 'Connection error occurred');
      setConnecting(false);
    };

    const handleSetupComplete = () => {
      console.log('Setup complete event received');
    };

    const handleAudio = (data: ArrayBuffer) => {
      console.log('Received audio data from AI, playing through speakers:', data.byteLength, 'bytes');
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };

    client.on('open', handleOpen);
    client.on('close', handleClose);
    client.on('error', handleError);
    client.on('setupcomplete', handleSetupComplete);
    client.on('audio', handleAudio);

    return () => {
      client.off('open', handleOpen);
      client.off('close', handleClose);
      client.off('error', handleError);
      client.off('setupcomplete', handleSetupComplete);
      client.off('audio', handleAudio);
    };
  }, [client]);

  // Timer management functions
  const startTimer = useCallback(() => {
    setTimeRemaining(300); // Reset to 5 minutes
    
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        
        // When time reaches 0, we'll handle submission elsewhere
        if (newTime <= 0) {
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Handle successful video upload and save to database
  const handleSubmitToAPI = useCallback(async (uploadResult: { key: string; publicUrl: string }): Promise<string | null> => {
    try {
      const response = await fetch('/api/app/job-readiness/interviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_url: uploadResult.publicUrl,
          video_storage_path: uploadResult.key,
          questions: generatedQuestions,
          backgroundId: backgroundId,
        }),
      });

      const submitResult = await response.json();

      if (submitResult.success) {
        console.log('Interview submitted successfully:', submitResult.submissionId);
        setUploading(false);
        setUploadProgress(0);
        
        // 🆕 Remove session from database after successful submission
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          await supabase
            .from('active_interview_sessions')
            .delete()
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
          console.log('✅ Session removed after successful submission');
        } catch (error) {
          console.warn('⚠️ Failed to remove session after submission:', error);
        }
        
        return submitResult.submissionId;
      } else {
        throw new Error(submitResult.error || 'Failed to submit interview');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit interview';
      setError(errorMessage);
      setUploading(false);
      setUploadProgress(0);
      return null;
    }
  }, [generatedQuestions, backgroundId]);

  // Submit interview with direct upload
  const submitInterview = useCallback(async (): Promise<string | null> => {
    if (!recording || !screenRecorder) return null;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // 🆕 Mark session as completing in database
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase
          .from('active_interview_sessions')
          .update({ status: 'completing' })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      } catch (error) {
        console.warn('⚠️ Failed to update session status:', error);
      }
      
      // Stop recording
      const recordingResult = await screenRecorder.stopRecording();
      setVideoBlob(recordingResult.blob);
      setRecording(false);
      
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      // Stop timer
      stopTimer();
      
      // Disconnect from Live API
      disconnect();
      
      // Convert Blob to File for upload
      const videoFile = new File([recordingResult.blob], 'interview-recording.webm', {
        type: recordingResult.blob.type || 'video/webm',
      });
      
      // Upload video directly to R2
      await uploadFile(videoFile, {
        backgroundId: backgroundId,
        questions: JSON.stringify(generatedQuestions),
      });
      
      // Return will be handled by the onSuccess callback
      return null;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit interview';
      setError(errorMessage);
      setUploading(false);
      setUploadProgress(0);
      return null;
    }
  }, [recording, screenRecorder, backgroundId, generatedQuestions, stopTimer, uploadFile]);

  // Session management functions - moved up to fix dependency order
  const clearSessionTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Enhanced disconnect with session manager cleanup - moved up to fix dependency order
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket and cleaning up resources');
    
    // 🆕 Clean up database session record
    const cleanupDatabaseSession = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase
          .from('active_interview_sessions')
          .delete()
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        console.log('✅ Database session cleaned up');
      } catch (error) {
        console.warn('⚠️ Failed to cleanup database session:', error);
      }
    };
    
    // Clear all session timers
    clearSessionTimers();
    
    // Remove from session manager
    if (sessionIdRef.current) {
      sessionManager.completeSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }
    
    if (client) {
      client.disconnect();
    }
    
    // Stop audio recording
    if (audioRecorder && audioRecorder.recording) {
      console.log('🎤 Stopping audio recorder');
      audioRecorder.stop();
    }
    setAudioInputEnabled(false);
    
    // Auto-submit handler
    if (recording && screenRecorder) {
      console.log('📹 Stopping screen recorder');
      screenRecorder.stopRecording().then((result) => {
        setVideoBlob(result.blob);
      });
      setRecording(false);
    }
    
    // Stop media stream with detailed logging
    if (mediaStreamRef.current) {
      console.log('🎥 Stopping interview media stream tracks');
      mediaStreamRef.current.getTracks().forEach(track => {
        console.log(`🔌 Stopping ${track.kind} track:`, track.label);
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    
    stopTimer();
    setInterviewStarted(false);
    setSessionActive(false);
    
    // Clean up database session (don't await to avoid blocking)
    cleanupDatabaseSession();
    
    console.log('✅ All interview resources cleaned up');
  }, [client, recording, screenRecorder, audioRecorder, stopTimer, clearSessionTimers]);

  const handleInactivityDisconnect = useCallback(() => {
    console.log('🛑 Session terminated due to inactivity');
    setSessionActive(false);
    setError('Session ended due to inactivity. Your interview progress has been saved.');
    
    // Auto-submit if recording
    if (recording && screenRecorder) {
      // Don't await this since we're disconnecting anyway
      submitInterview().catch(error => {
        console.error('Failed to submit interview during inactivity disconnect:', error);
      });
    } else {
      disconnect();
    }
  }, [recording, screenRecorder, submitInterview, disconnect]);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivityWarning(false);
    
    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    
    // Only set timers if interview is active
    if (interviewStarted && sessionActive) {
      // Set warning timer
      warningTimerRef.current = setTimeout(() => {
        console.log('⚠️ Showing inactivity warning');
        setInactivityWarning(true);
      }, INACTIVITY_WARNING_TIME);
      
      // Set disconnect timer
      inactivityTimerRef.current = setTimeout(() => {
        console.log('🔌 Auto-disconnecting due to inactivity');
        handleInactivityDisconnect();
      }, INACTIVITY_DISCONNECT_TIME);
    }
  }, [interviewStarted, sessionActive, handleInactivityDisconnect]);

  // Create session disconnect callback for session manager
  const handleSessionManagerDisconnect = useCallback(() => {
    console.log('🔌 Session manager triggered disconnect');
    setError('Session ended due to inactivity');
    disconnect();
  }, [disconnect]);

  // Connect to Live API with session tracking
  const connect = useCallback(async (questions?: InterviewQuestion[]) => {
    if (!client || connecting || connected) return;
    
    console.log('🔌 connect() called with questions parameter:', questions);
    
    // Create session ID and register with session manager
    const sessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = sessionId;
    
    // Register session with automatic disconnect callback
    sessionManager.createSession(sessionId, 'current_user', handleSessionManagerDisconnect);
    
    // Store questions for use in system prompt
    const questionsToUse = questions || pendingQuestions;
    console.log('🔌 questionsToUse (final):', questionsToUse);
    console.log('🔌 questionsToUse length:', questionsToUse?.length || 0);
    
    if (questions && questions.length > 0) {
      console.log('🔌 Storing questions in pendingQuestions state');
      setPendingQuestions(questions);
    }
    
    console.log('Starting connection attempt...');
    setConnecting(true);
    setError(null);
    
    // Set a timeout to prevent infinite connecting state
    const connectionTimeout = setTimeout(() => {
      if (connecting) {
        console.error('Connection timeout after 10 seconds');
        setError('Connection timeout - please check your API key and internet connection');
        setConnecting(false);
        // Clean up session on timeout
        if (sessionIdRef.current) {
          sessionManager.removeSession(sessionIdRef.current);
          sessionIdRef.current = null;
        }
      }
    }, 10000);
    
    try {
      console.log('Calling client.connect...');
      
      // Build system instruction with questions if provided
      let systemInstructionText = "You are Alice, a cheerful and jolly AI interviewer. Conduct a professional job interview. Maintain a cheerful and jolly tone throughout. Keep responses concise and natural.";
      
      if (questionsToUse && questionsToUse.length > 0) {
        console.log('📝 Generated questions loaded for AI:', questionsToUse);
        console.log('📝 Number of questions:', questionsToUse.length);
        
        systemInstructionText += `\n\nAfter the candidate introduces themselves, proceed to ask these specific questions in order:\n`;
        questionsToUse.forEach((q, index) => {
          console.log(`📝 Question ${index + 1}:`, q.question_text);
          systemInstructionText += `${index + 1}. ${q.question_text}\n`;
        });
        systemInstructionText += `\nYour first task is to introduce yourself as Alice and ask the candidate to introduce themselves. After the candidate answers each question from the list, provide brief feedback and then move to the next question. Maintain a professional but friendly tone throughout.`;
        
        systemInstructionText += `\n\nCRITICAL AUDIO RESPONSE INSTRUCTIONS:
- ONLY respond to clear, audible speech from the candidate
- DO NOT respond to background noise, silence, breathing, or unclear sounds
- If you receive audio input that contains no meaningful speech content, say: "I didn't catch that. Could you please repeat your answer?"
- DO NOT give positive feedback unless you hear a clear, meaningful verbal response with actual words and content
- WAIT for the candidate to actually speak meaningful words before acknowledging their response
- If you receive empty audio or just background noise, gently prompt: "I'm listening for your response. Please share your thoughts."
- Only move to the next question after receiving a clear verbal answer with actual content to the current question
- Distinguish between actual speech responses and ambient audio - only respond to real answers`;
        
        systemInstructionText += `\n\nSTRICT INSTRUCTION: You MUST only focus on the interview questions and the candidate's responses related to the interview. Ignore any unrelated topics or conversational tangents. Do not engage in discussion outside the scope of the interview questions.`;
      } else {
        console.warn('⚠️ No questions provided to AI system prompt');
      }
      
      console.log('🤖 Complete AI system prompt:', systemInstructionText);
      
      // The connect method returns immediately, actual connection happens via events
      const connectionStarted = await client.connect("gemini-2.5-flash-preview-native-audio-dialog", {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" }
          }
        },
        systemInstruction: {
          parts: [{ text: systemInstructionText }]
        }
      });
      
      console.log('Connection result:', connectionStarted);
      
      if (!connectionStarted) {
        clearTimeout(connectionTimeout);
        // Clean up session on failure
        if (sessionIdRef.current) {
          sessionManager.removeSession(sessionIdRef.current);
          sessionIdRef.current = null;
        }
        throw new Error('Failed to start connection - check your API key');
      }
      
      console.log('Connection started successfully, waiting for open event...');
      // The connecting state will be cleared by the 'open' event handler
      // If connection fails, it will be cleared by the 'error' event handler
      
    } catch (err) {
      clearTimeout(connectionTimeout);
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnecting(false);
      // Clean up session on error
      if (sessionIdRef.current) {
        sessionManager.removeSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
    }
  }, [client, connecting, connected, pendingQuestions, handleSessionManagerDisconnect]);

  // Update connect function when pendingQuestions change
  useEffect(() => {
    if (pendingQuestions.length > 0) {
      console.log('📝 pendingQuestions updated:', pendingQuestions);
    }
  }, [pendingQuestions]);

  // Start interview with questions
  const startInterview = useCallback(async (questions: InterviewQuestion[]) => {
    console.log('🎯 startInterview called with questions:', questions);
    console.log('🎯 Number of questions received:', questions?.length || 0);
    
    // Store questions immediately
    setGeneratedQuestions(questions);
    setPendingQuestions(questions);
    
    // 🆕 Register session in database for crash recovery
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('active_interview_sessions').upsert({
          user_id: user.id,
          session_id: sessionIdRef.current,
          status: 'active'
        });
      }
      console.log('✅ Session registered in database:', sessionIdRef.current);
    } catch (error) {
      console.warn('⚠️ Failed to register session in database:', error);
      // Don't block interview start - this is just for crash recovery
    }
    
    // First connect with the questions if not already connected
    if (!connected) {
      console.log('🔌 Not connected, calling connect with questions...');
      await connect(questions);
      // Wait for connection to be established
      return new Promise<void>((resolve, reject) => {
        const checkConnection = () => {
          if (connected) {
            console.log('✅ Connection established, starting interview session...');
            // Connection established, now start the actual interview
            startInterviewSession(questions).then(resolve).catch(reject);
          } else if (error) {
            console.error('❌ Connection error detected:', error);
            reject(new Error(error));
          } else {
            // Still connecting, check again in 100ms
            console.log('⏳ Still connecting, checking again...');
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    } else {
      console.log('✅ Already connected, starting interview directly...');
      // Already connected, start interview directly
      return startInterviewSession(questions);
    }
  }, [connected, error, connect]);

  // Separate function for the actual interview session setup
  const startInterviewSession = useCallback(async (questions: InterviewQuestion[]) => {
    if (interviewStarted) return;
    
    try {
      setGeneratedQuestions(questions);
      
      // Initialize screen recorder with screen share end handler
      const recorder = new ScreenRecorder({
        onScreenShareEnded: () => {
          console.log('🛑 Screen share ended - disconnecting and auto-submitting interview');
          setScreenShareInterrupted(true);
          setError('Screen sharing was stopped. Interview has been automatically submitted.');
          
          // Stop audio input immediately
          setAudioInputEnabled(false);
          
          // Disconnect WebSocket connection
          if (client && client.isConnected()) {
            console.log('🔌 Closing WebSocket connection due to screen share end');
            client.disconnect();
            setConnected(false);
          }
          
          // Stop all session timers
          clearSessionTimers();
          stopTimer();
          setInterviewStarted(false);
          setSessionActive(false);
          
          // Auto-submit the interview immediately
          submitInterview().catch(error => {
            console.error('Failed to submit interview after screen share ended:', error);
          });
        }
      });
      setScreenRecorder(recorder);
      
      // Start screen recording (captures screen + system audio + microphone)
      await recorder.startRecording();
      setRecording(true);
      
      // Check if system audio was captured after a short delay
      setTimeout(() => {
        const audioInfo = recorder.getAudioSourceInfo();
        setHasSystemAudio(audioInfo.hasSystemAudio);
        if (audioInfo.hasSystemAudio) {
          console.log('✅ System audio successfully captured');
        } else {
          console.warn('⚠️ No system audio - user may not have enabled "Share audio"');
        }
      }, 1000);
      
      // Clear media stream ref since screen recorder manages its own streams
      mediaStreamRef.current = null;
      
      // Enable audio input for AI conversation
      setAudioInputEnabled(true);
      
      // Start the interview timer
      startTimer();
      setInterviewStarted(true);
      
      // Send initial greeting through Live API - the AI will now use the questions from system prompt
      if (client) {
        client.send([{
          text: `Please begin the interview by greeting the candidate and asking the first question.`
        }]);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
    }
  }, [interviewStarted, client, startTimer]);

  // Toggle audio input
  const toggleAudioInput = useCallback(() => {
    setAudioInputEnabled(!audioInputEnabled);
  }, [audioInputEnabled]);

  // Handle timer reaching zero - placed after all function declarations
  useEffect(() => {
    if (timeRemaining === 0 && recording) {
      // Handle auto-submit when timer reaches zero
      submitInterview().then(submissionId => {
        if (submissionId) {
          console.log('⏰ Timer expired: Interview auto-submitted with ID:', submissionId);
        }
      }).catch(error => {
        console.error('Failed to auto-submit interview when timer expired:', error);
      });
    }
  }, [timeRemaining, recording, submitInterview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 LiveInterviewContext unmounting - cleaning up all resources');
      
      stopTimer();
      clearSessionTimers();
      
      // Ensure media stream is stopped
      if (mediaStreamRef.current) {
        console.log('🎥 Final cleanup: stopping media stream');
        mediaStreamRef.current.getTracks().forEach(track => {
          console.log(`🔌 Final stop ${track.kind} track:`, track.label);
          track.stop();
        });
        mediaStreamRef.current = null;
      }
      
      // Stop audio recorder
      if (audioRecorder && audioRecorder.recording) {
        console.log('🎤 Final cleanup: stopping audio recorder');
        audioRecorder.stop();
      }
      
      // Disconnect client
      if (client && connected) {
        console.log('🔌 Final cleanup: disconnecting client');
        client.disconnect();
      }
      
      // Clean up session
      if (sessionIdRef.current) {
        sessionManager.completeSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
      
      console.log('✅ LiveInterviewContext cleanup completed');
    };
  }, [stopTimer, clearSessionTimers, client, connected, audioRecorder]);

  // Page visibility and activity detection with session tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Page hidden - pausing activity tracking');
        // Don't immediately disconnect, but pause activity tracking
      } else {
        console.log('📱 Page visible - resuming activity tracking');
        resetInactivityTimer();
        // Update session manager activity
        if (sessionIdRef.current) {
          sessionManager.updateActivity(sessionIdRef.current);
        }
      }
    };

    const handleUserActivity = () => {
      if (interviewStarted && sessionActive) {
        resetInactivityTimer();
        // Update session manager activity
        if (sessionIdRef.current) {
          sessionManager.updateActivity(sessionIdRef.current);
        }
      }
    };

    const handleBeforeUnload = () => {
      console.log('🚪 Page unloading - cleaning up WebSocket and session');
      if (client && connected) {
        client.disconnect();
      }
      // Clean up session
      if (sessionIdRef.current) {
        sessionManager.completeSession(sessionIdRef.current);
      }
    };

    // Activity event listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      // Cleanup event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [interviewStarted, sessionActive, resetInactivityTimer, client, connected]);

  // Connection health monitoring
  useEffect(() => {
    if (!connected || !interviewStarted) {
      return;
    }

    const startHeartbeat = () => {
      heartbeatTimerRef.current = setInterval(() => {
        if (client && connected) {
          const timeSinceActivity = Date.now() - lastActivityRef.current;
          
          // If no activity for too long, send a ping to check connection
          if (timeSinceActivity > HEARTBEAT_INTERVAL) {
            console.log('💓 Sending heartbeat ping');
            try {
              client.send([{ text: 'ping' }]);
            } catch (error) {
              console.error('❌ Heartbeat failed, connection may be dead:', error);
              handleInactivityDisconnect();
            }
          }
        }
      }, HEARTBEAT_INTERVAL);
    };

    startHeartbeat();

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [connected, interviewStarted, client, handleInactivityDisconnect]);

  // Initialize activity timer when interview starts
  useEffect(() => {
    if (interviewStarted && sessionActive) {
      resetInactivityTimer();
    } else {
      clearSessionTimers();
    }
  }, [interviewStarted, sessionActive, resetInactivityTimer, clearSessionTimers]);

  const value: LiveInterviewContextType = {
    client,
    connected,
    connecting,
    recording,
    timeRemaining,
    interviewStarted,
    screenRecorder,
    videoBlob,
    hasSystemAudio,
    screenShareInterrupted,
    uploading: uploading || videoUploading,
    uploadProgress,
    audioStreamer: audioStreamerRef.current,
    audioRecorder,
    audioInputEnabled,
    generatedQuestions,
    sessionActive,
    inactivityWarning,
    connect,
    disconnect,
    startInterview,
    submitInterview,
    toggleAudioInput,
    resetInactivityTimer,
    error,
  };

  return (
    <LiveInterviewContext.Provider value={value}>
      {children}
    </LiveInterviewContext.Provider>
  );
}

export function useLiveInterviewContext() {
  const context = useContext(LiveInterviewContext);
  if (!context) {
    throw new Error('useLiveInterviewContext must be used within a LiveInterviewProvider');
  }
  return context;
} 