# 🏥 KLM AI Clinic Assistant

> A production-ready, AI-powered healthcare administrative platform that automates patient communication, appointment scheduling, and clinical workflows via Email, WhatsApp, and Web.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-AI-orange)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-LLM-purple)](https://groq.com/)

---

## 🌐 Live Platform

*   **Frontend (Vercel):** [clinic-ai-assistant-one.vercel.app](https://clinic-ai-assistant-one.vercel.app/)
*   **Backend API (Render):** [clinic-ai-backend-t38f.onrender.com](https://clinic-ai-backend-t38f.onrender.com/)
*   **API Docs:** [/docs](https://clinic-ai-backend-t38f.onrender.com/docs)

---

## 📖 Overview

The **KLM AI Clinic Assistant** is an intelligent orchestration layer for medical clinics. It bridges the gap between patient inquiries (WhatsApp/Email/Web) and clinical operations. 

Using **LangGraph** and **Groq (Llama 3)**, the assistant classifies patient intent, provides medical FAQ responses, manages appointment scheduling, and automatically escalates critical or emergency situations to human staff via a real-time **Receptionist Dashboard**.

---

## ✨ Key Features

### 👤 Patient Experience
*   **Omnichannel Support:** Interact via WhatsApp, Email, or the Patient Portal.
*   **Smart Scheduling:** AI-driven appointment booking with real-time availability checks.
*   **Medical FAQ:** Localized clinic information and symptoms triage.
*   **Notification Center:** Real-time updates on appointment status and clinic alerts.
*   **Responsive UI:** Fully mobile-optimized portal for on-the-go health management.

### 👩‍💼 Clinical Operations
*   **Receptionist Dashboard:** Live feed of all patient conversations with AI confidence tracking.
*   **Human Takeover:** Seamlessly transition from AI to human support for complex cases.
*   **Emergency Escalation:** Automatic high-priority alerts for critical symptom detection.
*   **Analytics:** Live metrics on patient volume, AI performance, and channel distribution.
*   **Audit Trail:** Centralized logging of all system and user activities.

---

## 🏗️ System Architecture & AI Workflow

### Architecture
```text
[Patients] ─────► [WhatsApp / Email / Web] ─────┐
                                               ▼
[Receptionist] ◄─── [Dashboard (Realtime)] ◄── [Backend (FastAPI)]
                                               │
                                               ▼
[Database] ◄───── [Supabase (PG + Auth)] ◄── [LangGraph AI]
```

### LangGraph Decision Engine
The AI workflow uses a cyclic graph to ensure safety and accuracy:
1.  **Intent Classification:** Categorizes message (Booking, Triage, FAQ, etc.).
2.  **Specialized Agent Routing:** Passes context to the appropriate domain agent.
3.  **Safety Layer:** Validates medical advice against clinic safety guidelines.
4.  **Escalation Logic:** Routes low-confidence or emergency intents to human staff.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI.
*   **Backend:** FastAPI, Python 3.12, LangGraph, Pydantic v2.
*   **AI:** Groq (Llama 3.3 70B), LangChain Core.
*   **Database:** Supabase (PostgreSQL), Realtime engine, Row Level Security (RLS).
*   **Integrations:** Gmail API (OAuth2), Twilio (WhatsApp), APScheduler.

---

## 📂 Repository Structure

```text
├── backend/                # FastAPI Application
│   ├── app/
│   │   ├── agents/         # LangChain/LangGraph Agents
│   │   ├── api/            # API Route Handlers
│   │   ├── graph/          # Workflow Orchestration
│   │   ├── repositories/   # Data Access Layer
│   │   └── services/       # Core Business Logic
│   └── scripts/            # Migrations & Seeders
├── frontend/               # Next.js Application
│   ├── app/                # Pages & Layouts
│   ├── components/         # Shared UI Components
│   └── services/           # API Client Layer
└── LICENSE                 # MIT License
```

---

## ⚙️ Local Setup & Installation

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # Add your keys
uvicorn app.main:app --port 8001 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local # Update local vars
npm run dev
```

---

## 🔐 Environment Configuration

Create a `.env` in `backend/` and `frontend/` as per the `.env.example` files provided. Key variables include:
*   `GROQ_API_KEY`: For LLM processing.
*   `SUPABASE_URL` / `SERVICE_ROLE_KEY`: For data persistence.
*   `GOOGLE_REFRESH_TOKEN`: For Gmail API (replies).
*   `TWILIO_AUTH_TOKEN`: For WhatsApp integration.

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Thangadurai S**
*   B.E Computer Science (AI & ML)
*   [GitHub](https://github.com/thangadurai27) | [LinkedIn](https://linkedin.com/in/thangadurai27)
