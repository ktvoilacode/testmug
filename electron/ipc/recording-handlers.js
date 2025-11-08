/**
 * Recording IPC Handlers
 * Handles session recording operations (start, stop)
 */

const { generatePlaywrightCode, savePlaywrightCode, generateFlowScripts, saveFlowScripts } = require('../playwright-codegen');
const FormMetadataAnalyzer = require('../form-metadata-analyzer');

/**
 * Register all recording-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main instance
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.recorder - Recorder instance
 * @param {Object} dependencies.sessionStorage - Session storage instance
 * @param {Object} dependencies.assertionManager - Assertion manager instance
 * @param {Object} dependencies.flowAnalyzer - Flow analyzer instance
 * @param {Electron.BrowserView} dependencies.browserView - BrowserView instance
 * @param {Function} dependencies.setCurrentSessionId - Function to set current session ID
 */
function registerRecordingHandlers(ipcMain, dependencies) {
  const { recorder, sessionStorage, assertionManager, flowAnalyzer, browserView, setCurrentSessionId } = dependencies;

  /**
   * Start recording user actions
   */
  ipcMain.handle('start-recording', async (event) => {
    console.log('[IPC] start-recording');

    if (!recorder) {
      return { success: false, message: 'Recorder not initialized' };
    }

    return await recorder.startRecording();
  });

  /**
   * Stop recording and save session
   */
  ipcMain.handle('stop-recording', async () => {
    console.log('[IPC] stop-recording');

    if (!recorder) {
      return { success: false, message: 'Recorder not initialized' };
    }

    // Stop recording and get actions
    const result = await recorder.stopRecording();

    if (!result.success || result.actions.length === 0) {
      return result;
    }

    try {
      // Get start URL from recorder (captured when recording started)
      const startUrl = result.startUrl || browserView.webContents.getURL();

      // Get assertions from assertion manager
      const assertions = assertionManager ? assertionManager.getAssertions() : [];

      // Save session to disk (with assertions)
      const { sessionId, sessionFile, session } = sessionStorage.saveSession(result.actions, {
        startUrl: startUrl,
        assertions
      });

      setCurrentSessionId(sessionId);

      // Clear assertions for next recording
      if (assertionManager) {
        assertionManager.clearAssertions();
      }

      // Generate Playwright code
      const playwrightCode = generatePlaywrightCode(session);
      const specFile = sessionStorage.getSpecFile(sessionId);
      savePlaywrightCode(specFile, playwrightCode);

      // Analyze form metadata from actions
      const formMetadataAnalyzer = new FormMetadataAnalyzer();
      const formMetadata = formMetadataAnalyzer.analyzeFormMetadata(result.actions);
      sessionStorage.saveFormMetadata(sessionId, formMetadata);

      console.log('[Recording] Session saved:', sessionId);
      console.log('[Recording] Playwright script:', specFile);

      // Analyze flows with AI (for replay functionality) but DON'T generate test cases yet
      if (flowAnalyzer) {
        console.log('[Recording] Analyzing flows for replay...');
        flowAnalyzer.analyzeSession(session)
          .then(async analysis => {
            if (analysis.success) {
              // Save analysis with session
              sessionStorage.saveFlowAnalysis(sessionId, analysis);
              console.log('[Recording] Flow analysis complete:', analysis.flowCount, 'flows detected');

              // Generate flow-specific Playwright scripts
              console.log('[Recording] Generating flow-specific Playwright scripts...');
              const flowScripts = generateFlowScripts(session, analysis);
              const savedScripts = saveFlowScripts(sessionId, flowScripts, sessionStorage.sessionsDir);
              console.log(`[Recording] Generated ${savedScripts.length} flow script(s)`);
              console.log('[Recording] ✅ Use "Generate Test Cases" button to create test cases with context');
            }
          })
          .catch(err => console.error('[Recording] Flow analysis error:', err.message));
      }

      return {
        success: true,
        sessionId,
        sessionFile,
        specFile,
        actions: result.actions,
        actionCount: result.actions.length
      };
    } catch (error) {
      console.error('[Recording] Error saving session:', error);
      return {
        success: false,
        message: error.message,
        actions: result.actions
      };
    }
  });

  console.log('[IPC] Recording handlers registered');
}

module.exports = { registerRecordingHandlers };
