/**
 * Test Execution Engine
 * Runs test cases in headless browser and captures results with screenshots
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

class TestRunner {
  constructor(playwrightController, sessionStorage) {
    this.playwrightController = playwrightController;
    this.sessionStorage = sessionStorage;
    this.isRunning = false;
    this.currentProgress = {
      total: 0,
      completed: 0,
      passed: 0,
      failed: 0
    };
  }

  /**
   * Get current progress
   */
  getProgress() {
    return { ...this.currentProgress };
  }

  /**
   * Run all test cases for a session
   * @param {string} sessionId - Session ID
   * @param {Object} mainWindow - Main window for sending progress updates
   * @returns {Object} Test execution results
   */
  async runAllTests(sessionId, mainWindow) {
    if (this.isRunning) {
      return { success: false, message: 'Tests are already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('[TestRunner] ========================================');
    console.log('[TestRunner] Starting test execution for session:', sessionId);

    try {
      // Load session, flow analysis, and test cases
      const session = this.sessionStorage.loadSession(sessionId);
      const flowAnalysis = this.sessionStorage.loadFlowAnalysis(sessionId);
      const excelPath = path.join(this.sessionStorage.sessionsDir, `${sessionId}_testcases.xlsx`);

      if (!fs.existsSync(excelPath)) {
        throw new Error('Test cases Excel file not found');
      }

      // Load test cases from Excel
      const testCases = await this.loadTestCasesFromExcel(excelPath);

      this.currentProgress = {
        total: testCases.length,
        completed: 0,
        passed: 0,
        failed: 0
      };

      console.log(`[TestRunner] Loaded ${testCases.length} test cases`);

      // Create screenshots directory
      const screenshotsDir = path.join(this.sessionStorage.sessionsDir, `${sessionId}_screenshots`);
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      // Run tests in parallel batches using multiple headless browsers
      const concurrency = 5; // Run 5 tests in parallel
      const results = [];

      console.log(`[TestRunner] Running tests with concurrency: ${concurrency}`);

      for (let i = 0; i < testCases.length; i += concurrency) {
        const batch = testCases.slice(i, i + concurrency);

        // Run batch in parallel
        const batchResults = await Promise.all(
          batch.map(testCase => this.runSingleTestWithBrowser(testCase, session, flowAnalysis, screenshotsDir, mainWindow))
        );

        // Add results one by one with 1 second delay for smooth UI updates
        for (const result of batchResults) {
          results.push(result);

          // Update progress after each test
          this.currentProgress.completed = results.length;
          this.currentProgress.passed = results.filter(r => r.status === 'Pass').length;
          this.currentProgress.failed = results.filter(r => r.status === 'Fail').length;

          // Send progress update to renderer
          if (mainWindow) {
            mainWindow.webContents.send('test-progress', { ...this.currentProgress });
          }

          // 1 second delay for smooth UI updates (user can see each count)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`[TestRunner] Progress: ${this.currentProgress.completed}/${this.currentProgress.total} (${this.currentProgress.passed} passed, ${this.currentProgress.failed} failed)`);
      }

      // Update Excel with results
      const ExcelGenerator = require('./excel-generator');
      const excelGenerator = new ExcelGenerator();
      await excelGenerator.updateResults(excelPath, results);

      const duration = Date.now() - startTime;
      console.log(`[TestRunner] ✅ Test execution completed in ${duration}ms`);
      console.log(`[TestRunner] Results: ${this.currentProgress.passed}/${this.currentProgress.total} passed`);
      console.log('[TestRunner] ========================================');

      this.isRunning = false;

      return {
        success: true,
        total: this.currentProgress.total,
        passed: this.currentProgress.passed,
        failed: this.currentProgress.failed,
        duration,
        excelPath
      };
    } catch (error) {
      console.error('[TestRunner] ❌ Test execution failed:', error.message);
      this.isRunning = false;

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Run a single test with its own headless browser instance
   */
  async runSingleTestWithBrowser(testCase, session, flowAnalysis, screenshotsDir, mainWindow) {
    let browser = null;
    let context = null;
    let page = null;

    try {
      // Launch dedicated headless browser for this test
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
      });

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });

      page = await context.newPage();

      // Handle dialogs automatically (alerts, confirms, prompts)
      page.on('dialog', async dialog => {
        console.log(`[TestRunner] Dialog detected: ${dialog.type()} - "${dialog.message()}"`);

        // Auto-accept all dialogs during test execution
        // For confirm dialogs: accept (click OK/Yes)
        // For alert dialogs: dismiss
        // For prompt dialogs: accept with default value
        try {
          if (dialog.type() === 'prompt') {
            await dialog.accept(dialog.defaultValue() || '');
          } else {
            await dialog.accept();
          }
          console.log(`[TestRunner] Dialog accepted: ${dialog.type()}`);
        } catch (err) {
          console.error(`[TestRunner] Error handling dialog:`, err.message);
        }
      });

      // Run the test
      const result = await this.runSingleTestInPage(testCase, session, flowAnalysis, screenshotsDir, page);

      // Close browser
      await browser.close();

      return result;
    } catch (error) {
      console.error(`[TestRunner] Browser error for ${testCase.id}:`, error.message);

      // Close browser on error
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('[TestRunner] Error closing browser:', closeError.message);
        }
      }

      return {
        testId: testCase.id,
        status: 'Fail',
        duration: 0,
        screenshotPath: null,
        error: `Browser error: ${error.message}`
      };
    }
  }

  /**
   * Load test cases from Excel file
   */
  async loadTestCasesFromExcel(excelPath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const testCasesSheet = workbook.getWorksheet('Test Cases');
    const testDataSheet = workbook.getWorksheet('Test Data');

    const testCases = [];

    testCasesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Use column numbers: 1=ID, 2=Flow, 3=Type, 4=Name, 5=Description, 6=Priority, 7=Status
      const testId = row.getCell(1).value;
      if (!testId) return;

      // Load test data for this test case
      const testData = [];
      testDataSheet.eachRow((dataRow, dataRowNumber) => {
        if (dataRowNumber === 1) return; // Skip header
        // Column numbers: 1=Test ID, 2=Field, 3=Value, 4=Expected Result
        if (dataRow.getCell(1).value === testId) {
          testData.push({
            field: dataRow.getCell(2).value,
            value: dataRow.getCell(3).value,
            expected: dataRow.getCell(4).value
          });
        }
      });

      testCases.push({
        id: testId,
        flowName: row.getCell(2).value,
        type: row.getCell(3).value,
        name: row.getCell(4).value,
        description: row.getCell(5).value,
        priority: row.getCell(6).value,
        testData
      });
    });

    return testCases;
  }

  /**
   * Run a single test case in a specific page
   */
  async runSingleTestInPage(testCase, session, flowAnalysis, screenshotsDir, page) {
    const startTime = Date.now();
    console.log(`[TestRunner] Running ${testCase.id}: ${testCase.name}`);

    try {
      // Find the flow for this test case
      const flow = flowAnalysis.flows.find(f => f.name === testCase.flowName);
      if (!flow) {
        throw new Error(`Flow not found: ${testCase.flowName}`);
      }

      // Extract actions for this flow
      const flowActions = flow.actionIndices
        .map(idx => session.actions[idx - 1])
        .filter(Boolean);

      // Apply test data to actions
      const modifiedActions = this.applyTestData(flowActions, testCase.testData);

      // Navigate to start URL with timeout
      await page.goto(session.startUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000 // 10 second timeout
      });

      // Execute actions with the Replayer
      const Replayer = require('./replayer');
      const replayer = new Replayer(page);
      replayer.setSpeed('fastest'); // Use fastest speed for test execution

      // Set shorter timeouts for test execution
      page.setDefaultTimeout(5000); // 5 second timeout for locators

      const result = await replayer.replay(modifiedActions);

      // Capture screenshot
      const screenshotPath = path.join(screenshotsDir, `${testCase.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const duration = (Date.now() - startTime) / 1000;

      // Stricter pass criteria:
      // For positive tests: ALL actions must succeed
      // For negative tests: Some actions should fail (expecting errors)
      let status;
      if (testCase.type === 'positive') {
        // Positive tests must have all actions succeed
        status = result.errorCount === 0 ? 'Pass' : 'Fail';
      } else if (testCase.type === 'negative') {
        // Negative tests should have some failures (they're testing error cases)
        // Pass if errors occurred (expected behavior)
        status = result.errorCount > 0 ? 'Pass' : 'Fail';
      } else {
        // Default: require at least 80% success rate
        const successRate = result.successCount / result.totalActions;
        status = successRate >= 0.8 ? 'Pass' : 'Fail';
      }

      console.log(`[TestRunner]   ${status}: ${testCase.id} (${duration.toFixed(2)}s) - ${result.successCount}/${result.totalActions} actions`);

      return {
        testId: testCase.id,
        status,
        duration,
        screenshotPath,
        error: result.errorCount > 0 ? `${result.errorCount} actions failed` : null
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`[TestRunner]   Fail: ${testCase.id} (${duration.toFixed(2)}s) - ${error.message}`);

      // Try to capture screenshot even on error
      let screenshotPath = null;
      try {
        screenshotPath = path.join(screenshotsDir, `${testCase.id}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
      } catch (screenshotError) {
        console.log(`[TestRunner]   Could not capture screenshot: ${screenshotError.message}`);
      }

      return {
        testId: testCase.id,
        status: 'Fail',
        duration,
        screenshotPath,
        error: error.message
      };
    }
  }

  /**
   * Apply test data to actions
   */
  applyTestData(actions, testData) {
    if (!testData || testData.length === 0) {
      return actions;
    }

    // Create a copy of actions
    const modifiedActions = JSON.parse(JSON.stringify(actions));

    // Apply test data to input actions
    // IMPORTANT: Find the LAST input action for each field (final typed value)
    testData.forEach(data => {
      // Find indices of ALL input actions for this field
      const inputIndices = [];
      modifiedActions.forEach((action, index) => {
        if (action.type === 'input' && action.selector === data.field) {
          inputIndices.push(index);
        }
      });

      if (inputIndices.length > 0) {
        // Replace the value in the LAST input action (final value)
        const lastIndex = inputIndices[inputIndices.length - 1];
        modifiedActions[lastIndex].value = data.value;

        // Mark previous input actions for this field for removal
        // (to avoid typing intermediate values like 's', 'st', 'stu', etc.)
        for (let i = 0; i < inputIndices.length - 1; i++) {
          modifiedActions[inputIndices[i]]._remove = true;
        }
      }
    });

    // Remove marked actions
    return modifiedActions.filter(action => !action._remove);
  }
}

module.exports = TestRunner;
