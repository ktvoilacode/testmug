const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
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

  // Assertions
  onAssertionAdded: (callback) => ipcRenderer.on('assertion-added', (event, data) => callback(data)),
});
