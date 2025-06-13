import { VideoRecordingOptions, WebMRecordingResult } from '../types';

export class WebMVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private currentSize = 0;
  private recordingStartTime = 0;
  private stream: MediaStream | null = null;
  
  // Recording state
  private isRecording = false;
  private isPaused = false;

  // Events
  private onDataAvailable?: (blob: Blob) => void;
  private onStop?: (result: WebMRecordingResult) => void;
  private onError?: (error: Error) => void;

  constructor(options?: {
    onDataAvailable?: (blob: Blob) => void;
    onStop?: (result: WebMRecordingResult) => void;
    onError?: (error: Error) => void;
  }) {
    this.onDataAvailable = options?.onDataAvailable;
    this.onStop = options?.onStop;
    this.onError = options?.onError;
  }

  async startRecording(stream: MediaStream): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    this.stream = stream;
    this.chunks = [];
    this.currentSize = 0;
    this.recordingStartTime = Date.now();

    // Configure MediaRecorder options for WebM - NO COMPRESSION
    const options: VideoRecordingOptions = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 5000000, // 🔥 INCREASED: 5Mbps for high quality raw recording
      audioBitsPerSecond: 256000,  // 🔥 INCREASED: 256kbps for high quality audio
    };

    // Fallback options if VP9 isn't supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.setupEventHandlers();
      
      // Start recording with 1-second time slices for monitoring
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      
      console.log('🎥 WebM recording started with HIGH QUALITY (no compression):', options);
    } catch (error) {
      this.handleError(new Error(`Failed to start recording: ${error}`));
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.currentSize += event.data.size;
        
        // 🔥 REMOVED: All size limit checks and compression logic
        console.log(`📹 Recording chunk: ${event.data.size} bytes, total: ${this.currentSize} bytes`);
        
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
      
      // 🔥 NO COMPRESSION: Use raw blob without any size checks or compression
      const finalBlob = new Blob(this.chunks, { type: 'video/webm' });
      
      console.log(`✅ Raw recording completed: ${finalBlob.size} bytes (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB)`);

      const result: WebMRecordingResult = {
        blob: finalBlob,
        sizeBytes: finalBlob.size,
        durationMs: recordingDuration
      };

      this.onStop?.(result);
    } catch (error) {
      this.handleError(new Error(`Failed to process recording: ${error}`));
    }
  }

  private handleError(error: Error): void {
    this.isRecording = false;
    this.isPaused = false;
    console.error('WebM Recorder Error:', error);
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

  // Cleanup
  destroy(): void {
    if (this.isRecording) {
      this.stopRecording().catch(console.error);
    }
    
    this.chunks = [];
    this.mediaRecorder = null;
    this.stream = null;
    this.onDataAvailable = undefined;
    this.onStop = undefined;
    this.onError = undefined;
  }
} 