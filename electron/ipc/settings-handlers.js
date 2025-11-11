/**
 * Settings IPC Handlers
 * Handles settings-related IPC communication
 */

const { ipcMain } = require('electron');
const SettingsStorage = require('../settings-storage');

const settingsStorage = new SettingsStorage();

/**
 * Register all settings-related IPC handlers
 * @param {Object} dependencies - Optional dependencies for reinitialization
 */
function registerSettingsHandlers(dependencies = {}) {
  console.log('[IPC] Registering settings handlers...');

  /**
   * Load settings
   */
  ipcMain.handle('get-settings', async () => {
    try {
      console.log('[IPC] get-settings');
      const settings = settingsStorage.loadSettings();

      // Don't send the full API key to frontend for security
      // Only send masked version and provider
      return {
        llm: {
          provider: settings.llm.provider,
          hasApiKey: settingsStorage.hasApiKey(),
          apiKeyPreview: settings.llm.apiKey ?
            settings.llm.apiKey.substring(0, 8) + '...' : '',
          models: settings.llm.models
        },
        testContext: settings.testContext || ''
      };
    } catch (error) {
      console.error('[IPC] Error loading settings:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Save settings
   */
  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      console.log('[IPC] save-settings:', {
        provider: settings.llm?.provider,
        hasApiKey: !!settings.llm?.apiKey
      });

      const success = settingsStorage.saveSettings(settings);

      return { success };
    } catch (error) {
      console.error('[IPC] Error saving settings:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update LLM settings
   */
  ipcMain.handle('update-llm-settings', async (event, { provider, apiKey }) => {
    try {
      console.log('[IPC] update-llm-settings:', { provider, hasApiKey: !!apiKey });

      const success = settingsStorage.updateLLMSettings(provider, apiKey);

      // Reinitialize AI services with new settings if dependencies provided
      if (success && dependencies.reinitializeAI) {
        console.log('[IPC] Reinitializing AI services with new settings...');
        dependencies.reinitializeAI(apiKey, provider);
      }

      return { success };
    } catch (error) {
      console.error('[IPC] Error updating LLM settings:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get LLM settings (for backend use)
   */
  ipcMain.handle('get-llm-settings', async () => {
    try {
      console.log('[IPC] get-llm-settings');
      const settings = settingsStorage.getLLMSettings();

      return settings;
    } catch (error) {
      console.error('[IPC] Error getting LLM settings:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Check if API key is configured
   */
  ipcMain.handle('has-api-key', async () => {
    try {
      const hasKey = settingsStorage.hasApiKey();
      console.log('[IPC] has-api-key:', hasKey);
      return hasKey;
    } catch (error) {
      console.error('[IPC] Error checking API key:', error);
      return false;
    }
  });

  /**
   * Save test context
   */
  ipcMain.handle('save-test-context', async (event, context) => {
    try {
      console.log('[IPC] save-test-context:', context.length, 'characters');
      const success = settingsStorage.saveTestContext(context);
      return { success };
    } catch (error) {
      console.error('[IPC] Error saving test context:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get test context
   */
  ipcMain.handle('get-test-context', async () => {
    try {
      const context = settingsStorage.getTestContext();
      console.log('[IPC] get-test-context:', context.length, 'characters');
      return context;
    } catch (error) {
      console.error('[IPC] Error getting test context:', error);
      return '';
    }
  });

  console.log('[IPC] Settings handlers registered');
}

module.exports = { registerSettingsHandlers, settingsStorage };
