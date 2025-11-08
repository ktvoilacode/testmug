/**
 * AI Flow Analyzer - Detect test flows and identify positive/negative cases
 */

const OpenAI = require('openai');

class FlowAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.provider = provider;
    this.modelMap = {
      'groq': 'llama-3.1-8b-instant',
      'grok': 'grok-beta',
      'openai': 'gpt-4o-mini'
    };

    console.log(`[FlowAnalyzer] Initializing with provider: ${provider}`);
    console.log(`[FlowAnalyzer] Model: ${this.modelMap[provider]}`);
    console.log(`[FlowAnalyzer] API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);

    if (provider === 'openai') {
      this.client = new OpenAI({ apiKey });
    } else if (provider === 'groq') {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
      console.log('[FlowAnalyzer] Using Groq (FREE tier) - https://api.groq.com');
    } else if (provider === 'grok') {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1'
      });
      console.log('[FlowAnalyzer] Using Grok (xAI) - https://api.x.ai');
    }
  }

  /**
   * Analyze a recorded session to detect test flows
   * @param {Object} session - Session object with actions and assertions
   * @returns {Object} Analysis result with detected flows
   */
  async analyzeSession(session) {
    const startTime = Date.now();
    const model = this.modelMap[this.provider] || 'gpt-4o-mini';

    console.log(`[FlowAnalyzer] ========================================`);
    console.log(`[FlowAnalyzer] Starting analysis with ${this.provider} (${model})`);
    console.log(`[FlowAnalyzer] Session: ${session.id}`);
    console.log(`[FlowAnalyzer] Actions: ${session.actions.length}, Assertions: ${session.assertions?.length || 0}`);

    try {
      const prompt = this.buildAnalysisPrompt(session);

      console.log(`[FlowAnalyzer] Sending request to ${this.provider}...`);
      const response = await this.client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are a QA test automation expert. Analyze recorded user interactions and identify:
1. Distinct test flows (positive/negative test cases)
2. Success/failure indicators (assertions)
3. Test scenario descriptions
4. Which actions belong to which flow
5. Which user-added assertions belong to which flow (based on timestamps)

Return ONLY valid JSON, no markdown, no explanation.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const duration = Date.now() - startTime;
      const analysis = JSON.parse(response.choices[0].message.content);

      console.log(`[FlowAnalyzer] ✅ Analysis complete in ${duration}ms`);
      console.log(`[FlowAnalyzer] Provider: ${this.provider} | Model: ${model}`);
      console.log(`[FlowAnalyzer] Detected ${analysis.flowCount || 0} flow(s)`);

      if (analysis.flows) {
        analysis.flows.forEach((flow, idx) => {
          console.log(`[FlowAnalyzer]   Flow ${idx + 1}: ${flow.name} (${flow.type})`);
        });
      }

      console.log(`[FlowAnalyzer] ========================================`);

      return {
        success: true,
        provider: this.provider,
        model: model,
        duration: duration,
        ...analysis
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[FlowAnalyzer] ❌ Analysis failed after ${duration}ms`);
      console.error(`[FlowAnalyzer] Provider: ${this.provider} | Model: ${model}`);
      console.error(`[FlowAnalyzer] Error: ${error.message}`);
      console.log(`[FlowAnalyzer] ========================================`);

      return {
        success: false,
        provider: this.provider,
        model: model,
        error: error.message,
        flows: []
      };
    }
  }

  /**
   * Build analysis prompt from session data
   */
  buildAnalysisPrompt(session) {
    const actions = session.actions.map((action, idx) => {
      return {
        step: idx + 1,
        type: action.type,
        selector: action.selector,
        value: action.value,
        text: action.text,
        url: action.url,
        tagName: action.tagName,
        timestamp: action.timestamp
      };
    });

    // Include user-added assertions if available
    const userAssertions = session.assertions || [];
    const assertionsInfo = userAssertions.map((assertion, idx) => {
      return {
        assertionId: idx + 1,
        type: assertion.type,
        description: assertion.description,
        selector: assertion.selector,
        text: assertion.text || assertion.elementData?.text,
        timestamp: assertion.timestamp
      };
    });

    return `Analyze this recorded user session and identify distinct test flows.

START URL: ${session.startUrl || session.metadata?.startUrl || 'unknown'}
DURATION: ${Math.round(session.duration / 1000)}s
TOTAL ACTIONS: ${session.actions.length}
USER ASSERTIONS: ${userAssertions.length}

RECORDED ACTIONS:
${JSON.stringify(actions, null, 2)}

USER-ADDED ASSERTIONS (added via right-click during recording):
${userAssertions.length > 0 ? JSON.stringify(assertionsInfo, null, 2) : 'None'}

Identify:
1. How many distinct END-TO-END test flows are present
   - Each flow should be a complete workflow (e.g., "Login → Fill CRM Form → Logout")
   - Don't split Login/Logout into separate flows unless they occur in isolation
2. For each flow, determine if it's POSITIVE (happy path) or NEGATIVE (error case)
3. Identify assertion points (elements to check for success/failure)
4. Which action steps belong to which flow (keep Login→Actions→Logout together)

Return JSON in this exact format:
{
  "flowCount": <number>,
  "flows": [
    {
      "flowId": "flow_1",
      "name": "<descriptive name like 'Successful Login' or 'Invalid Credentials'>",
      "type": "positive" | "negative",
      "description": "<what this flow tests>",
      "actionIndices": [<array of action step numbers that belong to this flow>],
      "userAssertionIds": [<array of user assertion IDs that belong to this flow, based on timestamps>],
      "assertions": [
        {
          "selector": "<CSS selector to check>",
          "expectedCondition": "visible" | "contains_text" | "not_visible",
          "expectedValue": "<expected text or null>",
          "description": "<what this assertion verifies>",
          "source": "ai_suggested" | "user_added"
        }
      ],
      "startStep": <first action step>,
      "endStep": <last action step>
    }
  ],
  "suggestions": "<optional suggestions for improving test coverage>"
}

IMPORTANT:
1. FLOW DETECTION RULES:
   - Treat Login → Actions → Logout as ONE COMPLETE FLOW (keep together)
   - Only split into separate flows if the user performs the SAME workflow twice with different data
   - Example: "Login → Fill Form → Logout" (once) = 1 flow
   - Example: "Login → Fill Form → Logout" (twice with different data) = 2 flows
   - Login/Logout should NOT be separate flows unless performed in isolation

2. FLOW GROUPING STRATEGY:
   - If you see: Login → Multiple Actions → Logout = Single "End-to-End" flow
   - If you see: Login → Logout → Login → Logout = Two separate flows
   - The key is whether it's ONE continuous workflow or MULTIPLE iterations

3. Map user-added assertions to flows based on their timestamps - if an assertion was added during a specific flow's time window, include its ID in "userAssertionIds" for that flow.

4. Include user assertions in the "assertions" array with source: "user_added".`;
  }

  /**
   * Quick analysis - just detect if positive/negative without full flow breakdown
   */
  async quickAnalyze(session) {
    try {
      const prompt = `Quickly analyze this test recording and determine:
1. Is this a POSITIVE test (happy path - things work correctly)?
2. Is this a NEGATIVE test (error case - testing failures)?
3. Or does it contain BOTH positive and negative flows?

START URL: ${session.startUrl || session.metadata?.startUrl}
ACTIONS: ${session.actions.length}
ACTION SUMMARY: ${this.summarizeActions(session.actions)}

Return ONLY this JSON format:
{
  "testType": "positive" | "negative" | "mixed",
  "confidence": <0-100>,
  "reasoning": "<brief explanation>"
}`;

      const modelMap = {
        'groq': 'llama-3.1-8b-instant',
        'grok': 'grok-beta',
        'openai': 'gpt-4o-mini'
      };

      const response = await this.client.chat.completions.create({
        model: modelMap[this.provider] || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a QA expert. Analyze test recordings and classify them.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('[FlowAnalyzer] Quick analysis failed:', error);
      return { testType: 'unknown', confidence: 0, reasoning: error.message };
    }
  }

  /**
   * Summarize actions for quick analysis
   */
  summarizeActions(actions) {
    const summary = [];
    actions.forEach((action, idx) => {
      if (action.type === 'click') {
        summary.push(`Step ${idx + 1}: Click ${action.selector || action.text || 'element'}`);
      } else if (action.type === 'input') {
        summary.push(`Step ${idx + 1}: Type "${action.value}" into ${action.selector}`);
      } else if (action.type === 'keypress') {
        summary.push(`Step ${idx + 1}: Press ${action.key}`);
      } else if (action.type === 'navigate') {
        summary.push(`Step ${idx + 1}: Navigate to ${action.url}`);
      }
    });
    return summary.slice(0, 10).join('\n'); // First 10 actions
  }
}

module.exports = FlowAnalyzer;
