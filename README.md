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

> **Live authentication prerequisite:** the deployed backend must point at an
> active Supabase project. If login returns HTTP 503, run
> `nslookup <project-ref>.supabase.co` and replace `SUPABASE_URL`,
> `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Render, then redeploy.

---

## 🎮 Public Demo Login

Every visitor can explore the receptionist dashboard with isolated sample data:

| Field | Value |
| --- | --- |
| Email | `demo@gmail.com` |
| Password | `demo123` |

The login page shows these credentials and a **Login as Demo User** button. The
button submits the normal `/api/v1/auth/login` request — there is no fake
frontend-only session.

How the demo stays safe:

*   The demo account is a real Supabase Auth user with the `receptionist` role.
*   Demo read endpoints return static, fictional sample data from
    `backend/app/demo/data.py`; real patients/appointments are never selected.
*   Demo write endpoints (takeover, resume AI, appointment changes, staff
    messages, profile edits, etc.) return HTTP `403`. A few harmless dashboard
    actions are simulated in memory only.
*   Provisioning is idempotent: the backend signs in first and only repairs the
    password if the account no longer matches. It does not reset the password on
    every restart.

Disable the demo in production with `DEMO_MODE_ENABLED=false`.

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
cp env.example .env.local # Update local vars
npm run dev
```

---

## 🔐 Environment Configuration

Create a `.env` in `backend/` and `.env.local` in `frontend/` as per the
example files provided (`backend/.env.example` and `frontend/env.example`).

### Backend (`backend/.env`)

| Variable | Required | Notes |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | LLM processing. |
| `SUPABASE_URL` | Yes | Must be a reachable, active project. |
| `SUPABASE_ANON_KEY` | Yes | Public Supabase key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; used for Auth admin + DB. |
| `SUPABASE_JWT_SECRET` | No | Legacy project JWT secret; local verification fallback only. |
| `SECRET_KEY` | Yes | Random value for app signing. |
| `DEMO_MODE_ENABLED` | No | Defaults to `true`. |
| `DEMO_USER_EMAIL` | No | Defaults to `demo@gmail.com`. |
| `DEMO_USER_PASSWORD` | No | Defaults to `demo123`. |
| `GOOGLE_REFRESH_TOKEN` | No | Gmail API replies. |
| `TWILIO_AUTH_TOKEN` | No | WhatsApp integration. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Recommended | Include `/api/v1`. Falls back to the Render backend in production. |
| `NEXT_PUBLIC_WS_URL` | No | Derived from the API URL when omitted. |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Realtime only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Realtime only. |

### Database Migrations

Run the SQL files in order in the Supabase SQL editor (or with
`backend/scripts/run_schema.py`):

```text
backend/scripts/schema/schema.sql
backend/scripts/schema/migrations/001_processed_emails.sql
...
backend/scripts/schema/migrations/007_demo_mode.sql
```

`007_demo_mode.sql` adds `users.is_demo` and ensures the dashboard tables are in
the `supabase_realtime` publication. It is idempotent.

Provision the demo account manually (optional — the API does this at startup):

```bash
cd backend
python scripts/seed_demo.py
```

### Authentication troubleshooting

*   `401 Invalid email or password` — the Supabase Auth request reached GoTrue
    and was rejected.
*   `503 Authentication service is temporarily unavailable` — the backend could
    not reach Supabase. Verify `SUPABASE_URL` resolves from the host:
    `nslookup <project-ref>.supabase.co`.
*   Realtime errors in the browser console are non-fatal; the dashboard falls
    back to normal query refetching when the channel closes.

---

## 🚀 Deployment

### Backend — Render

1.  Create a **Web Service** from this repository with root directory `backend`.
2.  Build: `pip install -r requirements.txt`
3.  Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4.  Add every backend variable above in **Environment**.
5.  Apply migrations `001`–`007` to the Supabase project.
6.  Health check: `GET https://<service>.onrender.com/health`
7.  Demo check: `GET https://<service>.onrender.com/api/v1/auth/demo-config`

### Frontend — Vercel

1.  Import the repository with root directory `frontend`.
2.  Framework preset: **Next.js** (build `npm run build`).
3.  Set `NEXT_PUBLIC_API_URL=https://<render-service>.onrender.com/api/v1`.
4.  Optionally set `NEXT_PUBLIC_SUPABASE_URL` and
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` (must be for the same active project).
5.  Redeploy after changing any `NEXT_PUBLIC_*` variable — they are inlined at
    build time.
6.  Confirm the backend CORS list includes the Vercel origin
    (`backend/app/main.py`).

### Tests

```bash
# Backend unit tests (no network)
cd backend
python -m pytest tests/test_demo_auth.py -v

# Frontend unit tests / type-check / lint / production build
cd frontend
npm test
npx tsc --noEmit
npm run lint
npm run build
```

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Thangadurai S**
*   B.E Computer Science (AI & ML)
*   [GitHub](https://github.com/thangadurai27) | [LinkedIn](https://linkedin.com/in/thangadurai27)
