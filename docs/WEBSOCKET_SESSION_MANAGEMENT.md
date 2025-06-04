# WebSocket Session Management for Abandoned Interviews

## Problem Solved
When users start an interview (open WebSocket connection) but don't complete it properly, the connection stays open indefinitely, causing resource leaks and performance issues.

## 🎯 **Solution Overview**

### Simple & Effective Approach
1. **Track active sessions** in memory (no database needed)
2. **Monitor user activity** through browser events
3. **Auto-disconnect** after 10 minutes of inactivity
4. **Clean up resources** automatically

## 🏗️ **Implementation**

### 1. Session Manager (`lib/ai/simple-session-manager.ts`)
- Lightweight in-memory session tracking
- Automatic cleanup every 30 seconds
- Configurable timeout periods
- Callback-based disconnection

### 2. Enhanced LiveInterviewContext
- Session registration on connection
- Activity tracking via user events
- Graceful cleanup on disconnect
- Page visibility handling

### 3. User Warning System
- 8-minute inactivity warning
- 2-minute countdown to disconnect
- Option to continue or end session

## ⚙️ **Configuration**

```typescript
INACTIVITY_TIMEOUT = 10 * 60 * 1000;      // 10 minutes
MAX_SESSION_DURATION = 30 * 60 * 1000;    // 30 minutes max
CLEANUP_INTERVAL = 30 * 1000;             // 30 seconds
```

## 🔄 **How It Works**

1. **User starts interview** → Session created with unique ID
2. **User activity detected** → Session activity timestamp updated
3. **No activity for 8 minutes** → Warning shown to user
4. **No activity for 10 minutes** → Auto-disconnect triggered
5. **Resources cleaned up** → WebSocket, media streams, timers

## ✅ **Benefits**

- **No resource leaks**: Abandoned connections automatically closed
- **Better performance**: Server resources freed up regularly
- **User-friendly**: Clear warnings before disconnection
- **Zero database overhead**: Pure in-memory solution
- **Automatic cleanup**: Handles edge cases (page close, browser crash)

## 📱 **Mobile & Browser Support**

- Touch events for mobile devices
- Page visibility API for tab switching
- beforeunload handling for page close
- Cross-browser compatibility

This solution ensures clean session management without complexity! 