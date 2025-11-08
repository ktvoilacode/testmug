/**
 * Session Storage Module - Save and load recording sessions
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SessionStorage {
  constructor() {
    // Store sessions in user's home directory
    this.sessionsDir = path.join(os.homedir(), '.testmug', 'sessions');
    this.ensureDirectoryExists();
  }

  /**
   * Ensure sessions directory exists
   */
  ensureDirectoryExists() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
      console.log('[SessionStorage] Created sessions directory:', this.sessionsDir);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Save a recording session
   * @param {Array} actions - Array of recorded actions
   * @param {Object} metadata - Additional metadata (url, duration, etc.)
   * @returns {Object} Session data with ID and file paths
   */
  saveSession(actions, metadata = {}) {
    const sessionId = this.generateSessionId();
    const startTime = actions.length > 0 ? actions[0].timestamp : Date.now();
    const endTime = actions.length > 0 ? actions[actions.length - 1].timestamp : Date.now();
    const duration = endTime - startTime;

    const session = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      startTime,
      endTime,
      duration,
      actionCount: actions.length,
      startUrl: metadata.startUrl || (actions.find(a => a.type === 'navigate')?.url || ''),
      assertions: metadata.assertions || [], // Include user-added assertions
      actions,
      metadata
    };

    // Save session JSON
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

    console.log('[SessionStorage] Saved session:', sessionId);
    console.log('[SessionStorage] File:', sessionFile);
    console.log('[SessionStorage] Actions:', actions.length);

    return {
      sessionId,
      sessionFile,
      session
    };
  }

  /**
   * Load a session by ID
   */
  loadSession(sessionId) {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionData = fs.readFileSync(sessionFile, 'utf8');
    return JSON.parse(sessionData);
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    const files = fs.readdirSync(this.sessionsDir);
    const sessions = [];

    files.forEach(file => {
      if (file.endsWith('.json') && !file.endsWith('_analysis.json')) {
        try {
          const sessionData = fs.readFileSync(path.join(this.sessionsDir, file), 'utf8');
          const session = JSON.parse(sessionData);

          // Load flow analysis if available
          const analysis = this.loadFlowAnalysis(session.id);

          sessions.push({
            id: session.id,
            createdAt: session.createdAt,
            actionCount: session.actionCount,
            duration: session.duration,
            startUrl: session.startUrl,
            customName: session.customName || null,
            flowAnalysis: analysis, // Include flow analysis
            testCaseMetadata: session.testCaseMetadata || null // Include test case metadata
          });
        } catch (error) {
          console.error('[SessionStorage] Error loading session:', file, error);
        }
      }
    });

    // Sort by creation date (newest first)
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sessions;
  }

  /**
   * Update session name
   */
  updateSessionName(sessionId, customName) {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    sessionData.customName = customName;

    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    console.log('[SessionStorage] Updated session name:', sessionId, '→', customName);

    return true;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId) {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    const specFile = path.join(this.sessionsDir, `${sessionId}.spec.js`);
    const analysisFile = path.join(this.sessionsDir, `${sessionId}_analysis.json`);

    // Delete all related files
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }

    if (fs.existsSync(specFile)) {
      fs.unlinkSync(specFile);
    }

    if (fs.existsSync(analysisFile)) {
      fs.unlinkSync(analysisFile);
    }

    // Delete flow-specific spec files
    const files = fs.readdirSync(this.sessionsDir);
    files.forEach(file => {
      if (file.startsWith(sessionId) && file.endsWith('.spec.js')) {
        fs.unlinkSync(path.join(this.sessionsDir, file));
      }
    });

    console.log('[SessionStorage] Deleted session and all related files:', sessionId);
  }

  /**
   * Get session file path
   */
  getSessionFile(sessionId) {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  /**
   * Get spec file path
   */
  getSpecFile(sessionId) {
    return path.join(this.sessionsDir, `${sessionId}.spec.js`);
  }

  /**
   * Save flow analysis for a session
   */
  saveFlowAnalysis(sessionId, analysis) {
    const analysisFile = path.join(this.sessionsDir, `${sessionId}_analysis.json`);
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log('[SessionStorage] Saved flow analysis:', analysisFile);
    return analysisFile;
  }

  /**
   * Load flow analysis for a session
   */
  loadFlowAnalysis(sessionId) {
    const analysisFile = path.join(this.sessionsDir, `${sessionId}_analysis.json`);

    if (!fs.existsSync(analysisFile)) {
      return null;
    }

    const analysisData = fs.readFileSync(analysisFile, 'utf8');
    return JSON.parse(analysisData);
  }

  /**
   * Save test case metadata to session
   */
  saveTestCaseMetadata(sessionId, metadata) {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    sessionData.testCaseMetadata = metadata;

    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    console.log('[SessionStorage] Saved test case metadata:', sessionId, metadata.testCaseCount, 'tests');
  }
}

module.exports = SessionStorage;
