/**
 * Assertion Manager - Handle custom right-click context menu for adding assertions
 */

class AssertionManager {
  constructor(browserView) {
    this.browserView = browserView;
    this.assertions = [];
    this.setupContextMenu();
  }

  /**
   * Setup custom context menu
   */
  setupContextMenu() {
    // Inject context menu handler into the page
    this.browserView.webContents.on('context-menu', (event, params) => {
      this.handleContextMenu(event, params);
    });
  }

  /**
   * Handle context menu event
   */
  handleContextMenu(event, params) {
    const { Menu, MenuItem } = require('electron');
    const menu = new Menu();

    // Get element info from context menu params
    const elementInfo = {
      selector: params.linkURL ? `a[href="${params.linkURL}"]` : null,
      text: params.selectionText || params.linkText || params.titleText || '',
      x: params.x,
      y: params.y,
      frameURL: params.frameURL || params.pageURL,
      mediaType: params.mediaType
    };

    // Add assertion menu items
    menu.append(new MenuItem({
      label: '🎯 Add Assertion',
      type: 'submenu',
      submenu: [
        {
          label: '✓ Check element is visible',
          click: () => {
            this.addAssertion({
              type: 'visible',
              selector: this.getSelectorAtPoint(params),
              description: 'Element should be visible',
              ...elementInfo
            });
          }
        },
        {
          label: '✓ Verify text exists',
          enabled: !!elementInfo.text,
          click: () => {
            this.addAssertion({
              type: 'contains_text',
              text: elementInfo.text,
              selector: this.getSelectorAtPoint(params),
              description: `Should contain text: "${elementInfo.text}"`,
              ...elementInfo
            });
          }
        },
        {
          label: '✓ Check element not visible',
          click: () => {
            this.addAssertion({
              type: 'not_visible',
              selector: this.getSelectorAtPoint(params),
              description: 'Element should not be visible',
              ...elementInfo
            });
          }
        },
        {
          label: '✓ Verify link exists',
          enabled: !!params.linkURL,
          click: () => {
            this.addAssertion({
              type: 'link_exists',
              href: params.linkURL,
              text: params.linkText,
              description: `Link "${params.linkText}" should exist`,
              ...elementInfo
            });
          }
        }
      ]
    }));

    menu.append(new MenuItem({ type: 'separator' }));

    // Add default context menu items
    if (params.selectionText) {
      menu.append(new MenuItem({
        label: 'Copy',
        role: 'copy'
      }));
    }

    if (params.editFlags.canPaste) {
      menu.append(new MenuItem({
        label: 'Paste',
        role: 'paste'
      }));
    }

    menu.append(new MenuItem({ type: 'separator' }));

    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => {
        this.browserView.webContents.inspectElement(params.x, params.y);
      }
    }));

    menu.popup();
  }

  /**
   * Get selector for element at point
   * This is a simplified version - in reality, we need to inject JS to get accurate selector
   */
  getSelectorAtPoint(params) {
    // For now, return a placeholder - we'll enhance this with JS injection
    if (params.linkURL) {
      return `a[href="${params.linkURL}"]`;
    }
    if (params.srcURL) {
      return `[src="${params.srcURL}"]`;
    }
    // Will be enhanced to get actual element selector via executeJavaScript
    return '.element-at-point';
  }

  /**
   * Add assertion
   */
  addAssertion(assertion) {
    // Inject JS to get accurate selector
    this.browserView.webContents.executeJavaScript(`
      (function() {
        function getSelector(el) {
          if (!el) return null;

          // Check for ID
          if (el.id) return '#' + el.id;

          // Check for unique class
          if (el.className) {
            const classes = el.className.split(' ').filter(c => c);
            if (classes.length > 0) {
              const selector = '.' + classes.join('.');
              if (document.querySelectorAll(selector).length === 1) {
                return selector;
              }
            }
          }

          // Check for data-testid
          if (el.getAttribute('data-testid')) {
            return '[data-testid="' + el.getAttribute('data-testid') + '"]';
          }

          // Check for name
          if (el.name) {
            return '[name="' + el.name + '"]';
          }

          // Build path from parent
          let path = el.tagName.toLowerCase();
          if (el.parentElement) {
            const siblings = Array.from(el.parentElement.children);
            const index = siblings.indexOf(el);
            if (siblings.length > 1) {
              path += ':nth-child(' + (index + 1) + ')';
            }
          }

          return path;
        }

        // Get element at the stored coordinates
        const el = document.elementFromPoint(${assertion.x}, ${assertion.y});
        if (!el) return null;

        return {
          selector: getSelector(el),
          text: el.textContent?.trim().substring(0, 100) || '',
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          value: el.value || null
        };
      })();
    `).then(elementData => {
      if (elementData && elementData.selector) {
        const fullAssertion = {
          ...assertion,
          selector: elementData.selector,
          elementData,
          timestamp: Date.now()
        };

        this.assertions.push(fullAssertion);
        console.log('[AssertionManager] Added assertion:', fullAssertion);

        // Highlight the element briefly
        this.highlightElement(elementData.selector);

        // Send to main window to display
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('assertion-added', fullAssertion);
        }
      }
    }).catch(err => {
      console.error('[AssertionManager] Error getting element selector:', err);
    });
  }

  /**
   * Highlight element briefly
   */
  async highlightElement(selector) {
    try {
      await this.browserView.webContents.executeJavaScript(`
        (function() {
          const el = document.querySelector('${selector}');
          if (el) {
            const originalOutline = el.style.outline;
            const originalShadow = el.style.boxShadow;

            el.style.outline = '3px solid #3b82f6';
            el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';

            setTimeout(() => {
              el.style.outline = originalOutline;
              el.style.boxShadow = originalShadow;
            }, 1500);
          }
        })();
      `);
    } catch (error) {
      console.error('[AssertionManager] Error highlighting element:', error);
    }
  }

  /**
   * Get all assertions
   */
  getAssertions() {
    return this.assertions;
  }

  /**
   * Clear assertions
   */
  clearAssertions() {
    this.assertions = [];
  }

  /**
   * Add assertions to session
   */
  addAssertionsToSession(sessionData) {
    return {
      ...sessionData,
      assertions: this.assertions
    };
  }
}

module.exports = AssertionManager;
