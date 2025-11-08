const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Browser navigation
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  getUrl: () => ipcRenderer.invoke('get-url'),

  // Chat/AI
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  toggleChat: (showChat) => ipcRenderer.invoke('toggle-chat', showChat),

  // Recording
  startRecording: (type) => ipcRenderer.invoke('start-recording', type),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
});
