# Testmug

**AI-Powered Testing Tool for Manual Testers**

> **Status**: 🚧 In Active Development (Buildathon Phase)

---

## Problem Statement

**Current automation solved execution speed. Nobody solved test design labor.**

The real bottleneck? **Not execution. Design.**

Manual testers waste 90% of their time on repetitive test case documentation instead of actual testing. Enterprises pour **$20-30B annually** into manual testing—**56% of all testing spend**. Current automation tools require coding skills and don't solve the test design problem—they only address execution speed.

---

## Users & Context

**Primary Users**: Manual QA Testers at mid-market to enterprise companies
- No coding background required
- Responsible for functional, regression, and exploratory testing
- Frustrated with repetitive test documentation
- Need to increase test coverage without additional effort

**Use Case**: A manual tester needs to test a login flow. Instead of manually writing 50 test cases covering positive scenarios, edge cases, and negative scenarios, they record one positive flow and let AI generate comprehensive test suites in minutes.

---

## Solution Overview

**85% of testing requires human judgment and never goes away.** Instead of fighting that reality, we amplify manual testers with AI.

Testmug is a desktop-native application that empowers manual testers to generate and execute comprehensive test suites from recorded user flows, reducing test creation time by 90%.

**Inspired by**: Lovable/Bolt.new proved "describe intent → AI builds it" works for non-coders. We apply this to test design.

### How It Works

```
1. Record positive test case (happy path)
   ↓
2. Optional: Record negative test case
   ↓
3. Optional: Record edge case
   ↓
4. AI generates 10-50 test cases in Excel
   ↓
5. Edit Excel if needed
   ↓
6. Run tests in parallel (Playwright)
   ↓
7. Get reports (Excel + Word) with screenshots
```

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│       Electron Desktop App                   │
│  ┌─────────────────────────────────────┐   │
│  │  Embedded Browser (Chromium)        │   │
│  │  • DOM Event Capture                │   │
│  │  • Visual Highlighting              │   │
│  └─────────────────────────────────────┘   │
│                    ↓                         │
│  ┌─────────────────────────────────────┐   │
│  │  Recording Engine                   │   │
│  │  • Click/Input/Navigate capture     │   │
│  │  • Multi-selector generation        │   │
│  └─────────────────────────────────────┘   │
│                    ↓                         │
│  ┌─────────────────────────────────────┐   │
│  │  AI Test Generator                  │   │
│  │  • OpenAI GPT-4 / Mistral AI        │   │
│  │  • Generates 10-50 test cases       │   │
│  └─────────────────────────────────────┘   │
│                    ↓                         │
│  ┌─────────────────────────────────────┐   │
│  │  Playwright Test Runner             │   │
│  │  • Parallel execution (3-5 threads) │   │
│  │  • Screenshot capture               │   │
│  └─────────────────────────────────────┘   │
│                    ↓                         │
│  ┌─────────────────────────────────────┐   │
│  │  Report Generator                   │   │
│  │  • Excel with results               │   │
│  │  • Word with screenshots            │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Setup & Run

### Prerequisites

- Node.js 20+
- npm or yarn
- OpenAI API key or Mistral AI API key

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/ktvoilacode/testmug.git
cd testmug

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Add your OpenAI/Mistral API key to .env file

# 4. Run in development mode
npm run dev

# 5. Build for production
npm run build
```

### Quick Start

1. Launch Testmug
2. Enter a URL to test
3. Click "Record Positive" and perform actions
4. Stop recording
5. Click "Generate Test Cases"
6. Review Excel file with AI-generated tests
7. Click "Run Tests"
8. View Excel/Word reports with results

---

## Models & Data

### AI Models
- **Primary**: OpenAI GPT-4 (for test case generation)
- **Alternative**: Mistral AI Large (mistral-large-latest)

### Data Sources
- **Recording Data**: DOM structure, element selectors, user actions
- **Test Cases**: AI-generated test scenarios stored in Excel format
- **Results**: Test execution results, screenshots, error logs

### File Structure
```
/testmug/
├── recordings/             # JSON recording files (local storage)
├── test-cases/            # AI-generated Excel files
├── results/               # Test execution results
│   ├── screenshots/       # Test evidence
│   ├── *.xlsx            # Updated Excel reports
│   └── *.docx            # Word reports
└── config/
    └── settings.json      # App settings (API keys encrypted)
```

### Licenses
- **Testmug**: MIT License
- **Dependencies**:
  - Electron (MIT)
  - React (MIT)
  - Playwright (Apache 2.0)
  - ExcelJS (MIT)
  - docx (MIT)

---

## Evaluation & Guardrails

### Quality Assurance
- **Recording Accuracy**: Multi-selector strategy (ID, data-testid, aria-label, xpath) ensures self-healing tests
- **AI Validation**: Generated test cases are validated for:
  - Completeness (all steps included)
  - Feasibility (actionable test steps)
  - Coverage (positive, negative, edge cases)
- **Execution Reliability**: Retry logic with alternative selectors if primary selector fails

### Hallucination/Bias Mitigations
- **Grounded Generation**: AI receives actual DOM structure and recorded actions as context
- **Template Validation**: Test cases must match predefined JSON structure
- **Fallback Mechanism**: If AI fails, use template-based test generation
- **Human Review**: Excel editing allows manual correction before execution
- **Execution Evidence**: Screenshots prove actual test behavior, not just AI assumptions

### Performance Metrics
- **Recording**: <2% browser performance overhead
- **AI Generation**: <2 minutes for 20 test cases
- **Parallel Execution**: 5 concurrent tests, 20 tests in <5 minutes
- **Report Generation**: <30 seconds for Excel + Word

---

## Known Limitations & Risks

### Current Limitations
- **Browser Support**: Chromium-only (no Firefox/Safari in MVP)
- **Complex Interactions**: May not capture: drag-and-drop, canvas interactions, file uploads (to be improved)
- **Dynamic Content**: AJAX-heavy SPAs may need manual waits
- **Test Coverage**: AI generates 10-20 tests in MVP (50+ post-buildathon)
- **Local Execution**: No cloud sync or team collaboration in MVP

### Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI-generated tests are low quality | High | Medium | Fine-tune prompts, allow manual editing, user feedback loop |
| Playwright can't capture complex interactions | Medium | Medium | Support manual script editing, fallback to template-based generation |
| OpenAI API costs too high | Medium | Low | Offer Mistral AI alternative, local LLM in future |
| Element selectors break on app updates | High | High | Multi-selector strategy with self-healing fallback |
| Low user adoption | High | Medium | Freemium model, Product Hunt launch, demo videos |

### Future Improvements
- Local LLM support (no API dependency)
- Multi-browser support (Firefox, Safari, Edge)
- API testing capabilities
- Team collaboration features
- CI/CD integration

---

## Team

**Krishna Teja**
Role: Founder & Developer
GitHub: [@ktvoilacode](https://github.com/ktvoilacode)
Contact: Available via GitHub

---

## Roadmap

### MVP (Buildathon - 48 hours) ✅ In Progress
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

### Future (Q2-Q3 2026)
- Team collaboration
- CI/CD integration
- API testing
- Mobile testing (Appium)
- Cloud sync

---

## Contributing

This is currently a solo buildathon project. Contributions welcome after MVP release!

---

## License

MIT License - See LICENSE file for details

---

**Built for Buildathon 2025 - Empowering manual testers worldwide!**
