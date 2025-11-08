/**
 * Chat IPC Handlers
 * Handles chat and UI toggle operations
 */

/**
 * Register all chat-related IPC handlers
 * @param {Electron.IpcMain} ipcMain - Electron IPC main instance
 * @param {Object} dependencies - Required dependencies
 * @param {Electron.BrowserView} dependencies.browserView - BrowserView instance
 * @param {Electron.BrowserWindow} dependencies.mainWindow - Main window instance
 * @param {Function} dependencies.getChatVisibility - Function to get chat visibility state
 * @param {Function} dependencies.setChatVisibility - Function to set chat visibility state
 */
function registerChatHandlers(ipcMain, dependencies) {
  const { browserView, mainWindow, getChatVisibility, setChatVisibility } = dependencies;

  /**
   * Send message to AI chatbot
   * TODO: Integrate with OpenAI/Groq API
   */
  ipcMain.handle('send-message', async (event, message) => {
    console.log('[Chat] User message:', message);

    // Placeholder for AI chatbot integration
    // TODO: Integrate with OpenAI/Mistral/Groq API
    const aiResponse = `Echo: ${message}`;

    return {
      role: 'assistant',
      content: aiResponse,
    };
  });

  /**
   * Toggle chat panel visibility
   */
  ipcMain.handle('toggle-chat', async (event, showChat) => {
    console.log('[Chat] Toggle chat, showChat:', showChat);

    if (!browserView || !mainWindow) {
      console.log('[Chat] BrowserView or mainWindow not available');
      return { success: false };
    }

    // Update the chat visibility state
    setChatVisibility(showChat);

    const { width, height } = mainWindow.getBounds();
    const topBarHeight = 52;
    const rightPanelWidth = getChatVisibility() ? Math.floor(width * 0.3) : 0;

    console.log('[Chat] Setting BrowserView bounds:', {
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
  });

  console.log('[IPC] Chat handlers registered');
}

module.exports = { registerChatHandlers };
