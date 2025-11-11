/**
 * Settings Storage Module - Save and load application settings
 * Stores LLM provider and API key configuration
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SettingsStorage {
  constructor() {
    // Store settings in user's home directory
    this.settingsDir = path.join(os.homedir(), '.testmug');
    this.settingsFile = path.join(this.settingsDir, 'settings.json');
    this.ensureDirectoryExists();
  }

  /**
   * Ensure settings directory exists
   */
  ensureDirectoryExists() {
    if (!fs.existsSync(this.settingsDir)) {
      fs.mkdirSync(this.settingsDir, { recursive: true });
      console.log('[SettingsStorage] Created settings directory:', this.settingsDir);
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      llm: {
        provider: 'groq', // groq, openai, mistral, grok
        apiKey: '',
        models: {
          groq: 'llama-3.1-8b-instant',
          openai: 'gpt-4o-mini',
          mistral: 'mistral-small-latest',
          grok: 'grok-beta'
        }
      },
      testContext: '' // User's test generation context
    };
  }

  /**
   * Load settings from file
   * @returns {Object} Settings object
   */
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        const settings = JSON.parse(data);
        console.log('[SettingsStorage] Loaded settings:', {
          provider: settings.llm?.provider,
          hasApiKey: !!settings.llm?.apiKey
        });
        return settings;
      }
    } catch (error) {
      console.error('[SettingsStorage] Error loading settings:', error);
    }

    // Return default settings if file doesn't exist or error occurred
    console.log('[SettingsStorage] Using default settings');
    return this.getDefaultSettings();
  }

  /**
   * Save settings to file
   * @param {Object} settings - Settings object to save
   * @returns {boolean} Success status
   */
  saveSettings(settings) {
    try {
      this.ensureDirectoryExists();
      fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2));
      console.log('[SettingsStorage] Saved settings:', {
        provider: settings.llm?.provider,
        hasApiKey: !!settings.llm?.apiKey
      });
      return true;
    } catch (error) {
      console.error('[SettingsStorage] Error saving settings:', error);
      return false;
    }
  }

  /**
   * Update LLM settings
   * @param {string} provider - LLM provider (groq, openai, mistral, grok)
   * @param {string} apiKey - API key for the provider
   * @returns {boolean} Success status
   */
  updateLLMSettings(provider, apiKey) {
    const settings = this.loadSettings();
    settings.llm.provider = provider;
    settings.llm.apiKey = apiKey;
    return this.saveSettings(settings);
  }

  /**
   * Get current LLM settings
   * @returns {Object} LLM settings { provider, apiKey, model }
   */
  getLLMSettings() {
    const settings = this.loadSettings();
    return {
      provider: settings.llm.provider,
      apiKey: settings.llm.apiKey,
      model: settings.llm.models[settings.llm.provider]
    };
  }

  /**
   * Check if API key is configured
   * @returns {boolean} True if API key exists
   */
  hasApiKey() {
    const settings = this.loadSettings();
    return !!(settings.llm?.apiKey && settings.llm.apiKey.trim().length > 0);
  }

  /**
   * Save test context
   * @param {string} context - Test generation context
   * @returns {boolean} Success status
   */
  saveTestContext(context) {
    try {
      const settings = this.loadSettings();
      settings.testContext = context;
      return this.saveSettings(settings);
    } catch (error) {
      console.error('[SettingsStorage] Error saving context:', error);
      return false;
    }
  }

  /**
   * Get test context
   * @returns {string} Test context
   */
  getTestContext() {
    const settings = this.loadSettings();
    return settings.testContext || '';
  }
}

module.exports = SettingsStorage;
