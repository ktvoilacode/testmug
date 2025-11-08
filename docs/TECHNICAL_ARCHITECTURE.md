# Testmug - Technical Architecture
## MVP Implementation Guide

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Electron Main Process                   │
│  ┌─────────────┬──────────────┬─────────────────────┐  │
│  │  Recorder   │  AI Engine   │  Playwright Runner  │  │
│  │  Module     │  Module      │  Module             │  │
│  └─────────────┴──────────────┴─────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Reporter Module (Excel/Word)            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ IPC
┌─────────────────────────────────────────────────────────┐
│              Electron Renderer Process                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React Frontend (TypeScript)            │  │
│  │  • Control Panel    • Browser View Wrapper      │  │
│  │  • Status Display   • Modal Dialogs             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│        Electron BrowserView (Embedded Chromium)          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          User's Website Under Test               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Data Models

### 2.1 Recording Data Structure

```typescript
interface RecordingSession {
  id: string;                    // UUID
  type: 'positive' | 'negative' | 'edge';
  url: string;                   // Starting URL
  timestamp: string;             // ISO date
  actions: Action[];
}

interface Action {
  type: 'click' | 'input' | 'select' | 'navigate' | 'keypress';
  timestamp: number;
  selector: string;              // CSS selector
  alternativeSelectors: {        // Fallback selectors
    id?: string;
    name?: string;
    'data-testid'?: string;
    ariaLabel?: string;
    xpath?: string;
  };
  value?: string;                // For inputs
  element: {
    tag: string;
    text?: string;
    attributes: Record<string, string>;
  };
}
```

### 2.2 AI-Generated Test Case Structure

```typescript
interface TestCase {
  testCaseId: string;            // TC001, TC002, etc.
  type: 'positive' | 'negative' | 'edge' | 'regression';
  description: string;           // Brief description
  steps: TestStep[];
  testData: Record<string, any>; // Input values
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
}

interface TestStep {
  stepNumber: number;
  action: string;                // Human-readable description
  selector: string;              // Element selector
  value?: string;                // Input value
  assertion?: string;            // Expected outcome
}
```

### 2.3 Test Execution Result

```typescript
interface TestResult {
  testCaseId: string;
  status: 'pass' | 'fail' | 'skip';
  executionTime: number;         // milliseconds
  startTime: string;             // ISO timestamp
  endTime: string;
  screenshots: string[];         // File paths
  errorMessage?: string;
  stackTrace?: string;
}
```

---

## 3. Module Specifications

### 3.1 Recorder Module (`electron/recorder.js`)

**Responsibilities:**
- Inject JavaScript into embedded browser to capture events
- Listen for DOM events (click, input, change, submit, navigate)
- Generate multiple selector strategies per element
- Store recordings as JSON files

**Key Functions:**
```javascript
async function startRecording(type: 'positive' | 'negative' | 'edge')
async function stopRecording(): RecordingSession
async function injectRecordingScript()
function generateSelectors(element: HTMLElement): Selectors
function saveRecording(session: RecordingSession): string // Returns file path
```

**Event Capture Strategy:**
- **Click events**: `document.addEventListener('click', handler, true)`
- **Input events**: `input`, `change`, `paste`
- **Navigation**: `window.addEventListener('popstate')`
- **Selector priority**: id > data-testid > name > aria-label > xpath

---

### 3.2 AI Generator Module (`electron/ai-generator.js`)

**Responsibilities:**
- Read recorded JSON files (positive/negative/edge)
- Construct AI prompt with context
- Call OpenAI/Mistral API
- Parse AI response into structured test cases
- Generate Excel file with test cases

**Key Functions:**
```javascript
async function generateTestCases(recordings: RecordingSession[]): TestCase[]
function buildAIPrompt(recordings: RecordingSession[]): string
async function callAI(prompt: string): string
function parseAIResponse(response: string): TestCase[]
async function createExcelFile(testCases: TestCase[]): string // Returns file path
```

**AI Prompt Template:**
```
You are a QA automation expert. Analyze these recorded test flows:

POSITIVE TEST:
[JSON of positive recording]

NEGATIVE TEST (optional):
[JSON of negative recording]

EDGE CASE (optional):
[JSON of edge case recording]

Generate 20 comprehensive test cases covering:
1. Valid scenarios (5 variations)
2. Invalid inputs (5 scenarios)
3. Boundary values (5 scenarios)
4. Error handling (5 scenarios)

Output as JSON array with this structure:
{
  "testCaseId": "TC001",
  "type": "positive|negative|edge|regression",
  "description": "Test login with valid credentials",
  "steps": [
    {"stepNumber": 1, "action": "Navigate to login page", "selector": "#login"},
    {"stepNumber": 2, "action": "Enter username", "selector": "#username", "value": "testuser"}
  ],
  "testData": {"username": "testuser", "password": "Test@123"},
  "expectedResult": "User successfully logged in",
  "priority": "high"
}
```

---

### 3.3 Playwright Runner Module (`electron/playwright-runner.js`)

**Responsibilities:**
- Parse Excel file to extract test cases
- Execute tests in parallel (configurable concurrency)
- Capture screenshots at each step
- Handle errors gracefully
- Return execution results

**Key Functions:**
```javascript
async function runTestsFromExcel(excelPath: string, concurrency: number): TestResult[]
async function executeTestCase(testCase: TestCase, browser: Browser): TestResult
async function takeScreenshot(page: Page, testCaseId: string, stepNumber: number): string
function parseExcelToTestCases(excelPath: string): TestCase[]
```

**Execution Flow:**
```javascript
// Parallel execution with Playwright
const browser = await chromium.launch({ headless: false });
const contexts = await Promise.all(
  Array(concurrency).fill(null).map(() => browser.newContext())
);

// Execute tests in batches
const results = await Promise.all(
  testCases.map((tc, index) =>
    executeTestCase(tc, contexts[index % concurrency])
  )
);
```

---

### 3.4 Reporter Module (`electron/reporter.js`)

**Responsibilities:**
- Update Excel file with test results
- Generate Word report with screenshots
- Format reports professionally
- Save reports to project directory

**Key Functions:**
```javascript
async function updateExcelWithResults(excelPath: string, results: TestResult[]): string
async function generateWordReport(results: TestResult[], screenshots: string[]): string
function calculateSummaryStats(results: TestResult[]): Statistics
function embedScreenshotsInWord(doc: Document, screenshots: string[])
```

**Excel Update Logic:**
```javascript
// Add new columns: Status, Execution Time, Error Message, Screenshot Path
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets['Test Cases'];
results.forEach((result, index) => {
  sheet[`F${index + 2}`] = { v: result.status.toUpperCase() };
  sheet[`G${index + 2}`] = { v: result.executionTime };
  sheet[`H${index + 2}`] = { v: result.errorMessage || 'N/A' };
  sheet[`I${index + 2}`] = { v: result.screenshots.join(', ') };
});
xlsx.writeFile(workbook, excelPath);
```

**Word Report Structure:**
```
1. Executive Summary
   - Total tests: 20
   - Passed: 18 (90%)
   - Failed: 2 (10%)
   - Execution time: 5m 30s

2. Test Results
   [For each test case]
   - Test Case ID: TC001
   - Description: Login with valid credentials
   - Status: PASS
   - Execution Time: 15s
   - Screenshots: [embedded images]

3. Failed Tests Details
   [Only failed tests with full error messages and screenshots]

4. Appendix
   - Execution environment
   - Browser version
   - Timestamp
```

---

## 4. IPC Communication

### 4.1 Main → Renderer Events

```typescript
// Status updates
mainWindow.webContents.send('recording-started', { type: 'positive' });
mainWindow.webContents.send('recording-stopped', { actionCount: 45 });
mainWindow.webContents.send('test-generation-progress', { current: 5, total: 20 });
mainWindow.webContents.send('test-execution-progress', { testCaseId: 'TC005', status: 'running' });
```

### 4.2 Renderer → Main Handlers

```typescript
// Recording
ipcMain.handle('start-recording', async (event, type: string) => { ... });
ipcMain.handle('stop-recording', async () => { ... });
ipcMain.handle('get-recordings', async () => { ... });

// AI Generation
ipcMain.handle('generate-test-cases', async (event, recordingIds: string[]) => { ... });

// Execution
ipcMain.handle('run-tests', async (event, excelPath: string, concurrency: number) => { ... });

// Reports
ipcMain.handle('open-excel', async (event, filePath: string) => { ... });
ipcMain.handle('open-word', async (event, filePath: string) => { ... });

// Browser
ipcMain.handle('navigate', async (event, url: string) => { ... });
ipcMain.handle('get-page-title', async () => { ... });
```

---

## 5. File System Structure

```
/testmug/
├── recordings/                  # JSON recording files
│   ├── positive_2025-11-08_14-30-00.json
│   ├── negative_2025-11-08_14-35-00.json
│   └── edge_2025-11-08_14-40-00.json
├── test-cases/                  # AI-generated Excel files
│   └── test-suite_2025-11-08.xlsx
├── results/                     # Test execution results
│   ├── screenshots/
│   │   ├── TC001_step1.png
│   │   └── TC001_step2.png
│   ├── test-results_2025-11-08.xlsx
│   └── test-report_2025-11-08.docx
└── config/
    └── settings.json            # App settings (AI API keys, etc.)
```

---

## 6. Error Handling Strategy

### 6.1 Recording Errors
- Browser not loaded → Show error, disable recording
- Element not found → Capture by position as fallback
- Multiple selectors → Store all for self-healing

### 6.2 AI Generation Errors
- API timeout → Retry 3 times with exponential backoff
- Invalid response → Use fallback template-based generation
- Rate limit → Queue requests, show progress

### 6.3 Execution Errors
- Element not found → Try alternative selectors
- Timeout → Mark as failed, continue with other tests
- Browser crash → Restart browser, retry test

### 6.4 Reporting Errors
- Excel locked → Save with timestamp suffix
- Screenshot missing → Use placeholder image
- Word generation fails → Fall back to Excel-only

---

## 7. Performance Targets

- **Recording**: <2% browser performance overhead
- **AI Generation**: <2 minutes for 20 test cases
- **Parallel Execution**: 5 concurrent tests, 20 tests in <5 minutes
- **Report Generation**: <30 seconds for Excel + Word

---

## 8. Security Considerations

- **API Keys**: Store encrypted in OS keychain (electron-store)
- **User Data**: All local, no cloud upload
- **Browser Isolation**: Separate BrowserView, no access to main app
- **File Permissions**: Sandboxed file access

---

**This architecture provides a solid foundation for the 48-hour buildathon MVP while being extensible for future enhancements.**
