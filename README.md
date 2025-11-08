# Testmug

**AI-Powered Testing Tool for Manual Testers**

Testmug is a desktop-native application that empowers manual testers to generate and execute comprehensive test suites from recorded user flows, reducing test creation time by 90%.

---

## 🎯 Vision

Record once → AI generates 50 test cases → Execute in parallel → Get professional reports

---

## ✨ Key Features (MVP)

- 🎥 **Simple Recording**: Capture positive, negative, and edge case flows
- 🤖 **AI Test Generation**: Generate 10-50 test cases automatically
- ⚡ **Parallel Execution**: Run tests concurrently with Playwright
- 📊 **Professional Reports**: Excel + Word reports with screenshots
- 🖥️ **Desktop Native**: 100% local execution, no cloud dependencies

---

## 🏗️ Architecture

```
Electron Desktop App
├── Embedded Browser (Chromium)
├── Recording Engine (DOM event capture)
├── AI Test Generator (OpenAI/Mistral)
├── Playwright Test Runner (parallel execution)
└── Report Generator (Excel/Word)
```

---

## 🛠️ Tech Stack

- **Desktop**: Electron 28+
- **Frontend**: React 18+ with TypeScript
- **Test Engine**: Playwright 1.40+
- **AI**: OpenAI GPT-4 / Mistral AI
- **Reporting**: ExcelJS, docx
- **Build**: Vite

---

## 📋 User Flow

1. **Record** positive test case (happy path)
2. **Optional**: Record negative test case
3. **Optional**: Record edge case
4. **AI generates** 10-50 test cases in Excel
5. **Edit** Excel if needed
6. **Run tests** in parallel
7. **Get reports** (Excel + Word) with screenshots

---

## 📁 Project Structure

```
/testmug/
├── docs/                    # Documentation
│   ├── BRD.md              # Business requirements
│   ├── PRD.md              # Product requirements
│   └── TECHNICAL_ARCHITECTURE.md
├── electron/               # Electron main process
│   ├── main.js
│   ├── recorder.js
│   ├── ai-generator.js
│   ├── playwright-runner.js
│   └── reporter.js
├── src/                    # React frontend
│   ├── App.tsx
│   ├── components/
│   └── styles/
├── recordings/             # Test recordings (gitignored)
├── test-cases/            # Generated Excel files (gitignored)
└── results/               # Execution results (gitignored)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ktvoilacode/testmug.git
cd testmug

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI/Mistral API key to .env

# Run in development mode
npm run dev

# Build for production
npm run build
```

---

## 🎯 Buildathon Timeline (48 Hours)

### Day 1 (0-24h)
- ✅ Project setup, documentation
- ⏳ Electron + React scaffold
- ⏳ Embedded browser view
- ⏳ Recording system
- ⏳ AI integration
- ⏳ Excel generation

### Day 2 (25-48h)
- ⏳ Playwright execution
- ⏳ Screenshot capture
- ⏳ Excel/Word reporting
- ⏳ UI polish
- ⏳ Testing & demo

---

## 📝 MVP Success Criteria

- ✅ User can record a test case in < 2 minutes
- ✅ AI generates 10+ relevant test cases
- ✅ Tests execute in parallel (3-5 concurrent)
- ✅ Reports generate with screenshots
- ✅ Total flow (record → generate → execute → report) < 10 minutes

---

## 🗺️ Roadmap

### MVP (Buildathon - 48 hours)
- Basic recording (positive/negative/edge)
- AI test generation (10-20 cases)
- Parallel execution
- Excel + Word reports

### Post-MVP (Q1 2026)
- 50+ test case generation
- Video recording
- Advanced Excel editing UI
- Local LLM support
- Multi-project management

### Future
- Team collaboration
- CI/CD integration
- API testing
- Mobile testing
- Cloud sync

---

## 🤝 Contributing

This is currently a solo buildathon project. Contributions welcome after MVP!

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👤 Author

**Krishna Teja**
GitHub: [@ktvoilacode](https://github.com/ktvoilacode)

---

## 🙏 Acknowledgments

Built for the Buildathon 2025 - Empowering manual testers worldwide!

---

**Status**: 🚧 In Active Development (Buildathon Phase)
