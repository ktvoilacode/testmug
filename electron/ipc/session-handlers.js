/**
 * Session IPC Handlers
 * Handles session management operations (get, replay, update, delete)
 */

/**
 * Register all session-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main instance
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.sessionStorage - Session storage instance
 * @param {Object} dependencies.playwrightController - Playwright controller instance
 */
function registerSessionHandlers(ipcMain, dependencies) {
  const { sessionStorage, playwrightController } = dependencies;

  /**
   * Get all saved sessions
   */
  ipcMain.handle('get-sessions', async () => {
    console.log('[IPC] get-sessions');

    if (!sessionStorage) {
      return { success: false, message: 'Session storage not initialized' };
    }

    try {
      const sessions = sessionStorage.getAllSessions();
      return {
        success: true,
        sessions
      };
    } catch (error) {
      console.error('[IPC] Error getting sessions:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  /**
   * Replay a full session
   */
  ipcMain.handle('replay-session', async (event, sessionId, speed = 'normal') => {
    console.log('[IPC] replay-session:', sessionId, 'speed:', speed);

    if (!sessionStorage || !playwrightController) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      // Load session
      const session = sessionStorage.loadSession(sessionId);

      if (!session.actions || session.actions.length === 0) {
        return { success: false, message: 'No actions in session' };
      }

      // Connect to BrowserView if not already connected
      if (!playwrightController.isConnected()) {
        const connected = await playwrightController.connectToBrowserView(9222);
        if (!connected) {
          return { success: false, message: 'Failed to connect to BrowserView' };
        }
      }

      // Replay session (includes navigation to startUrl)
      const result = await playwrightController.replaySession(session, speed);

      return result;
    } catch (error) {
      console.error('[IPC] Error replaying session:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  /**
   * Replay a specific flow within a session
   */
  ipcMain.handle('replay-flow', async (event, sessionId, flowId) => {
    console.log('[IPC] replay-flow:', sessionId, 'flowId:', flowId);

    if (!sessionStorage || !playwrightController) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      // Load session and flow analysis
      const session = sessionStorage.loadSession(sessionId);
      const flowAnalysis = sessionStorage.loadFlowAnalysis(sessionId);

      if (!flowAnalysis || !flowAnalysis.flows) {
        return { success: false, message: 'No flow analysis found' };
      }

      // Find the specific flow
      const flow = flowAnalysis.flows.find(f => f.flowId === flowId);
      if (!flow) {
        return { success: false, message: `Flow ${flowId} not found` };
      }

      // Extract actions for this flow
      const flowActions = flow.actionIndices.map(idx => session.actions[idx - 1]).filter(Boolean);

      if (flowActions.length === 0) {
        return { success: false, message: 'No actions in flow' };
      }

      // Create a temporary session with only flow actions
      const flowSession = {
        ...session,
        actions: flowActions
      };

      // Connect to BrowserView if not already connected
      if (!playwrightController.isConnected()) {
        const connected = await playwrightController.connectToBrowserView(9222);
        if (!connected) {
          return { success: false, message: 'Failed to connect to BrowserView' };
        }
      }

      // Replay the flow
      console.log(`[IPC] Replaying ${flow.name} (${flowActions.length} actions)`);
      const result = await playwrightController.replaySession(flowSession, 'normal');

      return {
        ...result,
        flowName: flow.name,
        flowType: flow.type
      };
    } catch (error) {
      console.error('[IPC] Error replaying flow:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  /**
   * Update session custom name
   */
  ipcMain.handle('update-session-name', async (event, sessionId, customName) => {
    console.log('[IPC] update-session-name:', sessionId, '→', customName);

    if (!sessionStorage) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      sessionStorage.updateSessionName(sessionId, customName);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error updating session name:', error);
      return { success: false, message: error.message };
    }
  });

  /**
   * Delete a session
   */
  ipcMain.handle('delete-session', async (event, sessionId) => {
    console.log('[IPC] delete-session:', sessionId);

    if (!sessionStorage) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      sessionStorage.deleteSession(sessionId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error deleting session:', error);
      return { success: false, message: error.message };
    }
  });

  console.log('[IPC] Session handlers registered');
}

module.exports = { registerSessionHandlers };
