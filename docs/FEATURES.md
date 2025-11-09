# Feature Documentation

## Core Features

### 1. Visual Recording
- Record user interactions in embedded browser
- Capture clicks, inputs, navigation
- Multi-selector generation for reliability

### 2. AI Test Generation
- Generate 10-50 test cases from one recording
- Supports OpenAI GPT-4 and Groq API
- Creates positive, negative, and edge case scenarios

### 3. Smart Test Execution
- Parallel test execution with Playwright
- Self-healing selectors
- Screenshot capture for evidence

### 4. Professional Reports
- Excel reports with test results
- Word reports with screenshots
- Stored locally in results/ directory

### 5. Chat Interface
- Natural language commands
- Supported commands:
  - "open excel" - Open test cases spreadsheet
  - "generate tests" - Generate test cases
  - "run tests" - Execute all tests
  - "replay" - Replay session
  - "open report" - View test report

### 6. Session Management
- Track all recorded sessions
- Replay sessions
- Delete sessions
- Flow analysis

## Recent Improvements

### UI/UX Enhancements
- Clean link-based action buttons
- Fixed test progress bar
- Context-aware actions (pre/post test execution)
- Cleaner chat interface

### Chat Commands
- Added "open report" command
- Smart command validation
- Helpful error messages

---

See `/docs/ARCHITECTURE.md` for technical implementation details.
