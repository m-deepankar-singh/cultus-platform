import { useState, useRef, useCallback, useEffect } from 'react';
import { WebMVideoRecorder } from '@/lib/ai/webm-video-recorder';
import { WebMRecordingResult } from '@/lib/types';

export interface UseVideoRecordingResult {
  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  
  // Video data
  videoBlob: Blob | null;
  videoURL: string | null;
  fileSizeBytes: number;
  fileSizeMB: number;
  
  // Actions
  startRecording: (stream: MediaStream) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  
  // Status
  error: string | null;
}

/**
 * Custom hook for managing WebM video recording with NO file size limits
 * Raw, uncompressed video recording for interview analysis
 */
export function useVideoRecording(): UseVideoRecordingResult {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Video data
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Internal state
  const recorderRef = useRef<WebMVideoRecorder | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sizeMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculated values
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  // Start recording duration and size monitoring
  const startMonitoring = useCallback(() => {
    // Duration monitoring
    durationIntervalRef.current = setInterval(() => {
      if (recorderRef.current) {
        const state = recorderRef.current.getRecordingState();
        setRecordingDuration(Math.floor(state.duration / 1000));
        setIsRecording(state.isRecording);
        setIsPaused(state.isPaused);
      }
    }, 1000);

    // Size monitoring (for display purposes only)
    sizeMonitorIntervalRef.current = setInterval(() => {
      if (recorderRef.current) {
        const currentSize = recorderRef.current.getCurrentSize();
        setFileSizeBytes(currentSize);
      }
    }, 500);
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (sizeMonitorIntervalRef.current) {
      clearInterval(sizeMonitorIntervalRef.current);
      sizeMonitorIntervalRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (stream: MediaStream) => {
    try {
      setError(null);
      
      // Create new recorder instance with event handlers - NO SIZE LIMITS
      const recorder = new WebMVideoRecorder({
        onDataAvailable: (blob: Blob) => {
          // Update size as data becomes available (for display only)
          if (recorderRef.current) {
            const currentSize = recorderRef.current.getCurrentSize();
            setFileSizeBytes(currentSize);
          }
        },
        onStop: (result: WebMRecordingResult) => {
          setVideoBlob(result.blob);
          setFileSizeBytes(result.sizeBytes);
          setRecordingDuration(Math.floor(result.durationMs / 1000));
          
          console.log(`🎥 Raw recording completed: ${result.sizeBytes} bytes (${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
          
          // Create URL for preview
          const url = URL.createObjectURL(result.blob);
          setVideoURL(url);
          
          // Update state
          setIsRecording(false);
          setIsPaused(false);
          
          // Stop monitoring
          stopMonitoring();
        },
        onError: (error: Error) => {
          setError(error.message);
          setIsRecording(false);
          setIsPaused(false);
          stopMonitoring();
          console.error('Recording error:', error);
        }
      });
      
      recorderRef.current = recorder;
      
      // Start recording
      await recorder.startRecording(stream);
      
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      setFileSizeBytes(0);
      
      // Start monitoring
      startMonitoring();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('Recording start error:', err);
    }
  }, [startMonitoring, stopMonitoring]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recorderRef.current || !isRecording) {
      return null;
    }

    try {
      setError(null);
      
      // Stop the recorder and get the result
      const result = await recorderRef.current.stopRecording();
      
      // Stop monitoring
      stopMonitoring();
      
      // Clean up recorder
      recorderRef.current = null;
      
      return result.blob;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      console.error('Recording stop error:', err);
      stopMonitoring();
      return null;
    }
  }, [isRecording, stopMonitoring]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (recorderRef.current && isRecording && !isPaused) {
      try {
        recorderRef.current.pause();
        setIsPaused(true);
      } catch (err) {
        console.error('Failed to pause recording:', err);
        setError('Failed to pause recording');
      }
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (recorderRef.current && isRecording && isPaused) {
      try {
        recorderRef.current.resume();
        setIsPaused(false);
      } catch (err) {
        console.error('Failed to resume recording:', err);
        setError('Failed to resume recording');
      }
    }
  }, [isRecording, isPaused]);

  // Clear recording data
  const clearRecording = useCallback(() => {
    // Stop recording if active
    if (isRecording && recorderRef.current) {
      recorderRef.current.stopRecording().catch(console.error);
    }
    
    // Clean up URL
    if (videoURL) {
      URL.revokeObjectURL(videoURL);
    }
    
    // Reset state
    setVideoBlob(null);
    setVideoURL(null);
    setFileSizeBytes(0);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    setError(null);
    
    // Stop monitoring
    stopMonitoring();
    
    // Clean up recorder
    if (recorderRef.current) {
      recorderRef.current.destroy();
      recorderRef.current = null;
    }
  }, [isRecording, videoURL, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (recorderRef.current) {
        recorderRef.current.destroy();
      }
      
      // Stop monitoring
      stopMonitoring();
      
      // Clean up URL
      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, [stopMonitoring, videoURL]);

  return {
    // Recording state
    isRecording,
    isPaused,
    recordingDuration,
    
    // Video data
    videoBlob,
    videoURL,
    fileSizeBytes,
    fileSizeMB,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    
    // Status
    error,
  };
} 