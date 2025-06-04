# Testing Interview Components

## Overview
This guide covers testing the implemented AI interview components for Phase 3 of the implementation plan.

## Environment Setup

### Required API Keys
The AI interview system requires TWO API keys in your `.env` file:

```env
# Client-side API key (for Live WebSocket connection)
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here

# Server-side API key (for question generation) 
GEMINI_API_KEY=your_api_key_here
```

**Note:** You can use the same API key for both variables. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Why Two Keys?
- **NEXT_PUBLIC_GOOGLE_API_KEY**: Used client-side for the Gemini Live WebSocket connection
- **GEMINI_API_KEY**: Used server-side for generating interview questions with Gemini 2.0 Flash

## Test Page Access

Navigate to: `/app/job-readiness/interviews/test`

## Testing Flow

### 1. Initial Setup Check
- Verify API keys are configured
- Check session state and background loading
- Confirm question generation works

### 2. Interview Setup Testing
- Browser compatibility checks (WebRTC, getUserMedia, etc.)
- Camera and microphone permissions
- Audio monitoring and speaker test
- 4-step setup validation

### 3. Live Interview Testing
- WebSocket connection to Gemini Live API
- Video recording with size limits
- 5-minute timer countdown
- Auto-submission on timeout

## Expected Components

### ✅ Implemented (Phase 3 Complete)
- `LiveInterviewContext` - WebSocket and recording state management
- `InterviewSessionProvider` - Session lifecycle and question generation
- `InterviewSetup` - 4-step browser setup process
- `LiveInterviewInterface` - Full-screen interview UI
- `useVideoRecording` - Video recording hook with size limits
- `useLiveInterview` - Unified interview orchestration

### Real Database Integration
- Background ID: `717124a0-d3ee-450e-86d2-8ac2cfbf6ade` (Computer Science)
- Real student data and grading criteria
- Actual question generation based on background

## Common Issues

### API Key Problems
- **Question Generation Fails**: Check `GEMINI_API_KEY` is set (server-side)
- **WebSocket Connection Fails**: Check `NEXT_PUBLIC_GOOGLE_API_KEY` is set (client-side)
- **Invalid Key Format**: Ensure API key is valid from Google AI Studio

### Browser Issues
- **Camera/Mic Permission Denied**: Check browser permissions
- **WebRTC Not Supported**: Use modern browser (Chrome, Firefox, Safari)
- **Audio Context Issues**: Reload page if audio gets stuck

### Recording Issues
- **File Size Limit**: Video automatically compressed to <20MB
- **Format Issues**: Uses WebM format, ensure browser supports it
- **Upload Failures**: Check network connection and file size

## Next Steps

After successful testing of Phase 3, the system is ready for:
- **Phase 4**: Analysis & Verdict System implementation
- **Phase 5**: Admin Override System
- **Phase 6**: Frontend Integration

## Debug Mode

For detailed logging, open browser dev tools console to see:
- WebSocket connection events
- Video recording progress
- Question generation responses
- Error details and stack traces

## Testing Steps

### Step 1: API Testing

Run the API test script:
```bash
npx tsx scripts/test-interview-apis.ts
```

This will test:
- ✅ Environment variables
- ✅ Background API endpoints
- ✅ Question generation with Gemini AI

### Step 2: Component Integration Testing

Visit the test page:
```
http://localhost:3000/app/job-readiness/interviews/test
```

### Step 3: Interview Flow Testing

#### 3.1 Initial Setup
- Check that the test page loads properly
- Verify session state shows as "preparing" initially
- Confirm questions are loading/loaded
- Check background data is fetched

#### 3.2 Setup Flow Testing
1. Click "Start Interview Setup Test"
2. **Permissions Step:**
   - Grant camera and microphone permissions
   - Verify all system checks pass (green checkmarks)
3. **Devices Step:**
   - Test device enumeration (camera, microphone, speakers)
   - Switch between available devices if multiple
4. **Testing Step:**
   - Verify audio level monitoring works
   - Test video preview
   - Check speaker test functionality
5. **Ready Step:**
   - Confirm setup completion

#### 3.3 Live Interview Testing
1. After setup completion, interview interface should load
2. **Pre-Interview Screen:**
   - Verify background information display
   - Check question count display
   - Confirm timer shows 5:00
3. **Start Interview:**
   - Click "Start Interview"
   - WebSocket should attempt connection
   - Recording should begin
   - Timer should start countdown
4. **During Interview:**
   - Verify video recording indicator
   - Check audio/video controls work
   - Test mute/unmute functionality
   - Confirm timer counts down
5. **Interview Completion:**
   - Wait for auto-submission at 0:00 OR
   - Click manual submit button
   - Verify recording stops
   - Check submission process

## Expected Behavior

### ✅ Working Components
- **LiveInterviewContext**: WebSocket management, timer, recording
- **InterviewSessionProvider**: Session states, background data, questions
- **InterviewSetup**: 4-step device setup process
- **LiveInterviewInterface**: Full interview UI with controls
- **useVideoRecording**: WebM recording with compression
- **useLiveInterview**: Unified state management

### 🔧 What You Should See
1. **Session States**: preparing → ready → active → completed
2. **Timer**: 5:00 countdown with visual progress
3. **Video Recording**: Browser MediaRecorder API working
4. **WebSocket Connection**: Attempts to connect to Gemini Live API
5. **Question Generation**: Background-specific questions loaded
6. **Device Management**: Camera/microphone enumeration and testing

### ⚠️ Expected Limitations (Phase 3)
- **No actual AI conversation**: WebSocket may fail without proper API setup
- **No video analysis**: That's Phase 4 functionality
- **No submission processing**: Backend endpoints need Phase 4 implementation
- **Mock data**: Some data may be placeholder until full integration

## Troubleshooting

### Common Issues

#### 1. GEMINI_API_KEY Not Working
**Problem**: API calls fail with authentication errors
**Solution**: 
- Verify API key is correct
- Check the key has proper permissions
- Ensure no extra spaces in .env file

#### 2. Camera/Microphone Access Denied
**Problem**: Browser blocks media access
**Solution**:
- Use HTTPS or localhost (required for media access)
- Check browser permissions settings
- Try a different browser if needed

#### 3. WebSocket Connection Fails
**Problem**: Live client connection errors
**Solution**:
- Check GEMINI_API_KEY is valid
- Verify network connectivity
- Review browser console for detailed errors

#### 4. Video Recording Not Working
**Problem**: MediaRecorder API fails
**Solution**:
- Use modern browser (Chrome, Firefox, Safari)
- Check WebM format support
- Verify media stream is active

#### 5. Questions Not Loading
**Problem**: Question generation fails
**Solution**:
- Check GEMINI_API_KEY in server environment
- Verify background API returns valid data
- Check network requests in browser dev tools

## Test Checklist

- [ ] Environment variables configured
- [ ] API test script passes
- [ ] Test page loads without errors
- [ ] Session state progression works
- [ ] Background data loads correctly
- [ ] Questions generate successfully
- [ ] Camera permissions granted
- [ ] Microphone permissions granted
- [ ] Device enumeration works
- [ ] Audio level monitoring active
- [ ] Video preview displays
- [ ] Speaker test plays audio
- [ ] Interview interface loads
- [ ] Timer starts and counts down
- [ ] Video recording begins
- [ ] Audio/video controls respond
- [ ] Auto-submission at timer end
- [ ] Manual submission works
- [ ] Cleanup and reset function

## Next Steps After Testing

Once testing is successful:

1. **Phase 4 Implementation**: Video analysis and verdict system
2. **Production API Integration**: Remove test keys and implement secure API flow
3. **Enhanced Error Handling**: Based on testing findings
4. **Performance Optimization**: Video compression and streaming improvements
5. **User Experience Refinements**: Based on test feedback

## Testing Results Template

```
## Test Results - [Date]

### Environment
- [ ] GEMINI_API_KEY configured
- [ ] Development server running
- [ ] Browser: [Chrome/Firefox/Safari]

### API Tests
- [ ] Question generation: [PASS/FAIL]
- [ ] Background API: [PASS/FAIL]
- [ ] Environment check: [PASS/FAIL]

### Component Tests
- [ ] Session management: [PASS/FAIL]
- [ ] Interview setup: [PASS/FAIL]
- [ ] Live interface: [PASS/FAIL]
- [ ] Video recording: [PASS/FAIL]
- [ ] Timer functionality: [PASS/FAIL]

### Issues Found
- [List any issues encountered]

### Ready for Phase 4?
- [ ] YES - All critical components working
- [ ] NO - Issues need resolution first
```

Save your results and share with the development team for Phase 4 planning! 