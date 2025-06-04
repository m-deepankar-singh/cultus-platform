/**
 * Live Client Options for Gemini AI
 */
export interface LiveClientOptions {
  apiKey: string;
}

/**
 * Streaming log types for debugging and monitoring
 */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message:
    | string
    | ClientContentLog
    | any; // For other message types from LiveServerMessage
};

export type ClientContentLog = {
  turns: any[];
  turnComplete: boolean;
};

/**
 * Interview-specific types
 */
export interface InterviewQuestion {
  id: string;
  question_text: string;
}

export interface InterviewQuestionsResponse {
  questions: InterviewQuestion[];
  cached: boolean;
}

/**
 * Video recording types
 */
export interface VideoRecordingOptions {
  mimeType: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export interface WebMRecordingResult {
  blob: Blob;
  sizeBytes: number;
  durationMs: number;
} 