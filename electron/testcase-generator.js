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
   * @param {Object} mainWindow - Main window for sending progress updates
   * @returns {Array} Array of test case objects
   */
  async generateTestCases(session, flowAnalysis, mainWindow = null) {
    const startTime = Date.now();
    console.log('[TestCaseGenerator] ========================================');
    console.log('[TestCaseGenerator] Generating test cases...');
    console.log(`[TestCaseGenerator] Flows: ${flowAnalysis.flowCount}`);

    try {
      const allTestCases = [];
      let testIdCounter = 1;

      // Send initial progress
      if (mainWindow) {
        mainWindow.webContents.send('generation-progress', {
          total: flowAnalysis.flows.length,
          completed: 0,
          current: 'Starting generation...'
        });
      }

      // Generate test cases for each flow
      for (let i = 0; i < flowAnalysis.flows.length; i++) {
        const flow = flowAnalysis.flows[i];
        console.log(`[TestCaseGenerator] Processing flow ${i + 1}/${flowAnalysis.flows.length}: ${flow.name} (${flow.type})`);

        // Send progress update
        if (mainWindow) {
          mainWindow.webContents.send('generation-progress', {
            total: flowAnalysis.flows.length,
            completed: i,
            current: `Generating ${flow.name}...`
          });
        }

        const flowTestCases = await this.generateTestCasesForFlow(
          session,
          flow,
          testIdCounter
        );

        allTestCases.push(...flowTestCases);
        testIdCounter += flowTestCases.length;

        console.log(`[TestCaseGenerator]   Generated ${flowTestCases.length} test cases`);

        // Send completion for this flow with 1 second delay for smooth UI
        if (mainWindow) {
          mainWindow.webContents.send('generation-progress', {
            total: flowAnalysis.flows.length,
            completed: i + 1,
            current: `Generated ${flowTestCases.length} tests for ${flow.name}`
          });

          // 1 second delay for smooth UI updates (except for last flow)
          if (i < flowAnalysis.flows.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
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
            content: `You are a QA test automation expert. Generate test cases for the given flow.

⚠️ CRITICAL: READ THE FLOW TYPE CAREFULLY ⚠️

IF flow type is "positive":
  - Generate ONLY tests that use VALID data
  - ALL test cases should be designed to PASS/SUCCEED
  - Use valid usernames, valid passwords, valid emails
  - Do NOT include empty fields, invalid data, or error scenarios
  - Example: "student" / "Password123" should succeed

IF flow type is "negative":
  - Generate ONLY tests that use INVALID data
  - ALL test cases should be designed to FAIL/show errors
  - Use invalid usernames, wrong passwords, empty fields
  - Include SQL injection, XSS, special characters
  - Example: "baduser" / "wrong" should fail with error

RULES:
1. Generate 8-12 test cases per flow
2. Match field selectors EXACTLY from recorded actions
3. For "positive" flows → ALL tests use VALID data → ALL should PASS
4. For "negative" flows → ALL tests use INVALID data → ALL should FAIL
5. Do NOT mix positive and negative test cases in the same flow

Return ONLY valid JSON (no markdown, no explanations):
{
  "testCases": [
    {
      "name": "Test case name",
      "description": "What this test verifies",
      "priority": "High|Medium|Low",
      "testData": [
        {
          "field": "exact_selector",
          "value": "test_value",
          "expected": "expected_outcome"
        }
      ],
      "expectedResult": "Overall expected result"
    }
  ]
}`
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

    // Extract input fields with their recorded values as examples
    const inputFields = flowActions
      .filter(a => a.type === 'input')
      .map(a => `  - Field: "${a.selector}" | Example value: "${a.value}" | Type: ${a.inputType || 'text'}`)
      .join('\n');

    return `Generate test cases for this ${flow.type} flow:

FLOW INFORMATION:
- Name: ${flow.name}
- Type: ${flow.type} (${flow.type === 'positive' ? 'Tests should PASS with valid data' : 'Tests should FAIL with invalid data'})
- Description: ${flow.description}
- Start URL: ${session.startUrl}

RECORDED ACTIONS (use these EXACT selectors):
${actionSummary}

INPUT FIELDS DETECTED:
${inputFields || '  No input fields'}

ASSERTIONS TO VERIFY:
${assertionsSummary}

GENERATE 8-12 TEST CASES WITH:
${flow.type === 'positive'
  ? `POSITIVE TEST SCENARIOS (should all PASS):
  1. Happy path with valid data (use example values as reference)
  2. Alternate valid data combinations
  3. Boundary values (min/max lengths, valid edge cases)
  4. Different valid formats (if applicable)
  5. Valid special characters in appropriate fields

  NOTE: All these tests should succeed when executed!`
  : `NEGATIVE TEST SCENARIOS (should all FAIL/show errors):
  1. Empty required fields (one at a time)
  2. Invalid formats (wrong email, weak password, etc.)
  3. Boundary violations (too long, too short)
  4. Invalid characters and special symbols
  5. SQL injection attempts (if applicable)
  6. XSS attempts (if applicable)

  NOTE: All these tests should fail or show error messages when executed!`}

CRITICAL:
- Use the EXACT field selectors shown above (e.g., "${flowActions.find(a => a.type === 'input')?.selector || '#fieldName'}")
- Make test data realistic and appropriate for each field type
- For ${flow.type} flows, all tests should ${flow.type === 'positive' ? 'PASS' : 'FAIL'}
- Reference the example values to understand expected data format`;
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
