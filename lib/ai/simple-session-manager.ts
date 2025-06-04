/**
 * Simple WebSocket Session Manager
 * Handles automatic disconnection of inactive interview sessions
 */

interface SessionInfo {
  sessionId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  disconnectCallback?: () => void;
}

class SimpleSessionManager {
  private sessions = new Map<string, SessionInfo>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Configuration - simple and focused
  private readonly INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 2 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 30 seconds
  private readonly MAX_SESSION_DURATION = 10 * 60 * 1000; // 10 minutes max

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Register a new session
   */
  createSession(sessionId: string, userId: string, disconnectCallback?: () => void): void {
    const session: SessionInfo = {
      sessionId,
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      disconnectCallback
    };

    this.sessions.set(sessionId, session);
    console.log(`📝 Session created: ${sessionId} for user: ${userId}`);
  }

  /**
   * Update activity for a session
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Mark session as completed and remove it
   */
  completeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    console.log(`✅ Session completed: ${sessionId}`);
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Manually remove a session
   */
  removeSession(sessionId: string): boolean {
    const removed = this.sessions.delete(sessionId);
    if (removed) {
      console.log(`🗑️ Session removed: ${sessionId}`);
    }
    return removed;
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());
    const now = Date.now();
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.isActive).length,
      inactive: sessions.filter(s => !s.isActive).length,
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.startTime)) : null
    };
  }

  /**
   * Check for inactive sessions and disconnect them
   */
  private checkInactiveSessions(): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const timeSinceActivity = now - session.lastActivity;
      const totalSessionTime = now - session.startTime;

      // Check if session should be disconnected
      const shouldDisconnect = 
        timeSinceActivity > this.INACTIVITY_TIMEOUT || 
        totalSessionTime > this.MAX_SESSION_DURATION;

      if (shouldDisconnect && session.isActive) {
        console.log(`🔌 Disconnecting inactive session: ${sessionId} (inactive: ${Math.round(timeSinceActivity/1000)}s)`);
        
        // Mark as inactive first
        session.isActive = false;
        
        // Call disconnect callback if provided
        try {
          if (session.disconnectCallback) {
            session.disconnectCallback();
          }
        } catch (error) {
          console.error(`❌ Error calling disconnect callback for session ${sessionId}:`, error);
        }
        
        // Schedule for removal
        sessionsToRemove.push(sessionId);
      }
    }

    // Remove disconnected sessions
    sessionsToRemove.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (sessionsToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${sessionsToRemove.length} inactive sessions`);
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.checkInactiveSessions();
    }, this.CLEANUP_INTERVAL);

    console.log(`🧹 Started session cleanup timer (${this.CLEANUP_INTERVAL}ms interval)`);
  }

  /**
   * Stop cleanup and destroy all sessions
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    console.log(`🛑 Session manager destroyed, cleaned up ${sessionCount} sessions`);
  }

  /**
   * Force cleanup all sessions for a specific user
   */
  cleanupUserSessions(userId: string): number {
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        // Call disconnect callback before removing
        try {
          if (session.disconnectCallback) {
            session.disconnectCallback();
          }
        } catch (error) {
          console.error(`❌ Error calling disconnect callback for user session ${sessionId}:`, error);
        }
        
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} sessions for user: ${userId}`);
    }
    
    return cleaned;
  }
}

// Create singleton instance
export const sessionManager = new SimpleSessionManager();

// Export for cleanup on app shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    sessionManager.destroy();
  });
  
  process.on('SIGTERM', () => {
    sessionManager.destroy();
  });
} 