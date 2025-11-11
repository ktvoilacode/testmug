/**
 * Testmug - Main Electron Process
 *
 * Handles application initialization, window management, and IPC communication
 * between the renderer process (React UI) and main process (Electron backend)
 */

const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');
const Recorder = require('./recorder');
const SessionStorage = require('./session-storage');
const SettingsStorage = require('./settings-storage');
const PlaywrightController = require('./playwright-controller');
const FlowAnalyzer = require('./flow-analyzer');
const AssertionManager = require('./assertion-manager');
const TestCaseGenerator = require('./testcase-generator');
const TestRunner = require('./test-runner');
require('dotenv').config();

// ============================================================================
// IPC Handler Modules
// ============================================================================

const { registerNavigationHandlers } = require('./ipc/navigation-handlers');
const { registerRecordingHandlers } = require('./ipc/recording-handlers');
const { registerSessionHandlers } = require('./ipc/session-handlers');
const { registerTestHandlers } = require('./ipc/test-handlers');
const { registerChatHandlers } = require('./ipc/chat-handlers');
const { registerSettingsHandlers } = require('./ipc/settings-handlers');

// ============================================================================
// Global State
// ============================================================================

let mainWindow;                     // Main application window
let browserView;                    // Embedded browser for recording
let isChatVisible = true;           // Chat panel visibility state
let recorder = null;                // User action recording engine
let sessionStorage = null;          // SQLite-based session persistence
let playwrightController = null;    // Playwright test execution controller
let flowAnalyzer = null;            // AI flow pattern analyzer
let testCaseGenerator = null;       // AI test case generator
let assertionManager = null;        // Assertion capture manager
let testRunner = null;              // Parallel test execution engine
let currentSessionId = null;        // Active recording session ID
let ipcHandlersRegistered = false;  // Prevents duplicate IPC registration

// ============================================================================
// Electron Configuration
// ============================================================================

/**
 * Enable remote debugging for Playwright connection
 * Must be set BEFORE app starts
 */
if (!app.commandLine.hasSwitch('remote-debugging-port')) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

// ============================================================================
// Window Management
// ============================================================================

/**
 * Creates the main application window and initializes all components
 * Sets up React UI, embedded browser, recording engine, and AI services
 */
function createWindow() {
  // Create the main window with security settings
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,      // Security: Disable Node.js in renderer
      contextIsolation: true,       // Security: Isolate preload scripts
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the React app (development or production build)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
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

  // Initialize AI flow analyzer and test case generator
  // First try to load from settings, then fall back to environment variables
  const settingsStorage = new SettingsStorage();
  const llmSettings = settingsStorage.getLLMSettings();

  let apiKey = llmSettings.apiKey;
  let provider = llmSettings.provider;

  // Fallback to environment variables if no settings configured
  if (!apiKey) {
    apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    provider = process.env.GROQ_API_KEY ? 'groq' : 'openai';
  }

  if (apiKey) {
    flowAnalyzer = new FlowAnalyzer(apiKey, provider);
    testCaseGenerator = new TestCaseGenerator(apiKey, provider);
    console.log(`[AI] Initialized FlowAnalyzer and TestCaseGenerator with ${provider}`);
  } else {
    console.warn('[AI] No API key found - AI features will require configuration in Settings');
  }

  // Register all IPC handlers after initialization
  registerIPCHandlers();

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

  // Handle new window requests - open in same BrowserView instead of popup
  browserView.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[BrowserView] Intercepting new window request:', url);
    // Load the URL in the same BrowserView instead of opening a new window
    browserView.webContents.loadURL(url);
    return { action: 'deny' }; // Prevent the new window from opening
  });

  // Handle beforeunload dialogs (prevent "Are you sure you want to leave?" popups)
  browserView.webContents.on('will-prevent-unload', (event) => {
    event.preventDefault();
  });

  // Inject code to auto-handle JavaScript dialogs when page loads
  browserView.webContents.on('did-finish-load', () => {
    // Override alert, confirm, and prompt to auto-handle them
    browserView.webContents.executeJavaScript(`
      (function() {
        // Store original functions
        window._originalAlert = window.alert;
        window._originalConfirm = window.confirm;
        window._originalPrompt = window.prompt;

        // Override with auto-accepting versions
        window.alert = function(message) {
          console.log('[Testmug] Auto-handled alert:', message);
          return undefined;
        };

        window.confirm = function(message) {
          console.log('[Testmug] Auto-accepted confirm:', message);
          return true; // Always return true (OK/Yes)
        };

        window.prompt = function(message, defaultValue) {
          console.log('[Testmug] Auto-accepted prompt:', message);
          return defaultValue || ''; // Return default value or empty string
        };
      })();
    `).catch(err => {
      console.error('[BrowserView] Error injecting dialog handlers:', err);
    });
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

// Register all IPC handlers
function registerIPCHandlers() {
  // Prevent double registration
  if (ipcHandlersRegistered) {
    console.log('[Main] IPC handlers already registered, skipping...');
    return;
  }

  console.log('[Main] Registering IPC handlers...');

  // Navigation handlers
  registerNavigationHandlers(ipcMain, browserView);

  // Recording handlers
  registerRecordingHandlers(ipcMain, {
    recorder,
    sessionStorage,
    assertionManager,
    flowAnalyzer,
    browserView,
    setCurrentSessionId: (id) => { currentSessionId = id; }
  });

  // Session handlers
  registerSessionHandlers(ipcMain, {
    sessionStorage,
    playwrightController
  });

  // Test handlers
  registerTestHandlers(ipcMain, {
    sessionStorage,
    flowAnalyzer,
    testCaseGenerator,
    testRunner,
    mainWindow
  });

  // Chat handlers
  registerChatHandlers(ipcMain, {
    browserView,
    mainWindow,
    getChatVisibility: () => isChatVisible,
    setChatVisibility: (visible) => { isChatVisible = visible; }
  });

  // Settings handlers with AI reinitialization callback
  registerSettingsHandlers({
    reinitializeAI: (apiKey, provider) => {
      const FlowAnalyzer = require('./flow-analyzer');
      const TestCaseGenerator = require('./testcase-generator');
      flowAnalyzer = new FlowAnalyzer(apiKey, provider);
      testCaseGenerator = new TestCaseGenerator(apiKey, provider);
      console.log(`[AI] Reinitialized with ${provider}`);
    }
  });

  // Mark as registered
  ipcHandlersRegistered = true;

  console.log('[Main] All IPC handlers registered successfully');
}
