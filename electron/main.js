const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let browserView;

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

  // Position the browser view on the right side
  const { width, height } = mainWindow.getBounds();
  browserView.setBounds({
    x: Math.floor(width * 0.3), // 30% for left panel (chat)
    y: 0,
    width: Math.floor(width * 0.7), // 70% for browser view
    height: height,
  });

  browserView.setAutoResize({
    width: true,
    height: true,
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
      browserView.setBounds({
        x: Math.floor(width * 0.3),
        y: 0,
        width: Math.floor(width * 0.7),
        height: height,
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
      await browserView.webContents.loadURL(url);
      return { success: true };
    } catch (error) {
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
