/**
 * Simplified Replayer Module - Replay recorded actions with visual highlighting
 */

class Replayer {
  constructor(page) {
    this.page = page; // Playwright page instance
    this.replaySpeed = 'normal';
  }

  /**
   * Set replay speed
   * @param {string} speed - slow | normal | fast | fastest
   */
  setSpeed(speed) {
    this.replaySpeed = speed || 'normal';
  }

  /**
   * Get delay based on current speed
   */
  getDelay(type = 'action') {
    const delays = {
      slow: { highlight: 800, action: 400, input: 150 },
      normal: { highlight: 300, action: 100, input: 0 },
      fast: { highlight: 100, action: 30, input: 0 },
      fastest: { highlight: 0, action: 0, input: 0 }
    };
    const config = delays[this.replaySpeed] || delays.normal;
    return config[type];
  }

  /**
   * Optimize actions by combining consecutive inputs on same element
   */
  optimizeActions(actions) {
    const optimized = [];
    let i = 0;

    while (i < actions.length) {
      const action = actions[i];

      // If it's an input action, look ahead for consecutive inputs on same selector
      if (action.type === 'input' && action.selector) {
        let j = i + 1;
        let lastValue = action.value;

        // Find all consecutive input actions on the same selector
        while (j < actions.length &&
               actions[j].type === 'input' &&
               actions[j].selector === action.selector) {
          lastValue = actions[j].value;
          j++;
        }

        // If we found consecutive inputs, use only the last value
        if (j > i + 1) {
          optimized.push({
            ...action,
            value: lastValue,
            optimized: true,
            originalCount: j - i
          });
          i = j; // Skip all the consecutive inputs
        } else {
          optimized.push(action);
          i++;
        }
      } else {
        optimized.push(action);
        i++;
      }
    }

    return optimized;
  }

  /**
   * Replay a list of recorded actions
   * @param {Array} actions - Array of action objects
   */
  async replay(actions) {
    if (!this.page) {
      throw new Error('No Playwright page connected');
    }

    if (!actions || actions.length === 0) {
      return { success: false, message: 'No actions to replay' };
    }

    // Optimize actions for faster replay
    const optimizedActions = this.optimizeActions(actions);
    console.log(`[Replayer] Optimized ${actions.length} actions to ${optimizedActions.length} actions`);
    console.log(`[Replayer] Replaying at ${this.replaySpeed} speed`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < optimizedActions.length; i++) {
      const action = optimizedActions[i];
      const label = action.optimized ?
        `${action.type} ${action.selector} (${action.originalCount} keystrokes)` :
        `${action.type} ${action.selector || ''}`;

      console.log(`[Replayer] Action ${i + 1}/${optimizedActions.length}:`, label);

      try {
        await this.executeAction(action);
        successCount++;
      } catch (error) {
        console.error(`[Replayer] Error on action ${i + 1}:`, error.message);
        errorCount++;
        // Continue with next action
      }

      // Use different delays for input vs other actions
      const delayType = action.type === 'input' ? 'input' : 'action';
      await this.page.waitForTimeout(this.getDelay(delayType));
    }

    return {
      success: true,
      message: `Replay completed: ${successCount} successful, ${errorCount} failed`,
      successCount,
      errorCount,
      totalActions: optimizedActions.length,
      originalActions: actions.length
    };
  }

  /**
   * Execute a single action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'navigate':
        if (action.url) {
          await this.page.goto(action.url, { waitUntil: 'domcontentloaded' });
          console.log('[Replayer] ✓ Navigated to:', action.url);
        }
        break;

      case 'click':
        if (action.selector) {
          await this.highlightElement(action.selector);
          await this.page.waitForTimeout(this.getDelay('highlight'));
          await this.page.locator(action.selector).click();
          await this.removeHighlight(action.selector);
          console.log('[Replayer] ✓ Clicked:', action.selector);
        }
        break;

      case 'input':
        if (action.selector && action.value !== undefined) {
          await this.highlightElement(action.selector);
          // Shorter highlight for input - just visual feedback
          await this.page.waitForTimeout(Math.min(this.getDelay('highlight'), 150));
          await this.page.locator(action.selector).fill(action.value);
          await this.removeHighlight(action.selector);
          const displayValue = action.value.length > 30 ? action.value.substring(0, 30) + '...' : action.value;
          console.log('[Replayer] ✓ Filled:', action.selector, 'with:', displayValue);
        }
        break;

      case 'keypress':
        if (action.key && action.selector) {
          await this.highlightElement(action.selector);
          await this.page.waitForTimeout(this.getDelay('highlight'));
          await this.page.locator(action.selector).press(action.key);
          await this.removeHighlight(action.selector);
          console.log('[Replayer] ✓ Pressed:', action.key);
        }
        break;

      case 'scroll':
        if (action.scrollX !== undefined && action.scrollY !== undefined) {
          await this.page.evaluate(({ x, y }) => {
            window.scrollTo(x, y);
          }, { x: action.scrollX, y: action.scrollY });
          console.log('[Replayer] ✓ Scrolled to:', action.scrollX, action.scrollY);
        }
        break;

      default:
        console.log('[Replayer] ⊘ Skipped unknown action type:', action.type);
    }
  }

  /**
   * Highlight element with yellow border
   */
  async highlightElement(selector) {
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();

      if (count > 0) {
        await locator.first().evaluate((element) => {
          element.setAttribute('data-testmug-highlight', 'true');
          element.style.outline = '3px solid #fbbf24';
          element.style.outlineOffset = '2px';
          element.style.transition = 'outline 0.3s ease';
          element.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.5)';
        });
      }
    } catch (error) {
      console.warn('[Replayer] Could not highlight:', selector, error.message);
    }
  }

  /**
   * Remove highlight from element
   */
  async removeHighlight(selector) {
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();

      if (count > 0) {
        await locator.first().evaluate((element) => {
          if (element.getAttribute('data-testmug-highlight')) {
            element.removeAttribute('data-testmug-highlight');
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.style.transition = '';
            element.style.boxShadow = '';
          }
        });
      }
    } catch (error) {
      // Ignore errors when removing highlight
    }
  }
}

module.exports = Replayer;
