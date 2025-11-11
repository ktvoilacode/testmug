/**
 * Testmug - Preload Script
 *
 * Securely exposes IPC methods to the renderer process (React app)
 * Uses contextBridge to prevent direct access to Node.js/Electron APIs
 *
 * Security: contextIsolation enabled, no nodeIntegration
 */

const { contextBridge, ipcRenderer } = require('electron');

// ============================================================================
// Expose IPC Methods to Renderer
// ============================================================================

/**
 * Exposes safe API methods to window.electron in the renderer process
 * All methods use ipcRenderer.invoke for async main process communication
 */
contextBridge.exposeInMainWorld('electron', {
  // Browser navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  getUrl: () => ipcRenderer.invoke('get-url'),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  refresh: () => ipcRenderer.invoke('refresh'),
  goHome: () => ipcRenderer.invoke('go-home'),
  getNavigationState: () => ipcRenderer.invoke('get-navigation-state'),
  onUrlChanged: (callback) => ipcRenderer.on('url-changed', (event, data) => callback(data)),

  // Chat/AI
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  toggleChat: (showChat) => ipcRenderer.invoke('toggle-chat', showChat),

  // Recording
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),

  // Sessions
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  replaySession: (sessionId, speed) => ipcRenderer.invoke('replay-session', sessionId, speed),
  replayFlow: (sessionId, flowId) => ipcRenderer.invoke('replay-flow', sessionId, flowId),
  updateSessionName: (sessionId, name) => ipcRenderer.invoke('update-session-name', sessionId, name),
  deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),

  // Test Cases
  openTestCases: (sessionId) => ipcRenderer.invoke('open-test-cases', sessionId),
  regenerateTestCases: (sessionId) => ipcRenderer.invoke('regenerate-test-cases', sessionId),
  generateTestCasesWithContext: (sessionId, context) => ipcRenderer.invoke('generate-test-cases-with-context', sessionId, context),
  runAllTests: (sessionId) => ipcRenderer.invoke('run-all-tests', sessionId),

  // Assertions
  onAssertionAdded: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('assertion-added', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('assertion-added', handler);
  },

  // Test Progress
  onTestProgress: (callback) => ipcRenderer.on('test-progress', (event, data) => callback(data)),

  // Test Generation Progress
  onGenerationProgress: (callback) => ipcRenderer.on('generation-progress', (event, data) => callback(data)),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  updateLLMSettings: (provider, apiKey) => ipcRenderer.invoke('update-llm-settings', { provider, apiKey }),
  hasApiKey: () => ipcRenderer.invoke('has-api-key'),

  // Test Context
  saveTestContext: (context) => ipcRenderer.invoke('save-test-context', context),
  getTestContext: () => ipcRenderer.invoke('get-test-context'),
});
