# Testmug

**AI-Powered Test Case Generation & Execution for Manual Testers**

> Desktop-Native Application | No live URL - Available for demo at the desk

---

## Demo Video

[![Testmug Demo](https://img.youtube.com/vi/oXO3ZW489Zw/0.jpg)](https://youtu.be/oXO3ZW489Zw)

[Watch Full Demo](https://youtu.be/oXO3ZW489Zw)

---

## The Problem

Manual testers waste 90% of their time writing test cases instead of actually testing.

- Enterprises spend $20-30B annually on manual testing (56% of all testing spend)
- Current automation tools require coding skills
- Nobody solved test design labor - only execution speed

Example: Testing a login flow requires writing 50+ test cases covering positive, negative, and edge scenarios. This takes hours of repetitive documentation work.

---

## Our Solution

**Testmug = Record Once → AI Generates Test Cases → Auto-Execute → Get Reports**

A desktop application that lets manual testers (no coding required) generate comprehensive test suites from recorded user flows, reducing test creation time by 90%.

### How It Works

```
Record one happy path flow (2 min)
         ↓
AI generates 10-50 test cases (1 min)
         ↓
Edit in Excel if needed (optional)
         ↓
Run all tests in parallel (5 min)
         ↓
Get Excel + Word reports with screenshots
```

---

## Current Features

- Visual Recording - Click, type, navigate in embedded browser
- AI Test Generation - GPT-4/Groq generates 10+ test cases with edge cases
- Smart Execution - Playwright runs tests in parallel with self-healing selectors
- Professional Reports - Excel with results + Word with screenshots
- Chat Interface - Natural language commands ("run tests", "open report")
- Flow Analysis - AI identifies reusable test flows
- Session Management - Track, replay, and manage test sessions

---

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite
**Desktop:** Electron + BrowserView (embedded Chromium)
**AI & Testing:** OpenAI GPT-4 / Groq API + Playwright
**File Generation:** ExcelJS + docx
**Storage:** Local file system + SQLite

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/ktvoilacode/testmug.git
cd testmug

# Install dependencies
npm install

# Set up API key
cp .env.example .env
# Add your GROQ_API_KEY or OPENAI_API_KEY

# Run
npm run dev
```

### Usage

1. Launch Testmug (desktop app opens)
2. Enter website URL
3. Click "Record" and perform actions
4. Stop recording
5. Click "Generate Tests" (AI creates test suite)
6. Review Excel file
7. Click "Run Tests" (parallel execution)
8. View reports with screenshots

---

## Why Desktop-Native?

- No browser extension permissions needed
- Full control over embedded browser
- Native file system access (Excel, screenshots)
- Works offline (after recordings)
- No data leaves user's machine (privacy)

Note: This is a desktop application, not a web app. No live URL available - visit our demo desk to see it in action.

---

## Team

**Krishna Teja** - Solo Developer
GitHub: [@ktvoilacode](https://github.com/ktvoilacode)

---

## License

MIT License - See LICENSE file for details

---

**Built for Buildathon 2025**
