# ClinixAI — Clinical Multi-Agent System

> Built at the **Sarvam AI Hackathon @ IIIT Hyderabad** 🏥

A full-stack clinical intelligence platform powered by **Sarvam AI APIs** — where 5 specialized AI agents orchestrate end-to-end patient care: from multilingual voice intake to AI diagnosis, evidence retrieval, and auto-documentation.

---

## 🚀 Quick Start

Just open `index.html` in **Chrome** (or any modern browser). No server needed.

```
KK/
├── index.html    # App shell
├── style.css     # Full design system
├── app.js        # Logic + Sarvam API integrations
└── README.md
```

---

## 🤖 Sarvam AI APIs Used

| API | Model | Feature |
|-----|-------|---------|
| Speech-to-Text | `saaras:v3` | Voice notes in Indic languages |
| Text-to-Speech | `bulbul:v3` | Reads diagnoses aloud (Priya voice) |
| LLM Chat | `sarvam-105b-conversations` | Clinical reasoning & query answering |
| Translate | `mayura:v1` | Hindi summaries for patients |

**API Key**: Stored in `app.js` → `SARVAM_API_KEY`

---

## 🏥 Features

### Dashboard
- **5 AI Agent Pipeline** — Patient Intake → Knowledge Retrieval → Diagnostics → Clinical Reasoning → Documentation
- **3 Patient Cases** — Cardiology (NSTEMI), Neurology (Stroke), Pulmonology (Asthma)
- **Live Vitals Cards** — HR, BP, SpO₂, Resp Rate with trend arrows
- **Lab Sparklines** — Chart.js animated trends (Troponin, WBC, Hemoglobin, etc.)
- **Diagnostic Reasoning Flow** — Step-by-step agent handoff visualization
- **Real-time Activity Log** — Live agent messages every 6 seconds
- **AI Diagnosis Panel** — Ranked hypotheses with probability bars
- **Evidence & Guidelines** — ACC/AHA, ESC, GINA citations
- **ECG Waveform** — Animated live ECG strip

### Voice Input (Saaras STT)
- Click 🎙️ mic → speak in English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati
- Auto-transcribes and queries Sarvam-105B LLM with patient context

### TTS Readback (Bulbul)
- "Read Aloud" button plays full diagnosis audio
- Hindi TTS after translation

### Translate (Mayura)
- One-click Hindi translation of diagnosis
- Playable in Hindi voice via Bulbul

### Other Views
- **Patients** — Card grid for all active cases
- **Insights** — 4 analytics charts (accuracy trends, volume, confidence distribution, handoffs)
- **Agents** — Control center to activate/pause each agent

### Polish
- Onboarding splash screen on first load
- Demo walkthrough mode (auto-runs all features)
- Export Report (generates downloadable clinical summary)
- Keyboard shortcuts (press `?` to see all)
- Skeleton loading states
- Toast notifications for all API calls
- Modal system for detailed views

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Dashboard |
| `2` | Patients |
| `3` | Insights |
| `4` | Agents |
| `R` | Run Analysis |
| `N` | Next Patient |
| `Space` | Toggle TTS |
| `Esc` | Close modal |
| `?` | Show shortcuts |

---

## 🎯 Built for Sarvam Hackathon @ IIITH

This project demonstrates Sarvam's vision for **sovereign, Indian-language-first AI** in healthcare:
- Clinical AI that speaks Hindi, Tamil, Telugu, and 19 other Indic languages
- Voice-first workflows for doctors in time-constrained environments
- Patient-facing summaries in regional languages for health literacy
- Multi-agent orchestration for end-to-end clinical intelligence

---

## 📸 Screenshots

Open `index.html` in Chrome to see the live dashboard.
