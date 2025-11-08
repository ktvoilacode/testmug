/**
 * Form Metadata Analyzer
 * Extracts form field information from recorded actions
 */

class FormMetadataAnalyzer {
  /**
   * Analyze recorded actions to extract form metadata
   * @param {Array} actions - Recorded actions from session
   * @returns {Object} Form metadata with detected fields and buttons
   */
  analyzeFormMetadata(actions) {
    console.log('[FormMetadataAnalyzer] Analyzing form metadata from actions...');

    const detectedFields = [];
    const buttons = [];
    const fieldMap = new Map(); // Track fields by selector

    actions.forEach((action, index) => {
      if (action.type === 'input') {
        const selector = action.selector;

        if (!fieldMap.has(selector)) {
          // New field detected
          const field = {
            selector: selector,
            type: this.detectFieldType(action),
            label: this.extractLabel(action),
            recordedValue: action.value,
            actionIndices: [index + 1] // 1-based index
          };
          fieldMap.set(selector, detectedFields.length);
          detectedFields.push(field);
        } else {
          // Update existing field
          const fieldIndex = fieldMap.get(selector);
          const field = detectedFields[fieldIndex];

          // Update to the last typed value
          field.recordedValue = action.value;
          field.actionIndices.push(index + 1);
        }
      } else if (action.type === 'click') {
        // Detect button clicks (submit buttons, login buttons, etc.)
        if (this.isButtonClick(action)) {
          buttons.push({
            selector: action.selector,
            text: action.text || 'Button',
            actionIndex: index + 1
          });
        }
      }
    });

    // Clean up fields - keep only final values
    detectedFields.forEach(field => {
      // Get the final value from the last action
      const lastActionIndex = field.actionIndices[field.actionIndices.length - 1];
      const lastAction = actions[lastActionIndex - 1];
      field.recordedValue = lastAction ? lastAction.value : field.recordedValue;
    });

    const metadata = {
      detectedFields,
      buttons,
      fieldCount: detectedFields.length,
      buttonCount: buttons.length
    };

    console.log(`[FormMetadataAnalyzer] Found ${metadata.fieldCount} fields and ${metadata.buttonCount} buttons`);
    console.log('[FormMetadataAnalyzer] Fields:', detectedFields.map(f => `${f.selector} (${f.type})`).join(', '));

    return metadata;
  }

  /**
   * Detect field type from action metadata
   */
  detectFieldType(action) {
    // Check if inputType is available
    if (action.inputType) {
      return action.inputType;
    }

    // Try to infer from selector
    const selector = action.selector.toLowerCase();

    if (selector.includes('password')) {
      return 'password';
    } else if (selector.includes('email')) {
      return 'email';
    } else if (selector.includes('phone') || selector.includes('tel')) {
      return 'tel';
    } else if (selector.includes('number') || selector.includes('age') || selector.includes('quantity')) {
      return 'number';
    } else if (selector.includes('date')) {
      return 'date';
    } else if (selector.includes('search')) {
      return 'search';
    } else if (selector.includes('url') || selector.includes('website')) {
      return 'url';
    }

    return 'text'; // Default
  }

  /**
   * Extract label from action metadata or selector
   */
  extractLabel(action) {
    // If we have a label from the page, use it
    if (action.label) {
      return action.label;
    }

    // Try to generate a label from selector
    const selector = action.selector;

    // Extract from ID: #user-name → "User Name"
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return this.humanize(id);
    }

    // Extract from name attribute: [name="user_name"] → "User Name"
    const nameMatch = selector.match(/\[name=["']([^"']+)["']\]/);
    if (nameMatch) {
      return this.humanize(nameMatch[1]);
    }

    // Extract from class: .user-name-input → "User Name"
    if (selector.startsWith('.')) {
      const className = selector.substring(1).replace(/-input|-field|-box/g, '');
      return this.humanize(className);
    }

    return 'Field'; // Default fallback
  }

  /**
   * Convert selector string to human-readable label
   */
  humanize(str) {
    return str
      .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if a click action is likely a button
   */
  isButtonClick(action) {
    const selector = action.selector.toLowerCase();
    const text = (action.text || '').toLowerCase();

    // Common button indicators
    const buttonKeywords = [
      'button', 'btn', 'submit', 'login', 'signin', 'signup', 'register',
      'search', 'send', 'next', 'continue', 'save', 'create', 'add', 'delete',
      'confirm', 'ok', 'yes', 'no', 'cancel', 'close'
    ];

    // Check selector
    if (buttonKeywords.some(keyword => selector.includes(keyword))) {
      return true;
    }

    // Check button text
    if (buttonKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }

    // Check if it's a form submission type click
    if (selector.includes('type=submit') || selector.includes('type="submit"')) {
      return true;
    }

    return false;
  }
}

module.exports = FormMetadataAnalyzer;
