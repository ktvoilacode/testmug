# Testmug - Product Requirements Document (PRD)
## Buildathon MVP - Simplified Version

---

## 1. Product Vision

**Testmug** is a desktop-native AI testing tool that empowers manual testers to generate and execute comprehensive test suites from recorded user flows, reducing test creation time by 90%.

---

## 2. Core User Flow (MVP)

```
1. User records POSITIVE test case (happy path)
   ↓
2. User optionally records NEGATIVE test case
   ↓
3. User optionally records EDGE CASE
   ↓
4. AI generates 10-50 test cases in Excel
   ↓
5. User edits Excel if needed
   ↓
6. User clicks "Run Tests"
   ↓
7. Tests execute in parallel with Playwright
   ↓
8. Reports generated (Excel + Word) with screenshots
```

---

## 3. MVP Features (Buildathon Scope)

### 3.1 Recording Module
- **Embedded browser** view (Chromium via Electron)
- **Simple recording UI**:
  - "Record Positive" button → captures user actions
  - "Record Negative" button → captures failure scenario (optional)
  - "Record Edge Case" button → captures boundary scenario (optional)
- **Captured data**: DOM elements, clicks, inputs, selectors, navigation
- **Output**: JSON structure with actions and element details

### 3.2 AI Test Generation
- **Input**: Recorded positive/negative/edge case JSONs
- **AI Provider**: OpenAI GPT-4 or Mistral AI
- **Output**: Excel file with 10-50 test cases including:
  - Test Case ID
  - Test Description
  - Test Steps
  - Test Data (inputs)
  - Expected Result
  - Test Type (positive/negative/edge)

### 3.3 Test Execution
- **Input**: Excel file with test cases
- **Engine**: Playwright
- **Execution**: Parallel (3-5 threads)
- **Capture**: Screenshots at each step
- **Real-time view**: Show execution in embedded browser

### 3.4 Reporting
- **Excel Report**: Updated with Pass/Fail status, execution time, error messages
- **Word Report**: Professional summary with:
  - Test execution summary
  - Pass/fail statistics
  - Failed test details with screenshots
  - Execution timeline

---

## 4. User Interface (Minimal Layout)

```
┌─────────────────────────────────────────────────────────┐
│  Header: Project Name | Settings                        │
├─────────────────┬───────────────────────────────────────┤
│                 │                                       │
│  Control Panel  │   Embedded Browser View              │
│                 │                                       │
│  [Navigation]   │   ┌─────────────────────────────┐   │
│  URL: _______   │   │                             │   │
│  [Go]           │   │   Chrome Browser            │   │
│                 │   │   (Embedded Chromium)       │   │
│  [Record +]     │   │                             │   │
│  • Positive     │   │                             │   │
│  • Negative     │   │                             │   │
│  • Edge Case    │   └─────────────────────────────┘   │
│                 │                                       │
│  [Generate]     │   Status: Ready / Recording / Testing│
│  Test Cases     │                                       │
│                 │                                       │
│  [View Excel]   │                                       │
│  [Edit Excel]   │                                       │
│                 │                                       │
│  [Run Tests]    │                                       │
│                 │                                       │
│  [View Reports] │                                       │
│                 │                                       │
└─────────────────┴───────────────────────────────────────┘
```

---

## 5. Technical Requirements

### 5.1 Tech Stack
- **Desktop**: Electron 28+
- **Frontend**: React 18+ with TypeScript
- **Styling**: CSS (simple, clean)
- **Browser**: BrowserView (embedded Chromium)
- **Test Engine**: Playwright 1.40+
- **AI**: OpenAI API or Mistral AI
- **Excel**: exceljs library
- **Word**: docx library
- **Screenshots**: Playwright built-in

### 5.2 Data Flow
```
Recording → JSON actions → AI prompt → Test cases (Excel)
→ Playwright execution → Screenshots → Updated Excel + Word report
```

### 5.3 File Structure
```
/testmug/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge
│   ├── recorder.js          # Recording logic
│   ├── ai-generator.js      # AI test generation
│   ├── playwright-runner.js # Test execution
│   └── reporter.js          # Excel/Word generation
├── src/
│   ├── App.tsx              # Main UI
│   ├── components/
│   │   ├── BrowserView.tsx
│   │   ├── ControlPanel.tsx
│   │   └── StatusBar.tsx
│   └── styles/
│       └── App.css
├── package.json
└── vite.config.ts
```

---

## 6. MVP Success Criteria

✅ User can record a positive test case in < 2 minutes
✅ AI generates 10+ relevant test cases from recording
✅ Tests execute in parallel (3-5 concurrent)
✅ Excel report updates with pass/fail results
✅ Word report generates with screenshots
✅ Total flow (record → generate → execute → report) < 10 minutes

---

## 7. Out of Scope (Post-Buildathon)

❌ Video recording
❌ Advanced Excel editing UI
❌ Multi-project management
❌ Local LLM support
❌ CI/CD integration
❌ Team collaboration

---

## 8. Buildathon Timeline (48 Hours)

### Day 1 (Hours 0-24)
- **0-4h**: Project setup, Electron + React scaffold
- **5-8h**: Embedded browser view + navigation
- **9-12h**: Recording system (capture clicks, inputs, elements)
- **13-16h**: Save recordings as JSON
- **17-20h**: AI integration (OpenAI/Mistral)
- **21-24h**: Generate Excel with test cases

### Day 2 (Hours 25-48)
- **25-28h**: Excel parser for test execution
- **29-32h**: Playwright parallel execution
- **33-36h**: Screenshot capture + Excel update
- **37-40h**: Word report generation
- **41-44h**: UI polish + error handling
- **45-48h**: Testing, demo prep, packaging

---

**This PRD defines a laser-focused MVP that delivers core value: Record → AI Generate → Execute → Report**
