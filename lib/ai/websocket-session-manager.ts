interface WebSocketSession {
  sessionId: string;
  userId: string;
  connectionTime: number;
  lastActivity: number;
  status: 'connecting' | 'active' | 'inactive' | 'abandoned' | 'completed';
  interviewData?: {
    submissionId?: string;
    questions: any[];
    startTime: number;
  };
}

class WebSocketSessionManager {
  private sessions = new Map<string, WebSocketSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private readonly MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Register a new WebSocket session
   */
  createSession(sessionId: string, userId: string): WebSocketSession {
    const session: WebSocketSession = {
      sessionId,
      userId,
      connectionTime: Date.now(),
      lastActivity: Date.now(),
      status: 'connecting'
    };

    this.sessions.set(sessionId, session);
    console.log(`📝 Created WebSocket session: ${sessionId} for user: ${userId}`);
    
    return session;
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Attempted to update non-existent session: ${sessionId}`);
      return false;
    }

    session.lastActivity = Date.now();
    session.status = 'active';
    console.log(`💓 Updated activity for session: ${sessionId}`);
    
    return true;
  }

  /**
   * Start interview for a session
   */
  startInterview(sessionId: string, questions: any[], submissionId?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.interviewData = {
      submissionId,
      questions,
      startTime: Date.now()
    };
    session.status = 'active';
    
    console.log(`🎬 Started interview for session: ${sessionId}`);
    return true;
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'completed';
    console.log(`✅ Completed session: ${sessionId}`);
    
    // Schedule for cleanup after a delay
    setTimeout(() => {
      this.removeSession(sessionId);
    }, 5 * 60 * 1000); // Keep completed sessions for 5 minutes
    
    return true;
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`🗑️ Removing session: ${sessionId} (status: ${session.status})`);
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): WebSocketSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): WebSocketSession[] {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());
    const now = Date.now();
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      inactive: sessions.filter(s => s.status === 'inactive').length,
      abandoned: sessions.filter(s => s.status === 'abandoned').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.connectionTime)) : null,
      averageSessionDuration: sessions.length > 0 
        ? sessions.reduce((avg, s) => avg + (now - s.connectionTime), 0) / sessions.length 
        : 0
    };
  }

  /**
   * Find and handle abandoned sessions
   */
  private cleanupAbandonedSessions(): number {
    const now = Date.now();
    let cleanedUp = 0;

    for (const [sessionId, session] of this.sessions) {
      const timeSinceActivity = now - session.lastActivity;
      const totalSessionTime = now - session.connectionTime;

      // Mark as abandoned if inactive too long
      if (timeSinceActivity > this.SESSION_TIMEOUT && session.status === 'active') {
        session.status = 'abandoned';
        console.log(`🚫 Marked session as abandoned: ${sessionId} (inactive for ${Math.round(timeSinceActivity / 1000)}s)`);
        
        // Handle abandoned interview data
        if (session.interviewData) {
          this.handleAbandonedInterview(session);
        }
      }

      // Remove very old sessions
      if (totalSessionTime > this.MAX_SESSION_DURATION || 
          (session.status === 'abandoned' && timeSinceActivity > this.SESSION_TIMEOUT * 2)) {
        
        console.log(`🗑️ Removing old/abandoned session: ${sessionId}`);
        this.sessions.delete(sessionId);
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      console.log(`🧹 Cleaned up ${cleanedUp} WebSocket sessions`);
    }

    return cleanedUp;
  }

  /**
   * Handle abandoned interview - save progress if possible
   */
  private async handleAbandonedInterview(session: WebSocketSession) {
    if (!session.interviewData) return;

    try {
      console.log(`💾 Saving abandoned interview data for session: ${session.sessionId}`);
      
      // Here you could save partial interview progress to database
      // For example, mark the submission as 'abandoned' but keep the data
      if (session.interviewData.submissionId) {
        // Update database with abandoned status
        // await updateInterviewSubmission(session.interviewData.submissionId, {
        //   status: 'abandoned',
        //   abandoned_at: new Date(),
        //   session_duration: Date.now() - session.interviewData.startTime
        // });
      }
      
    } catch (error) {
      console.error(`❌ Failed to save abandoned interview for session ${session.sessionId}:`, error);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupAbandonedSessions();
    }, this.CLEANUP_INTERVAL);

    console.log(`🧹 Started WebSocket session cleanup timer (${this.CLEANUP_INTERVAL}ms interval)`);
  }

  /**
   * Stop cleanup timer
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clean up all sessions
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    
    console.log(`🛑 WebSocket session manager destroyed, cleaned up ${sessionCount} sessions`);
  }

  /**
   * Force cleanup of all sessions for a user (e.g., when user logs out)
   */
  cleanupUserSessions(userId: string): number {
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
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

// Global singleton instance
export const webSocketSessionManager = new WebSocketSessionManager();

// Export types
export type { WebSocketSession }; 