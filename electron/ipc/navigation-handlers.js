/**
 * Navigation IPC Handlers
 * Handles browser navigation operations (navigate, back, forward, refresh, etc.)
 */

const path = require('path');

/**
 * Register all navigation-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main instance
 * @param {Electron.BrowserView} browserView - BrowserView instance
 */
function registerNavigationHandlers(ipcMain, browserView) {
  /**
   * Navigate to a URL
   */
  ipcMain.handle('navigate', async (event, url) => {
    if (!browserView) {
      return { success: false, error: 'BrowserView not initialized' };
    }

    try {
      // Add https:// if no protocol specified
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
      }

      console.log('[Navigation] Navigating to:', fullUrl);
      await browserView.webContents.loadURL(fullUrl);
      return { success: true, url: fullUrl };
    } catch (error) {
      console.error('[Navigation] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get current URL
   */
  ipcMain.handle('get-url', async () => {
    if (browserView) {
      return browserView.webContents.getURL();
    }
    return '';
  });

  /**
   * Go back in history
   */
  ipcMain.handle('go-back', async () => {
    if (browserView && browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
      return { success: true };
    }
    return { success: false };
  });

  /**
   * Go forward in history
   */
  ipcMain.handle('go-forward', async () => {
    if (browserView && browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
      return { success: true };
    }
    return { success: false };
  });

  /**
   * Refresh current page
   */
  ipcMain.handle('refresh', async () => {
    if (browserView) {
      browserView.webContents.reload();
      return { success: true };
    }
    return { success: false };
  });

  /**
   * Get navigation state (back/forward availability)
   */
  ipcMain.handle('get-navigation-state', async () => {
    if (browserView) {
      return {
        canGoBack: browserView.webContents.canGoBack(),
        canGoForward: browserView.webContents.canGoForward(),
      };
    }
    return { canGoBack: false, canGoForward: false };
  });

  /**
   * Go to home page (welcome screen)
   */
  ipcMain.handle('go-home', async () => {
    if (browserView) {
      await browserView.webContents.loadFile(path.join(__dirname, '..', 'welcome.html'));
      return { success: true };
    }
    return { success: false };
  });

  console.log('[IPC] Navigation handlers registered');
}

module.exports = { registerNavigationHandlers };
