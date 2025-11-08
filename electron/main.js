const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let browserView;
let isChatVisible = true; // Track chat visibility state

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

  // Load a default page
  browserView.webContents.loadURL('https://example.com');
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

ipcMain.handle('start-recording', async (event, type) => {
  console.log('Starting recording:', type);

  // TODO: Implement recording logic
  return { success: true, message: `Recording ${type} test case started` };
});

ipcMain.handle('stop-recording', async () => {
  console.log('Stopping recording');

  // TODO: Implement stop recording logic
  return { success: true, actions: [] };
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
