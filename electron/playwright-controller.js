/**
 * Playwright Controller - Connect to BrowserView via CDP and replay actions
 */

const { chromium } = require('playwright');
const Replayer = require('./replayer');

class PlaywrightController {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.replayer = null;
  }

  /**
   * Connect Playwright to BrowserView via CDP
   * @param {number} debugPort - CDP debugging port (usually 9222)
   */
  async connectToBrowserView(debugPort = 9222) {
    try {
      const debuggerUrl = `http://localhost:${debugPort}`;
      console.log('[Playwright] Connecting to BrowserView via CDP:', debuggerUrl);

      // Connect to existing browser via CDP
      this.browser = await chromium.connectOverCDP(debuggerUrl);
      console.log('[Playwright] Connected to browser');

      const contexts = this.browser.contexts();
      console.log('[Playwright] Found contexts:', contexts.length);

      if (contexts.length > 0) {
        this.context = contexts[0];
        const pages = this.context.pages();
        console.log('[Playwright] Found pages:', pages.length);

        if (pages.length > 0) {
          // Find the BrowserView page (not the main Electron window)
          for (const page of pages) {
            const url = await page.url();
            console.log('[Playwright] Checking page:', url);

            // Skip the Electron main window (localhost) and devtools
            if (!url.includes('localhost:517') && !url.includes('devtools://')) {
              this.page = page;
              this.replayer = new Replayer(page);
              console.log('[Playwright] Connected to BrowserView! URL:', url);
              return true;
            }
          }

          // Fallback: use first non-devtools page
          for (const page of pages) {
            const url = await page.url();
            if (!url.includes('devtools://')) {
              this.page = page;
              this.replayer = new Replayer(page);
              console.log('[Playwright] Connected to page:', url);
              return true;
            }
          }
        }
      }

      console.error('[Playwright] No suitable page found');
      return false;
    } catch (error) {
      console.error('[Playwright] Connection failed:', error.message);
      return false;
    }
  }

  /**
   * Replay recorded session
   * @param {Object} session - Session object with actions and metadata
   * @param {string} speed - Replay speed (slow, normal, fast, fastest)
   */
  async replaySession(session, speed = 'normal') {
    if (!this.page || !this.replayer) {
      throw new Error('Not connected to browser. Call connectToBrowserView() first.');
    }

    // Navigate to the start URL first
    if (session.startUrl || session.metadata?.startUrl) {
      const startUrl = session.startUrl || session.metadata.startUrl;
      console.log('[Playwright] Navigating to start URL:', startUrl);
      await this.page.goto(startUrl);
      await this.page.waitForLoadState('domcontentloaded');
    }

    this.replayer.setSpeed(speed);
    return await this.replayer.replay(session.actions);
  }

  /**
   * Disconnect from browser
   */
  async disconnect() {
    if (this.browser) {
      // Don't close the browser, just disconnect
      // await this.browser.close(); // This would close the BrowserView
      this.browser = null;
      this.context = null;
      this.page = null;
      this.replayer = null;
      console.log('[Playwright] Disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.page !== null && this.replayer !== null;
  }
}

module.exports = PlaywrightController;
