import { VideoRecordingOptions, WebMRecordingResult } from '../types';

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private currentSize = 0;
  private recordingStartTime = 0;
  private displayStream: MediaStream | null = null;
  private microphoneStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  
  // Recording state
  private isRecording = false;
  private isPaused = false;

  // Events
  private onDataAvailable?: (blob: Blob) => void;
  private onStop?: (result: WebMRecordingResult) => void;
  private onError?: (error: Error) => void;
  private onScreenShareEnded?: () => void;

  constructor(options?: {
    onDataAvailable?: (blob: Blob) => void;
    onStop?: (result: WebMRecordingResult) => void;
    onError?: (error: Error) => void;
    onScreenShareEnded?: () => void;
  }) {
    this.onDataAvailable = options?.onDataAvailable;
    this.onStop = options?.onStop;
    this.onError = options?.onError;
    this.onScreenShareEnded = options?.onScreenShareEnded;
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    // Check browser compatibility
    if (!ScreenRecorder.isSupported()) {
      throw new Error(
        'Screen recording is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.'
      );
    }

    try {
      // Request screen capture with system audio
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        }
      });

      // Request microphone access for candidate voice
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });

      // Combine screen video with both system and microphone audio
      this.combinedStream = this.combineStreams(this.displayStream, this.microphoneStream);

      this.chunks = [];
      this.currentSize = 0;
      this.recordingStartTime = Date.now();

      // Configure MediaRecorder options for WebM - HIGH QUALITY
      const options: VideoRecordingOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 5000000, // 5Mbps for high quality screen recording
        audioBitsPerSecond: 256000,  // 256kbps for high quality audio (system + mic)
      };

      // Fallback options if VP9 isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.combinedStream, options);
      this.setupEventHandlers();
      
      // Start recording with 1-second time slices for monitoring
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      
      console.log('🖥️ Screen recording started with HIGH QUALITY:', options);
      console.log('📹 Display stream tracks:', this.displayStream.getTracks().map(t => `${t.kind}: ${t.label}`));
      console.log('🎤 Microphone stream tracks:', this.microphoneStream.getTracks().map(t => `${t.kind}: ${t.label}`));
      
      // Check if system audio was captured
      const systemAudioTrack = this.displayStream.getAudioTracks()[0];
      if (systemAudioTrack) {
        console.log('✅ System audio captured:', systemAudioTrack.label);
      } else {
        console.warn('⚠️ No system audio captured - user may have disabled audio sharing or browser doesn\'t support it');
      }

      // Handle stream ending (user stops screen share)
      this.displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🖥️ Screen share ended by user - stopping recording');
        this.handleScreenShareEnded();
      });

    } catch (error) {
      let errorMessage = 'Failed to start screen recording';
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Screen recording permission was denied. Please allow screen sharing and try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Screen recording is not supported in this browser. Please use Chrome, Firefox, Safari, or Edge.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No screen sources available for recording.';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Screen recording was cancelled by the user.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Screen recording failed due to hardware or system constraints.';
        } else {
          errorMessage = `Screen recording failed: ${error.message}`;
        }
      }
      
      this.handleError(new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }

  private combineStreams(displayStream: MediaStream, microphoneStream: MediaStream): MediaStream {
    const combinedStream = new MediaStream();
    
    // Add video track from display stream
    const videoTrack = displayStream.getVideoTracks()[0];
    if (videoTrack) {
      combinedStream.addTrack(videoTrack);
    }

    // Add audio tracks from both streams
    const systemAudioTrack = displayStream.getAudioTracks()[0];
    const microphoneAudioTrack = microphoneStream.getAudioTracks()[0];
    
    if (systemAudioTrack) {
      combinedStream.addTrack(systemAudioTrack);
      console.log('🔊 Added system audio track:', systemAudioTrack.label);
    } else {
      console.log('⚠️ No system audio - will rely on separate AI audio capture');
    }
    
    if (microphoneAudioTrack) {
      combinedStream.addTrack(microphoneAudioTrack);
      console.log('🎤 Added microphone audio track:', microphoneAudioTrack.label);
    }

    return combinedStream;
  }

  // Add method to inject additional audio track (for AI audio)
  addAudioTrack(audioTrack: MediaStreamTrack): void {
    if (this.combinedStream && audioTrack.kind === 'audio') {
      this.combinedStream.addTrack(audioTrack);
      console.log('🤖 Added AI audio track:', audioTrack.label);
    }
  }

  private setupEventHandlers(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.currentSize += event.data.size;
        
        console.log(`🖥️ Screen recording chunk: ${event.data.size} bytes, total: ${this.currentSize} bytes`);
        
        this.onDataAvailable?.(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.handleRecordingStopped();
    };

    this.mediaRecorder.onerror = (event) => {
      this.handleError(new Error(`MediaRecorder error: ${event}`));
    };

    this.mediaRecorder.onpause = () => {
      this.isPaused = true;
    };

    this.mediaRecorder.onresume = () => {
      this.isPaused = false;
    };
  }

  async stopRecording(): Promise<WebMRecordingResult> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      const originalOnStop = this.onStop;
      
      this.onStop = (result) => {
        // Restore original handler
        this.onStop = originalOnStop;
        resolve(result);
      };

      // Set up error handling for this specific stop operation
      const errorHandler = (error: Error) => {
        this.onStop = originalOnStop;
        reject(error);
      };

      try {
        this.mediaRecorder!.stop();
      } catch (error) {
        errorHandler(new Error(`Failed to stop recording: ${error}`));
      }
    });
  }

  private async handleRecordingStopped(): Promise<void> {
    this.isRecording = false;
    this.isPaused = false;

    try {
      const recordingDuration = Date.now() - this.recordingStartTime;
      
      // Create final blob without compression
      const finalBlob = new Blob(this.chunks, { type: 'video/webm' });
      
      console.log(`✅ Screen recording completed: ${finalBlob.size} bytes (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB)`);

      const result: WebMRecordingResult = {
        blob: finalBlob,
        sizeBytes: finalBlob.size,
        durationMs: recordingDuration
      };

      // Clean up streams
      this.cleanup();

      this.onStop?.(result);
    } catch (error) {
      this.handleError(new Error(`Failed to process recording: ${error}`));
    }
  }

  private cleanup(): void {
    // Stop all tracks from display stream
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🔌 Stopped display ${track.kind} track:`, track.label);
      });
      this.displayStream = null;
    }

    // Stop all tracks from microphone stream
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🔌 Stopped microphone ${track.kind} track:`, track.label);
      });
      this.microphoneStream = null;
    }

    // Clear combined stream reference
    this.combinedStream = null;
  }

  private handleScreenShareEnded(): void {
    console.log('🛑 Screen share ended - triggering interview termination');
    
    // Stop recording immediately
    if (this.isRecording) {
      this.stopRecording().catch(console.error);
    }
    
    // Notify parent component that screen share ended
    this.onScreenShareEnded?.();
  }

  private handleError(error: Error): void {
    this.isRecording = false;
    this.isPaused = false;
    this.cleanup();
    console.error('Screen Recorder Error:', error);
    this.onError?.(error);
  }

  // Utility methods
  getCurrentSize(): number {
    return this.currentSize;
  }

  getRecordingState(): {
    isRecording: boolean;
    isPaused: boolean;
    currentSize: number;
    duration: number;
  } {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      currentSize: this.currentSize,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0
    };
  }

  pause(): void {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
    }
  }

  // Check if screen recording is supported
  static isSupported(): boolean {
    // Check for required APIs
    const hasGetDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRecorder = !!window.MediaRecorder;
    
    return hasGetDisplayMedia && hasGetUserMedia && hasMediaRecorder;
  }

  // Get detailed browser compatibility information
  static getBrowserInfo(): {
    supported: boolean;
    features: {
      getDisplayMedia: boolean;
      getUserMedia: boolean;
      mediaRecorder: boolean;
      webm: boolean;
    };
    userAgent: string;
  } {
    const features = {
      getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      mediaRecorder: !!window.MediaRecorder,
      webm: !!(window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm'))
    };

    return {
      supported: Object.values(features).every(Boolean),
      features,
      userAgent: navigator.userAgent
    };
  }

  // Get available display media constraints
  static async getCapabilities(): Promise<{
    supportsSystemAudio: boolean;
    supportedMimeTypes: string[];
  }> {
    const supportedMimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ].filter(mimeType => MediaRecorder.isTypeSupported(mimeType));

    return {
      supportsSystemAudio: true, // getDisplayMedia supports audio request
      supportedMimeTypes
    };
  }

  // Check what audio sources are captured in the combined stream
  getAudioSourceInfo(): {
    hasSystemAudio: boolean;
    hasMicrophoneAudio: boolean;
    totalAudioTracks: number;
    audioTrackLabels: string[];
  } {
    if (!this.combinedStream) {
      return {
        hasSystemAudio: false,
        hasMicrophoneAudio: false,
        totalAudioTracks: 0,
        audioTrackLabels: []
      };
    }

    const audioTracks = this.combinedStream.getAudioTracks();
    const systemAudioTrack = this.displayStream?.getAudioTracks()[0];
    const microphoneAudioTrack = this.microphoneStream?.getAudioTracks()[0];

    return {
      hasSystemAudio: !!systemAudioTrack,
      hasMicrophoneAudio: !!microphoneAudioTrack,
      totalAudioTracks: audioTracks.length,
      audioTrackLabels: audioTracks.map(track => track.label)
    };
  }

  // Cleanup - destroy all resources
  destroy(): void {
    if (this.isRecording) {
      this.stopRecording().catch(console.error);
    }
    
    this.cleanup();
    this.chunks = [];
    this.mediaRecorder = null;
    this.onDataAvailable = undefined;
    this.onStop = undefined;
    this.onError = undefined;
  }
}