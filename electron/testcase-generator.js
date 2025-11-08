/**
 * AI Test Case Generator
 * Uses AI to generate comprehensive test cases from flow analysis
 */

const OpenAI = require('openai');

class TestCaseGenerator {
  constructor(apiKey, provider = 'groq') {
    this.provider = provider;
    this.modelMap = {
      'groq': 'llama-3.1-8b-instant',
      'grok': 'grok-beta',
      'openai': 'gpt-4o-mini'
    };

    if (provider === 'openai') {
      this.client = new OpenAI({ apiKey });
    } else if (provider === 'groq') {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
    } else if (provider === 'grok') {
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1'
      });
    }

    console.log(`[TestCaseGenerator] Initialized with ${provider} (${this.modelMap[provider]})`);
  }

  /**
   * Generate test cases for all flows
   * @param {Object} session - Session data
   * @param {Object} flowAnalysis - Flow analysis with detected flows
   * @returns {Array} Array of test case objects
   */
  async generateTestCases(session, flowAnalysis) {
    const startTime = Date.now();
    console.log('[TestCaseGenerator] ========================================');
    console.log('[TestCaseGenerator] Generating test cases...');
    console.log(`[TestCaseGenerator] Flows: ${flowAnalysis.flowCount}`);

    try {
      const allTestCases = [];
      let testIdCounter = 1;

      // Generate test cases for each flow
      for (const flow of flowAnalysis.flows) {
        console.log(`[TestCaseGenerator] Processing flow: ${flow.name} (${flow.type})`);

        const flowTestCases = await this.generateTestCasesForFlow(
          session,
          flow,
          testIdCounter
        );

        allTestCases.push(...flowTestCases);
        testIdCounter += flowTestCases.length;

        console.log(`[TestCaseGenerator]   Generated ${flowTestCases.length} test cases`);
      }

      const duration = Date.now() - startTime;
      console.log(`[TestCaseGenerator] ✅ Generated ${allTestCases.length} test cases in ${duration}ms`);
      console.log('[TestCaseGenerator] ========================================');

      return allTestCases;
    } catch (error) {
      console.error('[TestCaseGenerator] ❌ Error generating test cases:', error.message);
      return [];
    }
  }

  /**
   * Generate test cases for a specific flow
   */
  async generateTestCasesForFlow(session, flow, startId) {
    const prompt = this.buildTestCasePrompt(session, flow);
    const model = this.modelMap[this.provider];

    try {
      const response = await this.client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are a QA test automation expert. Generate comprehensive test cases for the given flow.

Requirements:
- Generate 8-12 test cases per flow
- Include positive, negative, and edge cases
- Provide test data variations
- Include expected results
- Prioritize test cases (High/Medium/Low)

Return ONLY valid JSON in this format:
{
  "testCases": [
    {
      "name": "Test case name",
      "description": "What this test verifies",
      "priority": "High|Medium|Low",
      "testData": [
        {"field": "username", "value": "testuser", "expected": "Login success"}
      ],
      "expectedResult": "Expected outcome"
    }
  ]
}

No markdown, no explanation, ONLY JSON.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);

      // Format test cases with IDs and flow info
      return result.testCases.map((tc, index) => ({
        id: `TC${String(startId + index).padStart(3, '0')}`,
        flowId: flow.flowId,
        flowName: flow.name,
        type: flow.type,
        name: tc.name,
        description: tc.description,
        priority: tc.priority || 'Medium',
        testData: tc.testData || [],
        expectedResult: tc.expectedResult,
        status: 'Not Run'
      }));
    } catch (error) {
      console.error(`[TestCaseGenerator] Error generating for flow ${flow.name}:`, error.message);

      // Return fallback test cases
      return this.generateFallbackTestCases(session, flow, startId);
    }
  }

  /**
   * Build AI prompt for test case generation
   */
  buildTestCasePrompt(session, flow) {
    // Extract actions for this flow
    const flowActions = flow.actionIndices
      .map(idx => session.actions[idx - 1])
      .filter(Boolean);

    // Build action summary
    const actionSummary = flowActions.map(action => {
      if (action.type === 'input') {
        return `${action.type}: ${action.selector} = "${action.value}"`;
      } else if (action.type === 'click') {
        return `${action.type}: ${action.selector}${action.text ? ` ("${action.text}")` : ''}`;
      } else {
        return `${action.type}: ${action.selector || action.url || ''}`;
      }
    }).join('\n');

    // Build assertions summary
    const assertionsSummary = flow.assertions && flow.assertions.length > 0
      ? flow.assertions.map(a => `- ${a.description}: ${a.selector}`).join('\n')
      : 'None';

    return `Generate test cases for this ${flow.type} flow:

FLOW NAME: ${flow.name}
FLOW TYPE: ${flow.type}
DESCRIPTION: ${flow.description}

START URL: ${session.startUrl}

ACTIONS PERFORMED:
${actionSummary}

ASSERTIONS:
${assertionsSummary}

Generate 8-12 diverse test cases covering:
${flow.type === 'positive'
  ? '- Happy path variations\n- Different valid data combinations\n- Boundary conditions\n- Edge cases with valid data'
  : '- Invalid input combinations\n- Missing required fields\n- Format errors\n- Boundary violations\n- Security tests (XSS, SQL injection patterns)'}

Each test case should have realistic test data based on the recorded actions.`;
  }

  /**
   * Generate fallback test cases if AI fails
   */
  generateFallbackTestCases(session, flow, startId) {
    console.log('[TestCaseGenerator] Using fallback test cases');

    const flowActions = flow.actionIndices
      .map(idx => session.actions[idx - 1])
      .filter(Boolean);

    // Find input fields
    const inputs = flowActions.filter(a => a.type === 'input');

    const testCases = [];

    if (flow.type === 'positive') {
      // Positive flow test cases
      testCases.push({
        id: `TC${String(startId).padStart(3, '0')}`,
        flowId: flow.flowId,
        flowName: flow.name,
        type: flow.type,
        name: `${flow.name} - Happy Path`,
        description: 'Verify successful flow with valid data',
        priority: 'High',
        testData: inputs.map(input => ({
          field: input.selector,
          value: input.value,
          expected: 'Success'
        })),
        expectedResult: flow.assertions?.[0]?.description || 'Flow completes successfully',
        status: 'Not Run'
      });

      testCases.push({
        id: `TC${String(startId + 1).padStart(3, '0')}`,
        flowId: flow.flowId,
        flowName: flow.name,
        type: flow.type,
        name: `${flow.name} - Alternate Valid Data`,
        description: 'Verify flow with different valid inputs',
        priority: 'Medium',
        testData: inputs.map(input => ({
          field: input.selector,
          value: `alternate_${input.value}`,
          expected: 'Success'
        })),
        expectedResult: 'Flow completes successfully with alternate data',
        status: 'Not Run'
      });
    } else {
      // Negative flow test cases
      testCases.push({
        id: `TC${String(startId).padStart(3, '0')}`,
        flowId: flow.flowId,
        flowName: flow.name,
        type: flow.type,
        name: `${flow.name} - Invalid Input`,
        description: 'Verify error handling with invalid data',
        priority: 'High',
        testData: inputs.map(input => ({
          field: input.selector,
          value: 'invalid_data',
          expected: 'Error shown'
        })),
        expectedResult: flow.assertions?.[0]?.description || 'Error message displayed',
        status: 'Not Run'
      });

      testCases.push({
        id: `TC${String(startId + 1).padStart(3, '0')}`,
        flowId: flow.flowId,
        flowName: flow.name,
        type: flow.type,
        name: `${flow.name} - Empty Fields`,
        description: 'Verify validation with empty inputs',
        priority: 'High',
        testData: inputs.map(input => ({
          field: input.selector,
          value: '',
          expected: 'Validation error'
        })),
        expectedResult: 'Validation error displayed',
        status: 'Not Run'
      });
    }

    return testCases;
  }
}

module.exports = TestCaseGenerator;
