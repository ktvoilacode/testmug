# Technical Architecture

## System Overview

Testmug is an Electron-based desktop application that combines visual recording, AI test generation, and automated test execution.

## Core Components

### 1. Frontend (React + TypeScript)
- **UI Components**: Top bar navigation, embedded browser, chat panel, history panel
- **State Management**: React hooks for session management, test progress, chat messages
- **Styling**: CSS with clean, minimal design

### 2. Electron Main Process
- **BrowserView**: Embedded Chromium for recording user interactions
- **IPC Handlers**: Communication between renderer and main process
- **Window Management**: Main window, browser view positioning

### 3. Recording Engine
- **Event Capture**: Clicks, inputs, navigation events
- **Selector Generation**: Multi-selector strategy (ID, data-testid, aria-label, XPath)
- **Session Storage**: SQLite-based storage for recordings

### 4. AI Test Generator
- **Provider Support**: OpenAI GPT-4 / Groq API
- **Test Case Generation**: Generates 10-50 test cases from recorded flows
- **Flow Analysis**: Identifies reusable test patterns

### 5. Test Execution (Playwright)
- **Parallel Execution**: Runs multiple tests concurrently
- **Self-Healing Selectors**: Tries alternative selectors if primary fails
- **Screenshot Capture**: Evidence for each test step

### 6. Report Generator
- **Excel Reports**: Test results with pass/fail status
- **Word Reports**: Detailed reports with screenshots
- **File Management**: Local storage in results/ directory

## Data Flow

```
User Action → Recording Engine → Session Storage
                                        ↓
                              AI Test Generator
                                        ↓
                              Playwright Executor
                                        ↓
                              Report Generator → Excel/Word
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Desktop**: Electron, BrowserView
- **AI**: OpenAI GPT-4, Groq API
- **Testing**: Playwright
- **File Generation**: ExcelJS, docx
- **Storage**: SQLite, Local file system

---

For detailed implementation, see source code in `/electron` and `/src` directories.
