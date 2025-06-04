# AI Interview Implementation Plan v2.0

## Overview
Implementation of real-time AI interview simulations using Gemini 2.5 Flash Live API with native audio, client-side WebM video recording, automatic AI verdict determination, and comprehensive admin override capabilities.

## Key Features
- 5-minute real-time AI interviews with live voice interaction
- Client-side WebM video recording (<20MB limit)
- Background-specific question generation fed to AI system prompts
- **Automatic AI verdict (Approved/Rejected) with admin override**
- Structured analysis with 5 scoring categories (0-25 points each)
- Post-interview AI analysis based on video review
- Complete video playback for admin review

## Technical Stack
- **Live Interview AI**: Gemini 2.5 Flash Live (gemini-2.5-flash-preview-native-audio-dialog) with native audio
- **Video Analysis & Question Generation AI**: Gemini 2.0 Flash via Files API for multimodal analysis and question generation
- **WebSocket**: Direct integration using provided GenAI Live client
- **Video Recording**: Client-side WebM with MediaRecorder API
- **Storage**: Supabase Storage for video files (permanent storage)
- **Analysis**: Structured outputs with JSON schema for consistent scoring
- **Verdict**: Automatic AI determination (70+ score = Approved) with admin override

---

## Phase 1: Foundation & WebSocket Integration (Week 1-2) ✅ COMPLETED

### 1.1 Core Infrastructure Setup
- [x] **Install Gemini Live Dependencies** ✅
  ```bash
  pnpm add @google/genai eventemitter3 classnames
  ```

- [x] **Environment Configuration** ✅
  ```env
  GEMINI_API_KEY=your_api_key_here  # Server-side only (not NEXT_PUBLIC_)
  ```

- [x] **Create Base WebSocket Client** (`lib/ai/gemini-live-client.ts`) ✅
  - Adapted GenAI Live client from provided example
  - Added interview-specific event handling
  - Implemented session management with 5-minute timer
  - Added automatic submission on timeout

- [x] **Audio System Setup** (`lib/ai/audio-recorder.ts`) ✅
  - Ported audio recording worklets from example
  - Implemented volume meter and audio processing
  - Added audio context management
  - Configured 16kHz PCM audio streaming

### 1.2 Video Recording Infrastructure
- [x] **WebM Video Recorder** (`lib/ai/webm-video-recorder.ts`) ✅
  ```typescript
  export class WebMVideoRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private readonly maxSizeBytes = 20 * 1024 * 1024; // 20MB
    
    async startRecording(stream: MediaStream): Promise<void>
    async stopRecording(): Promise<Blob>
    private checkFileSize(): void
    private compressIfNeeded(blob: Blob): Promise<Blob>
  }
  ```

- [x] **Video Compression Utility** (`lib/ai/webm-video-recorder.ts`) ✅
  - Implemented dynamic bitrate adjustment
  - Added resolution scaling if size exceeds 20MB
  - Fallback compression strategies

### 1.3 Database Schema Updates
- [x] **Add Verdict Fields to Interviews Table** ✅
  ```sql
  ALTER TABLE job_readiness_interview_submissions ADD COLUMN ai_verdict TEXT CHECK (ai_verdict IN ('approved', 'rejected'));
  ALTER TABLE job_readiness_interview_submissions ADD COLUMN admin_verdict_override TEXT CHECK (admin_verdict_override IN ('approved', 'rejected'));
  ALTER TABLE job_readiness_interview_submissions ADD COLUMN final_verdict TEXT CHECK (final_verdict IN ('approved', 'rejected'));
  ALTER TABLE job_readiness_interview_submissions ADD COLUMN verdict_reason TEXT;
  ALTER TABLE job_readiness_interview_submissions ADD COLUMN confidence_score DECIMAL(3,2);
  ALTER TABLE job_readiness_interview_submissions ADD COLUMN questions_used JSONB; -- Store questions generated for this interview
  ```

### 1.4 Question Generation System (Early Implementation)
- [x] **Background-Specific Question Generator** (`lib/ai/question-generator.ts`) ✅
  - Uses Gemini 2.0 Flash with structured outputs
  - Generates 8-12 contextual questions based on background and user profile
  - Includes caching and fallback mechanisms
  - Proper server-side API key usage

- [x] **Interview Configuration** (`lib/ai/interview-config.ts`) ✅
  - System prompt builder for Live API
  - Interview session configuration
  - Background and profile integration

### 1.5 Supporting Utilities
- [x] **Types Definition** (`lib/types.ts`) ✅
  - Interview question interfaces
  - Video recording options
  - Streaming log types

- [x] **Audio Utils** (`lib/ai/utils.ts`) ✅
  - Audio context management
  - Base64 conversion utilities
  - Browser compatibility helpers

**PHASE 1 STATUS: ✅ COMPLETED**
- All core infrastructure implemented
- WebSocket client ready for Live API
- Video recording system with compression
- Database schema updated with verdict fields
- Question generation system operational
- Ready for Phase 2 component development

---

## Phase 2: Live Interview Components (Week 2-3) ✅ COMPLETED

### 2.1 Context Providers ✅ COMPLETED
- [x] **Live Interview Context** (`components/job-readiness/contexts/LiveInterviewContext.tsx`) ✅
  ```typescript
  export interface LiveInterviewContextType {
    client: InterviewLiveClient | null;
    connected: boolean;
    connecting: boolean;
    recording: boolean;
    timeRemaining: number;
    interviewStarted: boolean;
    videoRecorder: WebMVideoRecorder | null;
    videoBlob: Blob | null;
    generatedQuestions: InterviewQuestion[];
    connect: () => Promise<void>;
    disconnect: () => void;
    startInterview: (questions: InterviewQuestion[]) => Promise<void>;
    submitInterview: () => Promise<void>;
    error: string | null;
  }
  ```
  - **Fixed Issues**: Import corrected to `InterviewLiveClient`, proper `Modality.AUDIO` usage, blob extraction from `WebMRecordingResult`
  - **Features Implemented**: WebSocket connection management, 5-minute timer, auto-submission, video recording lifecycle

- [x] **Interview Session Provider** (`components/job-readiness/providers/InterviewSessionProvider.tsx`) ✅
  - **Features Implemented**: Session state management, background data fetching, question generation, student profile integration
  - **States**: preparing, ready, active, completed, error
  - **Integration**: Background API and question generation system

### 2.2 Core Interview Components ✅ COMPLETED
- [x] **Live Interview Interface** (`components/job-readiness/interviews/LiveInterviewInterface.tsx`) ✅
  - **Fixed Issues**: Proper TypeScript refs with null initialization
  - **Features Implemented**: Full-screen video interface, timer countdown, connection status, auto-hiding controls
  - **UI States**: Loading, error, pre-interview setup, active interview with modern gradient backgrounds

- [x] **Interview Setup Component** (`components/job-readiness/interviews/InterviewSetup.tsx`) ✅
  - **Fixed Issues**: TypeScript refs, browser compatibility checks (removed deprecated `webkitRTCPeerConnection`)
  - **Features Implemented**: 4-step setup process, device permissions, real-time audio monitoring, speaker testing
  - **Compatibility**: WebRTC, getUserMedia, WebSocket validation

### 2.3 Hooks and Utilities ✅ COMPLETED
- [x] **useLiveInterview Hook** (`hooks/useLiveInterview.ts`) ✅
  ```typescript
  export function useLiveInterview(backgroundId: string): UseLiveInterviewResult {
    // Unified interface combining session and live interview contexts
    // Computed values: timeFormatted, progressPercentage, canStart, isReady
    // Unified error handling and action orchestration
  }
  ```

- [x] **useVideoRecording Hook** (`hooks/useVideoRecording.ts`) ✅
  - **Fixed Issues**: Interface alignment with `WebMVideoRecorder` class, proper event handlers, method signatures
  - **Features Implemented**: File size monitoring, compression handling, duration tracking, error management
  - **Integration**: WebM recording with automatic cleanup and size limits

**PHASE 2 STATUS: ✅ COMPLETED**
- All React components implemented with modern patterns
- TypeScript issues resolved and interfaces properly aligned
- Error handling and state management fully implemented
- Integration between contexts, providers, and hooks working
- Ready for Phase 3 AI Integration testing

---

## Phase 3: AI Integration & Question Generation (Week 3-4) ✅ COMPLETED

### 3.1 Question Generation System (Gemini 2.0 Flash) ✅ COMPLETED
- [x] **Background-Specific Question Generator** (`lib/ai/question-generator.ts`) ✅
  ```typescript
  export async function generateInterviewQuestions(
    backgroundId: string,
    userProfile: any
  ): Promise<InterviewQuestion[]> {
    // Uses Gemini 2.0 Flash with structured outputs
    // Generates 8-12 contextual questions based on background and user profile
    // Includes caching and fallback mechanisms
    // Proper server-side API key usage
  }
  ```

- [x] **System Prompt Builder** (`lib/ai/system-prompts.ts`) ✅
  ```typescript
  export function buildInterviewSystemPrompt(
    questions: InterviewQuestion[],
    background: Background,
    studentProfile: any
  ): string {
    // Comprehensive system prompt for Gemini Live
    // Interview flow, question timing, and scoring criteria
    // Conversational guidelines for natural interview flow
  }
  ```

### 3.2 Live API Configuration (Gemini 2.5 Flash Live) ✅ COMPLETED
- [x] **Interview Session Config** (`lib/ai/interview-config.ts`) ✅
  ```typescript
  export function createInterviewConfig(
    systemPrompt: string
  ): LiveConnectConfig {
    return {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Aoede" }
        }
      },
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };
  }
  ```

### 3.3 Session Management (No Transcript Recording) ✅ COMPLETED
- [x] **Session Management via Existing Architecture** ✅
  - **LiveInterviewContext**: Timer management, auto-submission, recording lifecycle
  - **InterviewSessionProvider**: Session states, background integration, question management
  - **useLiveInterview Hook**: Unified orchestration and progress tracking
  - **Architecture Decision**: No separate session manager needed since we're not tracking conversation transcripts
  - **Simplified Approach**: Existing context providers handle all required session coordination

**PHASE 3 STATUS: ✅ COMPLETED**
- Question generation system implemented with Gemini 2.0 Flash
- Live API configuration properly integrated
- Session management handled through existing context architecture
- Ready for Phase 4: Analysis & Verdict System

---

## Phase 4: Analysis & Verdict System (Week 4-5)

### 4.1 Structured Analysis Implementation
- [ ] **Analysis Schema Definition** (`lib/schemas/interview-analysis.ts`)
  ```typescript
  export const InterviewAnalysisSchema = {
    type: "object",
    properties: {
      scores: {
        type: "object",
        properties: {
          communication_clarity: { type: "number", minimum: 0, maximum: 25 },
          technical_competence: { type: "number", minimum: 0, maximum: 25 },
          problem_solving: { type: "number", minimum: 0, maximum: 25 },
          cultural_fit: { type: "number", minimum: 0, maximum: 25 },
          professional_demeanor: { type: "number", minimum: 0, maximum: 25 }
        },
        required: ["communication_clarity", "technical_competence", "problem_solving", "cultural_fit", "professional_demeanor"]
      },
      total_score: { type: "number", minimum: 0, maximum: 125 },
      verdict: { type: "string", enum: ["approved", "rejected"] },
      verdict_reason: { type: "string" },
      detailed_feedback: {
        type: "object",
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          areas_for_improvement: { type: "array", items: { type: "string" } },
          specific_recommendations: { type: "array", items: { type: "string" } }
        }
      },
      question_analysis: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            response_quality: { type: "number", minimum: 0, maximum: 5 },
            feedback: { type: "string" }
          }
        }
      },
      confidence_score: { type: "number", minimum: 0, maximum: 1 }
    },
    required: ["scores", "total_score", "verdict", "verdict_reason", "detailed_feedback"]
  };
  ```

- [ ] **Files API Video Analysis Engine** (`lib/ai/files-video-analyzer.ts`)
  ```typescript
  export async function analyzeInterviewVideoWithFilesAPI(
    videoBlob: Blob,
    questions: InterviewQuestion[],
    background: Background
  ): Promise<InterviewAnalysis> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Step 1: Upload video to Gemini Files API (temporary)
    const fileManager = genAI.fileManager;
    const videoFile = new File([videoBlob], `interview-${Date.now()}.webm`, {
      type: 'video/webm'
    });
    
    const uploadResponse = await fileManager.uploadFile(videoFile, {
      mimeType: 'video/webm',
      displayName: `Interview Analysis ${Date.now()}`
    });
    
    try {
      // Step 2: Analyze video with Gemini 2.0 Flash
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          responseSchema: InterviewAnalysisSchema,
          responseMimeType: "application/json"
        }
      });
      
      const analysisPrompt = buildVideoAnalysisPrompt(questions, background);
      
      const result = await model.generateContent([
        { fileData: { fileUri: uploadResponse.file.uri, mimeType: "video/webm" } },
        { text: analysisPrompt }
      ]);
      
      const analysis = JSON.parse(result.response.text());
      
      // Step 3: Delete video from Files API (cleanup)
      await fileManager.deleteFile(uploadResponse.file.name);
      
      return analysis;
    } catch (error) {
      // Cleanup on error
      await fileManager.deleteFile(uploadResponse.file.name);
      throw error;
    }
  }
  ```

### 4.2 Verdict Determination Logic
- [ ] **Verdict Calculator** (`lib/ai/verdict-calculator.ts`)
  ```typescript
  export function calculateVerdict(scores: ScoreBreakdown): {
    aiVerdict: 'approved' | 'rejected';
    reason: string;
    confidenceLevel: number;
  } {
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const threshold = 70; // 70/125 points required
    
    return {
      aiVerdict: totalScore >= threshold ? 'approved' : 'rejected',
      reason: generateVerdictReason(scores, totalScore, threshold),
      confidenceLevel: calculateConfidence(scores)
    };
  }
  ```

### 4.3 Submission Processing
- [ ] **Interview Submission Handler** (`app/api/app/job-readiness/interviews/submit/route.ts`)
  ```typescript
  export async function POST(request: Request) {
    try {
      const formData = await request.formData();
      const videoFile = formData.get('video') as File;
      const questionsUsed = JSON.parse(formData.get('questions') as string);
      const backgroundId = formData.get('backgroundId') as string;
      
      // Step 1: Upload video to Supabase Storage (permanent)
      const supabaseVideoUrl = await uploadVideoToSupabase(videoFile);
      
      // Step 2: Analyze video with Files API (temporary upload)
      const analysis = await analyzeInterviewVideoWithFilesAPI(
        videoFile,
        questionsUsed,
        background
      );
      // Note: Video automatically deleted from Files API after analysis
      
      // Step 3: Calculate verdict
      const verdict = calculateVerdict(analysis.scores);
      
      // Step 4: Store results in database
      const submission = await createInterviewSubmission({
        video_url: supabaseVideoUrl, // Only Supabase URL stored
        questions_used: questionsUsed,
        ai_verdict: verdict.aiVerdict,
        verdict_reason: verdict.reason,
        confidence_score: verdict.confidenceLevel,
        total_score: analysis.total_score,
        detailed_analysis: analysis,
        final_verdict: verdict.aiVerdict // Initially same as AI verdict
      });
      
      return Response.json({ success: true, submissionId: submission.id });
    } catch (error) {
      return Response.json({ error: 'Submission failed' }, { status: 500 });
    }
  }
  ```

---

## Phase 5: Admin Override System (Week 5-6)

### 5.1 Enhanced Admin Interface
- [ ] **Verdict Management Panel** (`components/job-readiness/admin/VerdictManagement.tsx`)
  ```typescript
  export function VerdictManagement({ submission }: { submission: InterviewSubmission }) {
    return (
      <div className="verdict-panel">
        <div className="ai-verdict">
          <h3>AI Verdict: {submission.ai_verdict}</h3>
          <p>Score: {submission.total_score}/125</p>
          <p>Reason: {submission.verdict_reason}</p>
          <p>Confidence: {submission.confidence_score}</p>
        </div>
        
        <div className="admin-override">
          <h3>Admin Override</h3>
          <VerdictOverrideForm 
            submissionId={submission.id}
            currentVerdict={submission.final_verdict}
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Verdict Override Form** (`components/job-readiness/admin/VerdictOverrideForm.tsx`)
  - Radio buttons for Approved/Rejected
  - Reason textarea for override justification
  - Confirmation dialog for verdict changes
  - Audit trail logging

### 5.2 Enhanced Video Review Interface
- [ ] **Video Analysis Player** (`components/job-readiness/admin/VideoAnalysisPlayer.tsx`)
  - WebM video player with custom controls
  - Display questions used during interview
  - Score annotation overlay
  - Verdict comparison (AI vs Admin)
  - Video served from Supabase Storage

### 5.3 Admin APIs
- [ ] **Verdict Override Endpoint** (`app/api/admin/job-readiness/interviews/[submissionId]/override-verdict/route.ts`)
  ```typescript
  export async function POST(request: Request, { params }: { params: { submissionId: string } }) {
    // Validate admin permissions
    // Update admin_verdict_override
    // Recalculate final_verdict
    // Log override in audit trail
    // Send notification to student
  }
  ```

---

## Phase 6: Frontend Integration (Week 6-7)

### 6.1 Student Interview Flow
- [ ] **Interview Start Page** (`app/(app)/app/job-readiness/interviews/start/[backgroundId]/page.tsx`)
  - Background information display
  - System requirements check
  - Camera/microphone setup
  - Start interview button

- [ ] **Live Interview Page** (`app/(app)/app/job-readiness/interviews/live/[sessionId]/page.tsx`)
  - Full-screen interview interface
  - Real-time video and audio
  - Timer and controls
  - Clean UI without transcript display

- [ ] **Interview Completion Page** (`app/(app)/app/job-readiness/interviews/complete/[submissionId]/page.tsx`)
  - Submission confirmation
  - Processing status
  - Expected results timeline
  - Next steps guidance

### 6.2 Results and Feedback
- [ ] **Interview Results Page** (`app/(app)/app/job-readiness/interviews/results/[submissionId]/page.tsx`)
  - **Final verdict display (Approved/Rejected)**
  - Detailed score breakdown
  - Specific feedback and recommendations
  - Video playback for self-review
  - Appeal process information

### 6.3 Navigation Integration
- [ ] **Update Interview Navigation** (`components/job-readiness/interviews/InterviewNavigation.tsx`)
  - Add "Live Interview" option
  - Show available backgrounds
  - Display completion status
  - Link to results

---

## Phase 7: Testing & Quality Assurance (Week 7-8)

### 7.1 WebSocket Connection Testing
- [ ] **Connection Reliability Tests**
  - Network interruption handling
  - Reconnection logic
  - Audio/video stream recovery
  - Data integrity verification

- [ ] **Audio Quality Testing**
  - Microphone input validation
  - Background noise handling
  - Audio latency measurement
  - Cross-browser compatibility

### 7.2 Video Recording Testing
- [ ] **WebM Format Validation**
  - File size limit enforcement (<20MB)
  - Compression quality testing
  - Browser compatibility testing
  - Upload success rate monitoring

- [ ] **Storage Integration Testing**
  - Supabase upload reliability
  - File access permissions
  - CDN delivery performance
  - Backup strategy validation

### 7.3 AI Analysis Testing
- [ ] **Video Analysis Testing**
  - Direct video analysis accuracy
  - Score consistency validation
  - Edge case handling (very high/low scores)
  - Structured output format verification
  - Confidence score calibration

- [ ] **Performance Testing**
  - Analysis response time
  - Concurrent interview handling
  - Resource usage monitoring
  - Error rate tracking

---

## Phase 8: Security & Compliance (Week 8)

### 8.1 Data Protection
- [ ] **Video Privacy Controls**
  - Encryption at rest and in transit
  - Access logging and monitoring
  - Retention policy implementation
  - GDPR compliance measures

- [ ] **API Security**
  - Rate limiting for Gemini API calls
  - Authentication token management
  - Input validation and sanitization
  - Error handling without data leaks

### 8.2 Content Moderation
- [ ] **Inappropriate Content Detection**
  - Real-time content filtering
  - Automatic flagging system
  - Admin notification triggers
  - Intervention protocols

---

## Implementation Timeline: 8 Weeks

| Week | Phase | Key Deliverables | Status |
|------|-------|-----------------|---------|
| 1-2 | Foundation | WebSocket client, video recording, database updates | ✅ **COMPLETED** |
| 2-3 | Components | Live interview interface, session management | ✅ **COMPLETED** |
| 3-4 | AI Integration | Question generation, system prompts, session management | ✅ **COMPLETED** |
| 4-5 | Analysis & Verdict | Video analysis, verdict calculation, submission processing | ⏳ **PENDING** |
| 5-6 | Admin Override | Enhanced admin interface, verdict management | ⏳ **PENDING** |
| 6-7 | Frontend Integration | Complete student flow, results pages | ⏳ **PENDING** |
| 7-8 | Testing & Security | Quality assurance, security implementation | ⏳ **PENDING** |

## Current Progress Summary

### ✅ COMPLETED (Phases 1-2)
- **Foundation & WebSocket Integration**: Complete infrastructure setup
- **Core Dependencies**: All necessary packages installed and configured
- **Database Schema**: Verdict fields added to interview submissions table
- **WebSocket Client**: Gemini Live API integration ready
- **Video Recording**: WebM recording with compression and size limits
- **Audio System**: PCM16 streaming for real-time conversation
- **Question Generation**: Structured output system for background-specific questions
- **Configuration System**: Interview prompts and session management
- **React Components**: All live interview interface components implemented
- **Context Providers**: Session and interview state management working
- **Hooks & Utilities**: Video recording and interview orchestration hooks completed
- **TypeScript Integration**: All linting errors resolved, proper type safety

### 🔄 PARTIALLY COMPLETED (Phase 3)
- **Question Generation System**: ✅ Background-specific questions with Gemini 2.0 Flash
- **Live API Configuration**: ✅ Proper integration with native audio dialog model
- **Session Management**: ✅ Session management handled through existing context architecture

### 🎯 IMPLEMENTATION FOCUS
Currently ready to begin **Phase 4: Analysis & Verdict System** development.

## Key Technical Achievements

### Component Architecture Completed
- **Dual Context Pattern**: `LiveInterviewContext` + `InterviewSessionProvider` working seamlessly
- **Modern React Patterns**: Proper TypeScript integration, custom hooks, error boundaries
- **State Management**: Interview lifecycle states properly tracked and managed
- **Video Integration**: WebM recording with real-time monitoring and compression

### Fixed Technical Issues
- **Import Corrections**: `InterviewLiveClient` properly imported and used
- **Type Safety**: `WebMRecordingResult` blob extraction, proper `Modality.AUDIO` usage
- **Browser Compatibility**: WebRTC feature detection without deprecated APIs
- **Resource Management**: Proper cleanup of media streams, timers, and contexts

### Ready for Integration Testing
- All components implemented and error-free
- WebSocket connection and video recording systems operational
- Question generation integrated with interview flow
- Admin interface foundation ready for verdict system

## Key Technical Considerations

### Dual AI Model Architecture
- **Gemini 2.5 Flash Live**: Real-time conversation with native audio dialog
- **Gemini 2.0 Flash**: Question generation AND post-interview video analysis
- **Files API Integration**: Temporary upload for analysis, then cleanup
- **Structured Outputs**: Consistent scoring and verdict determination

### Video Storage Strategy
1. **Recording**: Client-side WebM recording during live interview
2. **Permanent Storage**: Upload to Supabase Storage for admin review
3. **Temporary Analysis**: Upload to Files API for AI analysis
4. **Cleanup**: Delete from Files API after analysis complete
5. **Admin Access**: Video served from Supabase Storage only

### Improved Data Flow
```
Interview → Generate Questions (Gemini 2.0) → Live Session (Gemini 2.5) → 
Record Video → Upload to Supabase → Temp Upload to Files API → 
Analyze (Gemini 2.0) → Delete from Files API → Store Results
```

This approach provides:
1. **Cost Efficiency**: Files API used only during analysis, then cleaned up
2. **Consistent Model**: Gemini 2.0 Flash for both questions and analysis
3. **Simple Storage**: Only Supabase URLs stored in database
4. **Clean Architecture**: Temporary vs permanent storage clearly separated

## Core Implementation Files

### 1. WebSocket Client Integration
```typescript
// lib/ai/gemini-live-client.ts
import { GenAILiveClient as BaseClient } from '@google/genai';

export class InterviewLiveClient extends BaseClient {
  private timerInterval: NodeJS.Timeout | null = null;
  private timeRemaining: number = 300; // 5 minutes
  
  startInterviewTimer() {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      this.emit('timer', this.timeRemaining);
      
      if (this.timeRemaining <= 0) {
        this.autoSubmitInterview();
      }
    }, 1000);
  }
  
  private autoSubmitInterview() {
    this.emit('auto-submit');
    this.disconnect();
  }
}
```

### 2. Video Recording with Size Limit
```typescript
// lib/ai/webm-video-recorder.ts
export class WebMVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private readonly maxSizeBytes = 20 * 1024 * 1024; // 20MB
  private currentSize = 0;
  
  async startRecording(stream: MediaStream): Promise<void> {
    const options: MediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 1000000, // 1Mbps initial
    };
    
    this.mediaRecorder = new MediaRecorder(stream, options);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.currentSize += event.data.size;
        
        // Check if approaching size limit
        if (this.currentSize > this.maxSizeBytes * 0.8) {
          this.adjustQuality();
        }
      }
    };
    
    this.mediaRecorder.start(1000); // 1 second chunks
  }
  
  private adjustQuality() {
    // Implement dynamic quality adjustment
    // Lower bitrate if approaching size limit
  }
}
```

### 3. Video Analysis & Verdict System
```typescript
// lib/ai/video-verdict-system.ts
export interface VerdictResult {
  ai_verdict: 'approved' | 'rejected';
  verdict_reason: string;
  confidence_score: number;
  total_score: number;
}

export async function analyzeVideoAndDetermineVerdict(
  videoUrl: string,
  questions: InterviewQuestion[],
  background: Background
): Promise<VerdictResult> {
  // Analyze video directly with Gemini multimodal
  const analysis = await analyzeInterviewVideo(videoUrl, questions, background);
  
  const totalScore = Object.values(analysis.scores).reduce((sum, score) => sum + score, 0);
  const threshold = 70;
  const approved = totalScore >= threshold;
  
  return {
    ai_verdict: approved ? 'approved' : 'rejected',
    verdict_reason: generateVerdictReason(analysis, totalScore, threshold),
    confidence_score: analysis.confidence_score,
    total_score: totalScore
  };
}
```

This updated plan removes all transcript recording functionality and focuses on:
1. **Clean interview experience** without transcript display
2. **Post-interview video analysis** using Gemini multimodal capabilities
3. **Question context storage** for analysis purposes
4. **Simplified data flow** without real-time transcript management 