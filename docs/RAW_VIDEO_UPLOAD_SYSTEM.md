# Raw Video Upload System

## 🎥 Overview

The interview video recording system has been updated to record and upload **raw, uncompressed video files** with **no file size limits**. This enables higher quality AI analysis and better admin review capabilities.

## 🔥 Key Changes Made

### 1. **Removed All File Size Limits**

**Before:**
```typescript
// ❌ Had 20MB limit with compression
private readonly maxSizeBytes = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE_BYTES = 1000 * 1024 * 1024; // 1GB server limit
```

**After:**
```typescript
// ✅ No file size limits - upload raw files
// Removed all size restrictions for unlimited uploads
```

### 2. **Removed Video Compression Logic**

**Before:**
```typescript
// ❌ Compressed videos when approaching size limit
if (finalBlob.size > this.maxSizeBytes) {
  finalBlob = await this.compressIfNeeded(finalBlob);
}
```

**After:**
```typescript
// ✅ Always use raw blob without compression
const finalBlob = new Blob(this.chunks, { type: 'video/webm' });
console.log(`✅ Raw recording completed: ${finalBlob.size} bytes`);
```

### 3. **Increased Recording Quality**

**Before:**
```typescript
// ❌ Low quality to stay under size limits
videoBitsPerSecond: 1000000, // 1Mbps
audioBitsPerSecond: 128000,  // 128kbps
```

**After:**
```typescript
// ✅ High quality for better AI analysis
videoBitsPerSecond: 5000000, // 5Mbps for high quality
audioBitsPerSecond: 256000,  // 256kbps for high quality audio
```

### 4. **Updated File Type Support**

**Before:**
```typescript
// ❌ Only MP4 support
const ALLOWED_FILE_TYPES = ['video/mp4'];
```

**After:**
```typescript
// ✅ Support both WebM and MP4
const ALLOWED_FILE_TYPES = ['video/webm', 'video/mp4'];
```

## 📁 Files Modified

### Core Recording System
- **`lib/ai/webm-video-recorder.ts`** - Removed compression logic and size limits
- **`hooks/useVideoRecording.ts`** - Removed size monitoring and compression hooks
- **`lib/schemas/storage.ts`** - Removed file size validation limits

### Key Removals
```typescript
// 🗑️ REMOVED: All these functions and checks
private readonly maxSizeBytes = 20 * 1024 * 1024;
private async compressIfNeeded(blob: Blob): Promise<Blob>
private adjustQuality(): void
onSizeWarning?: (currentSize: number, maxSize: number) => void
isFileSizeNearLimit: boolean
isFileSizeOverLimit: boolean
compressionLevel: number
```

## 🎯 Upload Flow

### Raw Video Recording
```
User Interview → Raw WebM Recording → No Compression → Full Quality Upload
                     ↓
               5Mbps Video + 256kbps Audio
                     ↓
              Unlimited File Size
                     ↓
         Upload to Files API + Supabase Storage
```

### Dual Storage Strategy
1. **Files API** - For AI video analysis (Gemini multimodal)
2. **Supabase Storage** - For admin review and backup

## 🔧 Technical Specifications

### Recording Quality
- **Video Codec**: VP9 (fallback to VP8)
- **Audio Codec**: Opus
- **Video Bitrate**: 5 Mbps (5x increase from 1 Mbps)
- **Audio Bitrate**: 256 kbps (2x increase from 128 kbps)
- **Container**: WebM
- **Compression**: None (raw recording)

### File Size Expectations
| Duration | Estimated Size |
|----------|---------------|
| 5 minutes | ~180-200 MB |
| 10 minutes | ~350-400 MB |
| 15 minutes | ~520-600 MB |
| 30 minutes | ~1.0-1.2 GB |

## 🚀 Benefits

### 1. **Higher Quality AI Analysis**
- Raw video provides better detail for AI assessment
- No compression artifacts that could affect analysis
- Higher resolution maintained throughout

### 2. **Better Admin Review**
- Full quality video for human reviewers
- No quality degradation from compression
- Clear audio for speech assessment

### 3. **Future-Proof Storage**
- Raw files can be reprocessed with better AI models
- No loss of original data
- Flexible for different analysis requirements

### 4. **Simplified Pipeline**
- No complex compression logic to maintain
- Faster processing (no compression step)
- More predictable file handling

## 📤 Upload Process

### Client-Side Flow
```typescript
// 1. Record raw video
const recorder = new WebMVideoRecorder({
  videoBitsPerSecond: 5000000, // High quality
  audioBitsPerSecond: 256000,  // High quality audio
});

// 2. Get raw blob (no compression)
const rawBlob = await recorder.stopRecording();

// 3. Upload to both destinations
await uploadToFilesAPI(rawBlob);        // For AI analysis
await uploadToSupabaseStorage(rawBlob); // For admin access
```

### Server-Side Handling
```typescript
// No size validation on server (unlimited uploads)
export const UploadFileSchema = z.instanceof(File)
  .refine((file) => file.size > 0, {
    message: 'File cannot be empty.',
  })
  .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
    message: 'Invalid file type. Only video/webm, video/mp4 allowed.',
  });
  // 🔥 NO FILE SIZE LIMITS
```

## ⚠️ Considerations

### Storage Costs
- Files will be significantly larger (5-10x increase)
- Plan for increased storage costs in Supabase
- Consider lifecycle policies for old files

### Upload Time
- Longer upload times for larger files
- Implement progress indicators for user feedback
- Consider chunked uploads for very large files

### Bandwidth
- Higher bandwidth requirements for uploads
- May need timeout adjustments for slower connections

## 🧪 Testing

### Verification Steps
1. **Start Interview** - Begin recording
2. **Record for 5+ Minutes** - Let it record longer content
3. **Check File Size** - Should be 150-200MB+ for 5 minutes
4. **Verify Quality** - Video should be crisp and clear
5. **Upload Success** - Both Files API and Supabase should receive raw file
6. **No Compression** - Verify no compression artifacts

### Quality Checks
```bash
# Check video properties
ffprobe -v quiet -print_format json -show_format -show_streams video.webm

# Expected output:
# - Video bitrate: ~5000 kbps
# - Audio bitrate: ~256 kbps
# - No compression artifacts
# - Full resolution maintained
```

## 🔄 Migration Notes

### Backward Compatibility
- Existing compressed videos will continue to work
- New recordings will be raw/uncompressed
- Schema supports both WebM and MP4 formats
- No breaking changes to existing APIs

### Gradual Rollout
1. Deploy compression removal
2. Monitor storage usage
3. Adjust storage policies as needed
4. Update documentation and user guidance

## 📊 Monitoring

### Key Metrics to Watch
- **Average file size** - Should increase 5-10x
- **Upload success rate** - Monitor for timeout issues
- **Storage usage** - Track Supabase storage growth
- **Upload duration** - Monitor for performance issues

### Alerts to Set Up
- File uploads taking >10 minutes
- Storage quota approaching limits
- Upload failure rate >5%
- Unusually large files (>2GB for 30min recording) 