# Testmug - Development Guide

## Project Structure

```
/testmug/
├── electron/              # Electron main process
│   ├── main.js           # Main Electron entry point
│   └── preload.js        # IPC bridge (secure communication)
├── src/                   # React frontend
│   ├── App.tsx           # Main React component
│   ├── App.css           # Styles
│   ├── main.tsx          # React entry point
│   └── vite-env.d.ts     # TypeScript definitions
├── index.html            # HTML entry point
├── package.json          # Dependencies
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env and add your OpenAI/Mistral API key
```

### Running in Development

```bash
# Start the app
npm run dev
```

This will:
1. Start Vite dev server on http://localhost:5173
2. Launch Electron app with hot reload

### Architecture

#### Layout
- **Left Panel (30%)**: Chat interface with controls
  - AI chatbot for natural language commands
  - URL navigation bar
  - Recording controls (Positive/Negative/Edge)

- **Right Panel (70%)**: Embedded browser (Electron BrowserView)
  - Native Chromium browser
  - Real-time interaction capture
  - Visual feedback during recording

#### IPC Communication

**Main Process → Renderer**
- Events sent via `mainWindow.webContents.send()`

**Renderer → Main Process**
- Commands via `window.electron.*` (exposed through preload.js)

Available IPC handlers:
- `navigate(url)` - Navigate browser view
- `getUrl()` - Get current URL
- `sendMessage(message)` - Send chat message to AI
- `startRecording(type)` - Start recording (positive/negative/edge)
- `stopRecording()` - Stop recording and get actions

## Current Features

### ✅ Implemented
- Electron + React + Vite setup
- Chat interface (left panel)
- Embedded browser view (right panel)
- URL navigation
- Recording buttons (UI only - backend TODO)
- Clean, simple UI with gradient header

### ⏳ TODO
- Recording logic (capture DOM events)
- AI integration (OpenAI/Mistral)
- Playwright test execution
- Excel generation
- Word report generation
- Screenshot capture

## Building for Production

```bash
# Build React app
npm run build

# Package Electron app
npm run package
```

Output: `release/` directory with platform-specific installers

## Tech Stack

- **Desktop**: Electron 28
- **Frontend**: React 18 + TypeScript
- **Build**: Vite 6
- **Styling**: Pure CSS (no framework)
- **Browser**: BrowserView (native Chromium)

## Development Tips

### Hot Reload
- React hot reload: Automatic via Vite
- Electron main process: Restart required (Ctrl+C and `npm run dev`)

### Debugging
- React DevTools: Available in Electron dev mode
- Console: Check both renderer and main process logs
- DevTools: Automatically opens in development

### BrowserView vs WebView
We use BrowserView instead of WebView because:
- Better performance (native integration)
- More control over positioning
- Direct access to Chrome DevTools Protocol (CDP)

## Next Steps

1. Implement DOM event capture in BrowserView
2. Integrate AI (OpenAI/Mistral) for chat
3. Add Playwright for test execution
4. Build Excel/Word generators
5. Add screenshot/video capture

---

**Happy Coding!** 🚀
