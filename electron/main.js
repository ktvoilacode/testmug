const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');
const Recorder = require('./recorder');
const SessionStorage = require('./session-storage');
const { generatePlaywrightCode, savePlaywrightCode, generateFlowScripts, saveFlowScripts } = require('./playwright-codegen');
const PlaywrightController = require('./playwright-controller');
const FlowAnalyzer = require('./flow-analyzer');
const AssertionManager = require('./assertion-manager');
const TestCaseGenerator = require('./testcase-generator');
const ExcelGenerator = require('./excel-generator');
const TestRunner = require('./test-runner');
require('dotenv').config();

let mainWindow;
let browserView;
let isChatVisible = true; // Track chat visibility state
let recorder = null; // Recorder instance
let sessionStorage = null; // Session storage instance
let playwrightController = null; // Playwright controller instance
let flowAnalyzer = null; // AI flow analyzer instance
let testCaseGenerator = null; // AI test case generator instance
let assertionManager = null; // Assertion manager for context menu
let testRunner = null; // Test execution engine
let currentSessionId = null; // Current recording session ID

// Enable remote debugging for Playwright connection BEFORE app starts
if (!app.commandLine.hasSwitch('remote-debugging-port')) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

function createWindow() {
  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the React app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Create BrowserView for embedded browser (right side)
  createBrowserView();

  // Initialize recorder and session storage
  recorder = new Recorder(browserView);
  sessionStorage = new SessionStorage();
  playwrightController = new PlaywrightController();
  assertionManager = new AssertionManager(browserView);
  testRunner = new TestRunner(playwrightController, sessionStorage);

  // Initialize AI flow analyzer and test case generator (use GROQ_API_KEY from .env)
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const provider = process.env.GROQ_API_KEY ? 'groq' : 'openai';
  if (apiKey) {
    flowAnalyzer = new FlowAnalyzer(apiKey, provider);
    testCaseGenerator = new TestCaseGenerator(apiKey, provider);
    console.log(`[AI] Initialized FlowAnalyzer and TestCaseGenerator with ${provider}`);
  } else {
    console.warn('[AI] No API key found - AI features disabled');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createBrowserView() {
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setBrowserView(browserView);

  // Position the browser view accounting for top bar (52px) and right panel (30%)
  const { width, height } = mainWindow.getBounds();
  const topBarHeight = 52;
  const rightPanelWidth = Math.floor(width * 0.3); // 30% for right chat panel

  browserView.setBounds({
    x: 0,
    y: topBarHeight,
    width: width - rightPanelWidth,
    height: height - topBarHeight,
  });

  // Don't use auto-resize since we're manually controlling it
  browserView.setAutoResize({
    width: false,
    height: false,
  });

  // Listen for navigation events and send updates to renderer
  browserView.webContents.on('did-navigate', () => {
    const url = browserView.webContents.getURL();
    mainWindow.webContents.send('url-changed', {
      url,
      canGoBack: browserView.webContents.canGoBack(),
      canGoForward: browserView.webContents.canGoForward(),
    });
  });

  browserView.webContents.on('did-navigate-in-page', () => {
    const url = browserView.webContents.getURL();
    mainWindow.webContents.send('url-changed', {
      url,
      canGoBack: browserView.webContents.canGoBack(),
      canGoForward: browserView.webContents.canGoForward(),
    });
  });

  // Handle navigation failures
  browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Skip if it's just an internal navigation error or aborted
    if (errorCode === -3 || errorCode === 0) return;

    console.log('Navigation failed:', errorCode, errorDescription, validatedURL);

    // Load error page
    const errorPagePath = path.join(__dirname, 'error.html');
    const errorUrl = `file://${errorPagePath}?url=${encodeURIComponent(validatedURL)}&error=${errorCode}`;
    browserView.webContents.loadURL(errorUrl);
  });

  // Load welcome page
  browserView.webContents.loadFile(path.join(__dirname, 'welcome.html'));
}

// Handle window resize
app.on('ready', () => {
  createWindow();

  mainWindow.on('resize', () => {
    if (browserView) {
      const { width, height } = mainWindow.getBounds();
      const topBarHeight = 52;
      const rightPanelWidth = isChatVisible ? Math.floor(width * 0.3) : 0; // Use chat visibility state

      browserView.setBounds({
        x: 0,
        y: topBarHeight,
        width: width - rightPanelWidth,
        height: height - topBarHeight,
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('navigate', async (event, url) => {
  if (browserView) {
    try {
      // Add https:// if no protocol specified
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
      }

      console.log('Navigating to:', fullUrl);
      await browserView.webContents.loadURL(fullUrl);
      return { success: true, url: fullUrl };
    } catch (error) {
      console.error('Navigation error:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'BrowserView not initialized' };
});

ipcMain.handle('get-url', async () => {
  if (browserView) {
    return browserView.webContents.getURL();
  }
  return '';
});

ipcMain.handle('go-back', async () => {
  if (browserView && browserView.webContents.canGoBack()) {
    browserView.webContents.goBack();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('go-forward', async () => {
  if (browserView && browserView.webContents.canGoForward()) {
    browserView.webContents.goForward();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('refresh', async () => {
  if (browserView) {
    browserView.webContents.reload();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-navigation-state', async () => {
  if (browserView) {
    return {
      canGoBack: browserView.webContents.canGoBack(),
      canGoForward: browserView.webContents.canGoForward(),
    };
  }
  return { canGoBack: false, canGoForward: false };
});

ipcMain.handle('go-home', async () => {
  if (browserView) {
    await browserView.webContents.loadFile(path.join(__dirname, 'welcome.html'));
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('send-message', async (event, message) => {
  // Placeholder for AI chatbot integration
  console.log('User message:', message);

  // TODO: Integrate with OpenAI/Mistral API
  const aiResponse = `Echo: ${message}`;

  return {
    role: 'assistant',
    content: aiResponse,
  };
});

ipcMain.handle('start-recording', async (event) => {
  console.log('[IPC] start-recording');

  if (!recorder) {
    return { success: false, message: 'Recorder not initialized' };
  }

  return await recorder.startRecording();
});

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
    // Get current URL
    const currentUrl = browserView.webContents.getURL();

    // Get assertions from assertion manager
    const assertions = assertionManager ? assertionManager.getAssertions() : [];

    // Save session to disk (with assertions)
    const { sessionId, sessionFile, session } = sessionStorage.saveSession(result.actions, {
      startUrl: currentUrl,
      assertions
    });

    currentSessionId = sessionId;

    // Clear assertions for next recording
    if (assertionManager) {
      assertionManager.clearAssertions();
    }

    // Generate Playwright code
    const playwrightCode = generatePlaywrightCode(session);
    const specFile = sessionStorage.getSpecFile(sessionId);
    savePlaywrightCode(specFile, playwrightCode);

    console.log('[Recording] Session saved:', sessionId);
    console.log('[Recording] Playwright script:', specFile);

    // Analyze flows with AI and generate test cases (async - don't wait for it)
    let flowAnalysis = null;
    if (flowAnalyzer && testCaseGenerator) {
      console.log('[Recording] Starting AI flow analysis and test case generation...');
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

            // Generate test cases with AI
            console.log('[Recording] Generating test cases with AI...');
            const testCases = await testCaseGenerator.generateTestCases(session, analysis, mainWindow);

            if (testCases.length > 0) {
              // Generate Excel file
              const excelGenerator = new ExcelGenerator();
              const excelPath = path.join(sessionStorage.sessionsDir, `${sessionId}_testcases.xlsx`);

              await excelGenerator.generateTestCaseExcel(session, analysis, testCases, excelPath);
              console.log(`[Recording] ✅ Generated ${testCases.length} test cases in Excel: ${excelPath}`);

              // Save test case count to session
              sessionStorage.saveTestCaseMetadata(sessionId, {
                testCaseCount: testCases.length,
                excelPath: excelPath,
                generatedAt: new Date().toISOString()
              });
            }
          }
        })
        .catch(err => console.error('[Recording] AI processing error:', err.message));
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

// Get all sessions
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

// Replay a session
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

// Replay a specific flow
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

// Update session name
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

// Delete session
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

// Open test cases Excel file
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

// Regenerate test cases
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

// Run all tests
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

ipcMain.handle('toggle-chat', async (event, showChat) => {
  console.log('Toggle chat called, showChat:', showChat);

  // Update the global state
  isChatVisible = showChat;

  if (browserView && mainWindow) {
    const { width, height } = mainWindow.getBounds();
    const topBarHeight = 52;
    const rightPanelWidth = isChatVisible ? Math.floor(width * 0.3) : 0;

    console.log('Setting BrowserView bounds:', {
      x: 0,
      y: topBarHeight,
      width: width - rightPanelWidth,
      height: height - topBarHeight,
    });

    browserView.setBounds({
      x: 0,
      y: topBarHeight,
      width: width - rightPanelWidth,
      height: height - topBarHeight,
    });

    return { success: true };
  }
  console.log('BrowserView or mainWindow not available');
  return { success: false };
});
