import { VideoRecordingOptions, WebMRecordingResult } from '../types';

export class WebMVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private readonly maxSizeBytes = 20 * 1024 * 1024; // 20MB
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
  private onSizeWarning?: (currentSize: number, maxSize: number) => void;

  constructor(options?: {
    onDataAvailable?: (blob: Blob) => void;
    onStop?: (result: WebMRecordingResult) => void;
    onError?: (error: Error) => void;
    onSizeWarning?: (currentSize: number, maxSize: number) => void;
  }) {
    this.onDataAvailable = options?.onDataAvailable;
    this.onStop = options?.onStop;
    this.onError = options?.onError;
    this.onSizeWarning = options?.onSizeWarning;
  }

  async startRecording(stream: MediaStream): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    this.stream = stream;
    this.chunks = [];
    this.currentSize = 0;
    this.recordingStartTime = Date.now();

    // Configure MediaRecorder options for WebM
    const options: VideoRecordingOptions = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 1000000, // 1Mbps initial bitrate
      audioBitsPerSecond: 128000,  // 128kbps audio
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
      
      console.log('WebM recording started with options:', options);
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
        
        // Check if approaching size limit (80% of max)
        if (this.currentSize > this.maxSizeBytes * 0.8) {
          this.onSizeWarning?.(this.currentSize, this.maxSizeBytes);
          this.adjustQuality();
        }
        
        // Force stop if exceeding size limit
        if (this.currentSize > this.maxSizeBytes) {
          console.warn('Recording size limit exceeded, stopping recording');
          this.stopRecording();
        }

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

  private adjustQuality(): void {
    // If we're approaching the size limit, we can't dynamically change
    // the MediaRecorder settings, but we can warn and prepare for compression
    console.log('Approaching size limit, may need post-recording compression');
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
      let finalBlob = new Blob(this.chunks, { type: 'video/webm' });

      // If the file is too large, attempt compression
      if (finalBlob.size > this.maxSizeBytes) {
        console.log(`Recording size (${finalBlob.size}) exceeds limit, attempting compression`);
        finalBlob = await this.compressIfNeeded(finalBlob);
      }

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

  private async compressIfNeeded(blob: Blob): Promise<Blob> {
    // Simple compression strategy: re-encode with lower quality
    // This is a basic implementation - in production, you might want more sophisticated compression
    
    if (blob.size <= this.maxSizeBytes) {
      return blob;
    }

    try {
      // Create a video element to re-encode
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context for compression');
      }

      return new Promise((resolve) => {
        video.onloadedmetadata = async () => {
          // Reduce resolution for compression
          const scaleFactor = Math.sqrt(this.maxSizeBytes / blob.size);
          canvas.width = video.videoWidth * scaleFactor;
          canvas.height = video.videoHeight * scaleFactor;

          // Create a new MediaRecorder with lower quality
          const canvasStream = canvas.captureStream(30);
          const compressedRecorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp8',
            videoBitsPerSecond: 500000 // Lower bitrate
          });

          const compressedChunks: Blob[] = [];
          
          compressedRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              compressedChunks.push(event.data);
            }
          };

          compressedRecorder.onstop = () => {
            const compressedBlob = new Blob(compressedChunks, { type: 'video/webm' });
            resolve(compressedBlob.size <= this.maxSizeBytes ? compressedBlob : blob);
          };

          compressedRecorder.start();

          // Draw video frames to canvas (simplified - would need proper frame timing)
          const drawFrame = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (!video.ended) {
              requestAnimationFrame(drawFrame);
            } else {
              compressedRecorder.stop();
            }
          };

          video.play();
          drawFrame();
        };

        video.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error('Compression failed, returning original blob:', error);
      return blob;
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

  getMaxSize(): number {
    return this.maxSizeBytes;
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
    this.onSizeWarning = undefined;
  }
} 