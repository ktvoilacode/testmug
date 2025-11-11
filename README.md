# Testmug

**AI Superpowers for Manual Testers: 10x Faster, 90% Less Effort**

> **Note**: This is a desktop-native application with no live web URL. Watch the video below for a quick product overview, then visit my demo desk for a live walkthrough!

---

## Demo Video

[![Testmug Demo](https://img.youtube.com/vi/oXO3ZW489Zw/maxresdefault.jpg)](https://youtu.be/oXO3ZW489Zw)

**[▶️ Watch Full Demo on YouTube](https://youtu.be/oXO3ZW489Zw)**

---

## Problem Statement

Every testing tool today is code-driven automation—built for developers, not manual testers. Manual QA teams (56% of $50B testing market) waste 90% of their time writing repetitive test documentation instead of actually testing. One login flow = 50+ test cases = hours of manual work. Existing tools automate test execution, but nobody automates test design creation.

## Solution

**Testmug = Record Once → AI Generates 50 Tests → Auto-Execute → Get Reports**

Desktop application that reduces test creation time by 90% using AI to generate comprehensive test suites from recorded user flows. No coding required.

**Flow:**

```
Record happy path (2 min) → AI generates tests (1 min) → Edit Excel (optional)
→ Run in parallel (5 min) → Excel reports with screenshots
```

**Key Features:** Visual recording, AI test generation (GPT-4/Groq), Playwright execution, Excel/Word reports, chat interface, session management

---

## Users & Context

**Who:** Manual QA testers at mid-market to enterprise companies (no coding background)

**Pain:** Spending weeks creating test documentation for every feature release, limited test coverage due to time constraints

**Use Case:** Record one positive login flow → AI generates 50 comprehensive test cases (positive, negative, edge cases) in minutes → Execute in parallel → Get professional reports

---

## Setup & Run

### Development Mode

```bash
git clone https://github.com/ktvoilacode/testmug.git
cd testmug
npm install
npm run dev
```

**Initial Setup:**
1. Launch the app (opens at http://localhost:5173)
2. Go to **Settings** tab (right panel)
3. Select LLM provider (Groq/OpenAI/Mistral/Grok)
4. Enter your API key
5. Click "Save Settings"

**Optional - Test Context:**
1. Go to **Context** tab
2. Add test generation context (credentials, scenarios, etc.)
3. Click "Save Context"

**Settings Location:**
- All settings are stored in `~/.testmug/settings.json`
- Persists across app restarts
- Includes: LLM provider, API key, test context

### Production Build

**Build for All Platforms (from macOS):**
```bash
# Install Wine (required for Windows builds on macOS)
brew install --cask wine-stable

# Build for all platforms at once
npm run electron:build:all

# Or build individually:
npm run electron:build:mac    # macOS only
npm run electron:build:win    # Windows only (requires Wine on macOS)
npm run electron:build:linux  # Linux only
```

**Build on Windows:**
```bash
# Clone and build on Windows machine
git clone https://github.com/ktvoilacode/testmug.git
cd testmug
npm install
npm run electron:build:win

# Requires: Node.js, Python, Visual Studio Build Tools
```

**Output Files:**
- **macOS**: `release/Testmug.dmg`
- **Windows**: `release/Testmug-portable.exe` (no installation)
- **Windows**: `release/Testmug-win.zip` (extract and run)
- **Linux**: `release/Testmug.AppImage`

**Usage:** Launch app → Configure settings → Enter URL → Record actions → Generate tests → Review Excel → Run tests → View reports

Note: Desktop app only—visit demo desk for live demonstration.

---

## Models & Data

**AI Models:**
- Groq (llama-3.1-8b-instant) - Free tier
- OpenAI (gpt-4o-mini)
- Mistral (mistral-small-latest)
- Grok (grok-beta)

Configured via Settings tab with fallback to template-based generation

**Data Sources:**
- DOM structure and user actions (local storage in `~/.testmug/`)
- AI-generated test scenarios (Excel files)
- Execution results with screenshots (local files)
- Settings & context stored in `~/.testmug/settings.json`

**Licenses:** MIT (Testmug, Electron, React, Playwright, ExcelJS, docx)

---

## Evaluation & Guardrails

**Quality Assurance:** Multi-selector strategy (ID, data-testid, aria-label, XPath) with self-healing fallback ensures test reliability

**Hallucination Mitigation:** AI receives actual DOM structure as context, template validation, manual Excel editing before execution, screenshot evidence proves actual behavior

**Performance:** <2% recording overhead, <2 min for 20 test cases, 5 concurrent tests, <30 sec report generation

---

## Known Limitations & Risks

**Limitations:** Chromium-only (no Firefox/Safari), may not capture complex interactions (drag-drop, canvas), AJAX-heavy SPAs may need manual waits

**Risks & Mitigation:**

- AI quality issues → Manual editing + prompt tuning
- Selector breakage → Multi-selector self-healing
- Low adoption → Freemium model + community-led growth

---

## Team

**Krishna Teja** - Solo Developer | GitHub: [@ktvoilacode](https://github.com/ktvoilacode)

---

**Built for Buildathon 2025** | MIT License
