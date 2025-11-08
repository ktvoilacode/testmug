/**
 * Simplified Recorder Module - CDP Event Capture for Testmug
 * Captures user interactions (clicks, inputs, scrolls, navigation) via Chrome DevTools Protocol
 */

class Recorder {
  constructor(browserView) {
    this.browserView = browserView;
    this.isRecording = false;
    this.recordedActions = [];
    this.consoleListener = null;
    this.navigationListeners = [];
  }

  /**
   * Start recording user interactions
   */
  async startRecording() {
    if (this.isRecording) {
      return { success: false, message: 'Already recording' };
    }

    console.log('[Recorder] Starting recording...');
    this.isRecording = true;
    this.recordedActions = [];

    // Inject event capture code into the page
    await this.injectEventCapture();

    // Listen for console messages containing CDP events
    this.setupConsoleListener();

    // Listen for navigation and re-inject on new pages
    this.setupNavigationListeners();

    return { success: true, message: 'Recording started' };
  }

  /**
   * Stop recording and return captured actions
   */
  async stopRecording() {
    if (!this.isRecording) {
      return { success: false, message: 'Not recording' };
    }

    console.log('[Recorder] Stopping recording...');
    this.isRecording = false;

    // Remove all listeners
    this.removeListeners();

    // Sort actions by timestamp
    this.recordedActions.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[Recorder] Captured ${this.recordedActions.length} actions`);

    return {
      success: true,
      actions: this.recordedActions,
      actionCount: this.recordedActions.length
    };
  }

  /**
   * Inject event capture code into the current page
   */
  async injectEventCapture() {
    try {
      await this.browserView.webContents.executeJavaScript(this.getEventCaptureCode());
      console.log('[Recorder] Event capture injected');
    } catch (error) {
      console.error('[Recorder] Failed to inject event capture:', error);
    }
  }

  /**
   * Setup console listener to capture CDP events
   */
  setupConsoleListener() {
    this.consoleListener = (event, level, message) => {
      if (!this.isRecording) return;

      // Parse CDP event messages
      if (message.startsWith('[CDP_EVENT]')) {
        try {
          const eventData = JSON.parse(message.replace('[CDP_EVENT]', ''));
          eventData.humanTime = new Date(eventData.timestamp).toISOString();

          this.recordedActions.push(eventData);

          console.log('[Recorder]', eventData.type, eventData.selector || `(${eventData.x}, ${eventData.y})`);
        } catch (error) {
          console.error('[Recorder] Failed to parse event:', error);
        }
      }
    };

    this.browserView.webContents.on('console-message', this.consoleListener);
  }

  /**
   * Setup navigation listeners to re-inject on page changes
   */
  setupNavigationListeners() {
    const navigateListener = async (event, url) => {
      if (!this.isRecording) return;
      console.log('[Recorder] Page navigated to:', url);
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.injectEventCapture();
    };

    const inPageListener = async (event, url) => {
      if (!this.isRecording) return;
      console.log('[Recorder] In-page navigation to:', url);
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.injectEventCapture();
    };

    this.browserView.webContents.on('did-navigate', navigateListener);
    this.browserView.webContents.on('did-navigate-in-page', inPageListener);

    this.navigationListeners = [
      { event: 'did-navigate', listener: navigateListener },
      { event: 'did-navigate-in-page', listener: inPageListener }
    ];
  }

  /**
   * Remove all event listeners
   */
  removeListeners() {
    if (this.consoleListener) {
      this.browserView.webContents.removeListener('console-message', this.consoleListener);
      this.consoleListener = null;
    }

    this.navigationListeners.forEach(({ event, listener }) => {
      this.browserView.webContents.removeListener(event, listener);
    });
    this.navigationListeners = [];
  }

  /**
   * Get the CDP event capture code to inject into the page
   * This JavaScript runs in the browser context and captures all user interactions
   */
  getEventCaptureCode() {
    return `
      (function() {
        if (window.__testmugRecordingActive) {
          console.log('[CDP] Recording already active');
          return;
        }

        window.__testmugRecordingActive = true;
        console.log('[CDP] Installing event capture...');

        // Helper: Get smart selector for element
        function getSelector(el) {
          // Priority 1: data-testid
          const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');
          if (testId) return '[data-testid="' + testId + '"]';

          // Priority 2: ID (if stable)
          if (el.id && !el.id.match(/[0-9]{5,}/)) return '#' + el.id;

          // Priority 3: Name attribute
          if (el.name) return '[name="' + el.name + '"]';

          // Priority 4: Placeholder (for inputs)
          if (el.placeholder) return el.tagName.toLowerCase() + '[placeholder="' + el.placeholder + '"]';

          // Priority 5: Text content (for buttons/links)
          const text = el.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            const tag = el.tagName.toLowerCase();
            if (['a', 'button', 'span', 'div'].includes(tag)) {
              return tag + ':has-text("' + text.substring(0, 30) + '")';
            }
          }

          // Priority 6: Class-based selector
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\\s+/).filter(c => !c.match(/[0-9]{5,}/));
            if (classes.length > 0) {
              return el.tagName.toLowerCase() + '.' + classes[0];
            }
          }

          // Fallback: tag name
          return el.tagName.toLowerCase();
        }

        // Capture click events
        document.addEventListener('click', (e) => {
          const event = {
            type: 'click',
            selector: getSelector(e.target),
            tagName: e.target.tagName.toLowerCase(),
            text: e.target.textContent?.trim().substring(0, 100),
            x: e.clientX,
            y: e.clientY,
            timestamp: Date.now(),
            url: window.location.href
          };
          console.log('[CDP_EVENT]' + JSON.stringify(event));
        }, true);

        // Capture input events
        document.addEventListener('input', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            const event = {
              type: 'input',
              selector: getSelector(e.target),
              tagName: e.target.tagName.toLowerCase(),
              value: e.target.value,
              inputType: e.target.type,
              timestamp: Date.now(),
              url: window.location.href
            };
            console.log('[CDP_EVENT]' + JSON.stringify(event));
          }
        }, true);

        // Capture scroll events (throttled)
        let scrollTimeout;
        document.addEventListener('scroll', (e) => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            const event = {
              type: 'scroll',
              scrollX: window.scrollX,
              scrollY: window.scrollY,
              timestamp: Date.now(),
              url: window.location.href
            };
            console.log('[CDP_EVENT]' + JSON.stringify(event));
          }, 300);
        }, true);

        // Capture keypress events (for special keys)
        document.addEventListener('keydown', (e) => {
          // Only capture special keys
          if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            const event = {
              type: 'keypress',
              key: e.key,
              selector: getSelector(e.target),
              timestamp: Date.now(),
              url: window.location.href
            };
            console.log('[CDP_EVENT]' + JSON.stringify(event));
          }
        }, true);

        // Capture navigation (URL changes)
        let lastUrl = window.location.href;
        setInterval(() => {
          if (window.location.href !== lastUrl) {
            const event = {
              type: 'navigate',
              url: window.location.href,
              previousUrl: lastUrl,
              timestamp: Date.now()
            };
            console.log('[CDP_EVENT]' + JSON.stringify(event));
            lastUrl = window.location.href;
          }
        }, 500);

        console.log('[CDP] Event capture installed successfully');
      })();
    `;
  }
}

module.exports = Recorder;
