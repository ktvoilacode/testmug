/**
 * Test IPC Handlers
 * Handles test case generation and execution operations
 */

const path = require('path');
const { generateFlowScripts, saveFlowScripts } = require('../playwright-codegen');
const ExcelGenerator = require('../excel-generator');
const { settingsStorage } = require('./settings-handlers');

/**
 * Register all test-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main instance
 * @param {Object} dependencies - Required dependencies
 * @param {Object} dependencies.sessionStorage - Session storage instance
 * @param {Object} dependencies.flowAnalyzer - Flow analyzer instance
 * @param {Object} dependencies.testCaseGenerator - Test case generator instance
 * @param {Object} dependencies.testRunner - Test runner instance
 * @param {Electron.BrowserWindow} dependencies.mainWindow - Main window instance
 */
function registerTestHandlers(ipcMain, dependencies) {
  const { sessionStorage, flowAnalyzer, testCaseGenerator, testRunner, mainWindow } = dependencies;

  /**
   * Open test cases Excel file
   */
  ipcMain.handle('open-test-cases', async (event, sessionId) => {
    console.log('[IPC] open-test-cases:', sessionId);

    if (!sessionStorage) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      const { shell } = require('electron');
      const excelPath = path.join(sessionStorage.sessionsDir, `${sessionId}_testcases.xlsx`);

      if (!require('fs').existsSync(excelPath)) {
        return { success: false, message: 'Test cases file not found' };
      }

      await shell.openPath(excelPath);
      console.log('[IPC] Opened Excel file:', excelPath);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error opening test cases:', error);
      return { success: false, message: error.message };
    }
  });

  /**
   * Regenerate test cases for a session
   */
  ipcMain.handle('regenerate-test-cases', async (event, sessionId) => {
    console.log('[IPC] regenerate-test-cases:', sessionId);

    if (!sessionStorage || !flowAnalyzer || !testCaseGenerator) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      // Load session and existing flow analysis
      const session = sessionStorage.loadSession(sessionId);
      let flowAnalysis = sessionStorage.loadFlowAnalysis(sessionId);

      // If no flow analysis exists, create one
      if (!flowAnalysis) {
        console.log('[IPC] No flow analysis found, generating new one...');
        flowAnalysis = await flowAnalyzer.analyzeSession(session);
        if (flowAnalysis.success) {
          sessionStorage.saveFlowAnalysis(sessionId, flowAnalysis);
        } else {
          return { success: false, message: 'Failed to analyze flows' };
        }
      }

      // Generate new test cases
      console.log('[IPC] Generating new test cases...');
      const testCases = await testCaseGenerator.generateTestCases(session, flowAnalysis, mainWindow);

      if (testCases.length === 0) {
        return { success: false, message: 'No test cases generated' };
      }

      // Generate new Excel file
      const excelGenerator = new ExcelGenerator();
      const excelPath = path.join(sessionStorage.sessionsDir, `${sessionId}_testcases.xlsx`);
      await excelGenerator.generateTestCaseExcel(session, flowAnalysis, testCases, excelPath);

      // Update metadata
      sessionStorage.saveTestCaseMetadata(sessionId, {
        testCaseCount: testCases.length,
        excelPath: excelPath,
        generatedAt: new Date().toISOString()
      });

      console.log(`[IPC] ✅ Regenerated ${testCases.length} test cases`);
      return {
        success: true,
        testCaseCount: testCases.length,
        excelPath
      };
    } catch (error) {
      console.error('[IPC] Error regenerating test cases:', error);
      return { success: false, message: error.message };
    }
  });

  /**
   * Generate test cases with user-provided context
   */
  ipcMain.handle('generate-test-cases-with-context', async (event, sessionId, context) => {
    console.log('[IPC] generate-test-cases-with-context:', sessionId);
    console.log('[IPC] Context:', context);

    if (!sessionStorage || !flowAnalyzer || !testCaseGenerator) {
      return { success: false, message: 'Not initialized' };
    }

    // Check if API key is configured
    if (!settingsStorage.hasApiKey()) {
      console.log('[IPC] No API key configured');
      return {
        success: false,
        message: 'API key not configured. Please configure your LLM provider and API key in Settings.',
        needsApiKey: true
      };
    }

    try {
      // Load session
      const session = sessionStorage.loadSession(sessionId);

      // Save test context to session
      sessionStorage.saveTestContext(sessionId, context);

      // Analyze flows if not already done
      let flowAnalysis = sessionStorage.loadFlowAnalysis(sessionId);
      if (!flowAnalysis) {
        console.log('[IPC] No flow analysis found, generating...');
        flowAnalysis = await flowAnalyzer.analyzeSession(session);
        if (flowAnalysis.success) {
          sessionStorage.saveFlowAnalysis(sessionId, flowAnalysis);
        } else {
          return { success: false, message: 'Failed to analyze flows' };
        }
      }

      // Generate flow-specific Playwright scripts
      console.log('[IPC] Generating flow-specific Playwright scripts...');
      const flowScripts = generateFlowScripts(session, flowAnalysis);
      const savedScripts = saveFlowScripts(sessionId, flowScripts, sessionStorage.sessionsDir);
      console.log(`[IPC] Generated ${savedScripts.length} flow script(s)`);

      // Generate test cases with AI using context
      console.log('[IPC] Generating test cases with context...');
      const testCases = await testCaseGenerator.generateTestCasesWithContext(
        session,
        flowAnalysis,
        context,
        mainWindow
      );

      if (testCases.length === 0) {
        return { success: false, message: 'No test cases generated' };
      }

      // Generate Excel file
      const excelGenerator = new ExcelGenerator();
      const excelPath = path.join(sessionStorage.sessionsDir, `${sessionId}_testcases.xlsx`);
      await excelGenerator.generateTestCaseExcel(session, flowAnalysis, testCases, excelPath);

      // Update metadata
      sessionStorage.saveTestCaseMetadata(sessionId, {
        testCaseCount: testCases.length,
        excelPath: excelPath,
        generatedAt: new Date().toISOString()
      });

      console.log(`[IPC] ✅ Generated ${testCases.length} test cases with context`);
      return {
        success: true,
        testCaseCount: testCases.length,
        excelPath
      };
    } catch (error) {
      console.error('[IPC] Error generating test cases with context:', error);
      return { success: false, message: error.message };
    }
  });

  /**
   * Run all test cases for a session
   */
  ipcMain.handle('run-all-tests', async (event, sessionId) => {
    console.log('[IPC] run-all-tests:', sessionId);

    if (!sessionStorage || !testRunner) {
      return { success: false, message: 'Not initialized' };
    }

    try {
      // Run all tests with progress updates sent to mainWindow
      const result = await testRunner.runAllTests(sessionId, mainWindow);
      return result;
    } catch (error) {
      console.error('[IPC] Error running tests:', error);
      return { success: false, message: error.message };
    }
  });

  console.log('[IPC] Test handlers registered');
}

module.exports = { registerTestHandlers };
