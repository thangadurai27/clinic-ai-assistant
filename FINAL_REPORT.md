# KLM AI Clinic Assistant — Final Report: Demo Login & Auth Repair

## Status
**Code complete and verified locally.** Live demo login cannot succeed until a working Supabase project is restored/replaced and Render/Vercel env vars are updated. No deployment was performed; no credentials are available locally, and the original Supabase project (`kxliehrgflqkhnejbykr`) does not resolve DNS.

---

## 1. Architecture

```
Browser (Next.js / Vercel)
  └─ Login page → POST {API}/auth/login  (real backend call, no fake session)
        └─ FastAPI (Render)
             ├─ Supabase Auth (GoTrue) → real access token
             ├─ public.users row (role=receptionist, is_demo=true)
             └─ Demo-aware endpoints
                  ├─ reads  → static fictional data from app/demo/data.py
                  └─ writes → HTTP 403 "public demo account is read-only" (server-side guard)
```

- **Demo account** is a real Supabase Auth user, provisioned idempotently at startup (`ensure_demo_user_session`) or via CLI (`scripts/seed_demo.py`).
- **Provisioning** signs in first; the password is only changed if sign-in fails, satisfying "no password reset every restart."
- **Demo reads** never query production tables. `app/demo/data.py` serves deterministic sample data (conversations, appointments, escalations, analytics, doctors, etc.).
- **Write guards** are enforced server-side through `get_staff_user_for_write` / `reject_demo`, not just hidden in the UI.
- **Supabase Realtime** is best-effort: missing/unreachable Realtime falls back to normal React Query refetching; WebSocket reconnects with backoff.

---

## 2. Root Causes (Found & Fixed)

| # | Root cause | Evidence |
|---|---|---|
| 1 | Supabase project `kxliehrgflqkhnejbykr` no longer resolves DNS | `Resolve-DnsName` returns nothing |
| 2 | Deployed backend runs old code — no demo support | Live `/api/v1/auth/demo-config` → 404; `demo-config` absent from `openapi.json` |
| 3 | Login shows generic message that hid the Supabase outage | Live login → `401 {"detail":"Login failed. Please try again."}` |
| 4 | Realtime hooks threw/hung when Supabase host was dead | Hardened `lib/supabase.ts`, `useRealtime.ts`, `useWebSocket.ts`, `lib/websocket.ts` |
| 5 | Frontend had no production API/WS fallback | Added `frontend/lib/apiBase.ts`; `next.config.ts` fallbacks |
| 6 | Forgot-password double-prefixed `/api/v1` | Fixed in `forgot-password/page.tsx` |
| 7 | Demo password `demo123` (7 chars) vs registration 8-char rule | Demo login explicitly verifies password before provisioning; bypasses registration validation |

---

## 3. Files Changed / Created

### Backend (Python/FastAPI)
**Created**
- `backend/app/demo/__init__.py`, `data.py`, `service.py` — idempotent provisioning, deterministic sample data, public config
- `backend/app/auth/dependencies.py` — `get_current_user`, `get_optional_user`, `get_staff_user`, `get_staff_user_for_write`, `reject_demo`
- `backend/scripts/schema/migrations/007_demo_mode.sql` — `users.is_demo` column + Realtime publication (idempotent)
- `backend/scripts/seed_demo.py` — CLI demo provisioning
- `backend/tests/conftest.py`, `backend/tests/test_demo_auth.py` — 20 passing tests

**Modified**
- `app/auth/service.py` — rewritten: lazy Supabase client, robust registration, demo auto-provision/login, password verification, tolerant profile handling
- `app/config/settings.py` — demo settings + boolean validator, optional `SUPABASE_JWT_SECRET`
- `app/api/auth.py` — `/auth/demo-config`, proper 401/403/409/503 mapping, `/auth/me` dependency
- `app/main.py` — startup demo provisioning with timeout/non-fatal logging
- `app/api/{admin,analytics,appointments,chat,conversations,dashboard,doctors,escalations,medications,notifications,reminders,takeover}.py` — demo-aware APIs (read-only sample data, write 403s)
- `.env.example` — updated with new project URL, publishable key, demo env vars, migration notes

### Frontend (Next.js / TypeScript)
**Created**
- `frontend/lib/apiBase.ts` — production API/WS fallback resolution
- `frontend/vitest.config.ts` — Vitest config
- `frontend/tests/apiBase.test.ts` — 5 tests
- `frontend/tests/auth.test.ts` — 4 tests

**Modified**
- `app/login/page.tsx` — visible demo credentials + auto-submitting "Login as Demo User" button
- `contexts/AuthContext.tsx` — `isDemo`, refresh-on-401, role-to-cookie sync
- `app/dashboard/layout.tsx` — read-only banner for demo users
- `app/forgot-password/page.tsx` — fixed double-prefix `/api/v1`
- `hooks/{useDashboard,useRealtime,useWebSocket}.ts` — resilient Realtime, graceful fallback
- `lib/{api,auth,supabase,websocket}.ts` — demo-aware errors, token manager, no password logging
- `next.config.ts` — production API/WS fallback
- `providers/QueryClientProvider.tsx` — session hydration
- `services/api.ts` — production API base derivation
- `package.json` — vitest dependency, `"test": "vitest run"`
- `env.example` — updated with new Supabase URL/key, API URL

### Docs
- `README.md` — full demo section, env tables, migrations, Render/Vercel deployment steps, troubleshooting, test commands

---

## 4. Migration (007_demo_mode.sql)

Idempotent. Safe to run more than once.

1. `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE`
2. Partial index `idx_users_is_demo` WHERE `is_demo = TRUE`
3. Column comment: "True only for the public read-only demo account. Enforced by the backend; never set on real users."
4. Adds dashboard tables (`conversations`, `messages`, `escalations`, `notifications`, `conversation_timeline`, `appointments`, `medication_reminders`) to the `supabase_realtime` publication with `REPLICA IDENTITY FULL`, when the publication exists and the tables exist.
5. Verification queries (commented)

**No production rows are seeded.** Apply after migrations `001`–`006`.

---

## 5. Environment Variables

### Backend (Render) — `.env.example`

| Variable | Required | Value |
|---|---|---|
| `SUPABASE_URL` | Yes | `https://mxvxwqlhsypjehcdrgqp.supabase.co` *(new project)* |
| `SUPABASE_ANON_KEY` | Yes | `sb_publishable_uNRYASZ_rS0i-fXKxK4bcg_094dXUmG` *(publishable key works for GoTrue HTTP)* |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes — must be fetched from Supabase Dashboard → Settings → API *(API Keys section)* | The Python `supabase-py` client rejects the `sb_publishable_` and `sb_secret_` prefixes; it requires the plain service-role key value. **This is the key blocker** — without the correct service_role key, the backend cannot initialize the Supabase client. |
| `SUPABASE_JWT_SECRET` | Optional | Legacy JWT fallback only |
| `DEMO_MODE_ENABLED` | No | `true` |
| `DEMO_USER_EMAIL` | No | `demo@gmail.com` |
| `DEMO_USER_PASSWORD` | No | `demo123` |
| `DEMO_USER_NAME` / `DEMO_USER_PHONE` | No | `Demo Receptionist` / `+1-555-0100` |
| `GROQ_API_KEY` | Yes | existing |
| `SECRET_KEY`, `JWT_SECRET_KEY` | Yes | existing |
| `APP_ENV` | No | `test` / `production` |

**⚠ Critical note:** The new Supabase project's keys use the `sb_publishable_` / `sb_secret_` prefix format, which the Python `supabase-py` `create_client` rejects with "Invalid API key". The service_role key must be copied from the Supabase Dashboard → Settings → API → API Keys page (the plain string, typically starting with `sbsecret_...` or similar, depending on the project). Until that key is set, the backend falls back to in-memory demo data.

### Frontend (Vercel) — `env.example`

| Variable | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Recommended | `https://clinic-ai-backend-t38f.onrender.com/api/v1` *(or new Render URL)* |
| `NEXT_PUBLIC_WS_URL` | Optional | derived from API URL (`http → ws`, `https → wss` + `/ws`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | `https://mxvxwqlhsypjehcdrgqp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | `sb_publishable_uNRYASZ_rS0i-fXKxK4bcg_094dXUmG` |

The publishable key works for public GoTrue HTTP endpoints (settings, sign-in) but does **not** grant admin access. The frontend only needs the anon key for sign-in UI and Realtime best-effort.

---

## 6. Testing Results (re-verified)

| Suite | Result |
|---|---|
| `pytest tests/test_demo_auth.py -q` | **20 passed** in ~20.5s |
| `npm test` (Vitest) | **9 passed** (2 files: `apiBase.test.ts`, `auth.test.ts`) |
| `npx tsc --noEmit` | exit 0 (pre-existing `.next/types` cache mismatch is unrelated) |
| `npm run lint` | exit 0 |
| `npm run build` | succeeded, all routes generated |
| `py_compile` demo/auth/seed modules | exit 0 |

**Test suite coverage includes:**
- Demo config endpoint exposure
- Wrong-password rejection (login returns 401 with `error_code: "auth_error"`)
- 401/503 mapping on service unavailable
- `/auth/me` requires authorization header; returns authenticated user with `is_demo`
- Idempotent provisioning (password not changed if already correct)
- Demo dashboard returns sample data only (no real patients/appointments)
- Demo reminders are empty; writes are blocked (403)
- Receptionist (demo) cannot use patient portal

---

## 7. Local Development Commands

### Backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
# Set env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, DEMO_MODE_ENABLED=true
pip install -r requirements.txt
# Optionally provision demo once:
python scripts/seed_demo.py
uvicorn app.main:app --reload --port 8001
```

### Frontend
```powershell
cd frontend
npm install
# Set env: NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

**Demo credentials:** `demo@gmail.com` / `demo123`

---

## 8. Deployment Commands (when infrastructure is restored)

### 1. Restore / create a Supabase project
- If restoring the original: recreate the project host `kxliehrgflqkhnejbykr` and DNS.
- If creating new: use the new project `mxvxwqlhsypjehcdrgqp`.
- **Fetch the service_role key** from Dashboard → Settings → API → API Keys. Copy the plain value (not the `sb_secret_...` prefixed version) into `SUPABASE_SERVICE_ROLE_KEY` in the Render env.

### 2. Apply migrations
```sql
-- In the Supabase SQL editor, run 001 .. 007 in order
-- (007 adds is_demo column + Realtime publication)
```

### 3. Backend → Render
```powershell
git add -A
git commit -m "Fix auth and add read-only public demo login"
git push origin main
# In Render dashboard: set env vars (see table above), then Manual Deploy
# Verify:
#   GET /api/v1/auth/demo-config  → enabled: true
#   POST /api/v1/auth/login {"email":"demo@gmail.com","password":"demo123"}  → 200 + user role=receptionist, is_demo:true
#   GET /api/v1/auth/me (with token) → role receptionist, is_demo true
#   Dashboard shows sample data, write buttons are disabled / return 403
```

### 4. Frontend → Vercel
```powershell
# In Vercel project Settings → Environment Variables:
NEXT_PUBLIC_API_URL=https://<render-service>.onrender.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
# Deploy: vercel --prod
# Then click "Login as Demo User" and confirm:
#   - Dashboard sample data loads
#   - Read-only banner is shown
#   - Attempting a write (takeover, appointment change, etc.) returns 403
```

### 5. Final verification checklist
- [ ] `/api/v1/auth/demo-config` returns `enabled: true`, `email: "demo@gmail.com"`, `password: "demo123"`
- [ ] POST `/api/v1/auth/login` with demo creds → 200, user has `is_demo: true`, `role: "receptionist"`
- [ ] GET `/api/v1/auth/me` (with token) → same user
- [ ] Dashboard loads fictional sample data (no real patient records)
- [ ] Demo write attempts (takeover, appointment change, staff message, etc.) → HTTP 403
- [ ] Supabase Realtime: either connected or gracefully fallen back to query refetching
- [ ] Read-only banner visible on dashboard for demo user

---

## 9. Remaining Manual Configuration (blocking live demo)

1. **Restore or create a Supabase project.** The existing ref `kxliehrgflqkhnejbykr` does not resolve DNS. A new project (`mxvxwqlhsypjehcdrgqp`) is live with valid keys, but the Python `supabase-py` client requires the `SUPABASE_SERVICE_ROLE_KEY` from the dashboard (the `sb_publishable_` / `sb_secret_` prefixes are for Node/Edge Functions only).

2. **Fetch the service_role key** from the Supabase Dashboard and set it in Render env as `SUPABASE_SERVICE_ROLE_KEY`.

3. **Redeploy both services** (Render + Vercel) with the updated env vars.

4. **Run the verification checklist** (section 8) to confirm live demo login, sample data, and read-only 403s.

5. **Optionally run** `python scripts/seed_demo.py` once (startup provisioning also runs, but the CLI is available for manual trigger).

---

## 10. Notes / Limitations

- **Changes are uncommitted** in the working tree (35 modified, 9 new paths). Nothing was pushed or deployed.
- **Full backend suite** still has pre-existing failures in external integration tests (`test_email_flow.py`, `test_handle_chat.py`, `test_production_features.py`) due to missing SMTP module/network/real Supabase — unrelated to this change.
- **Demo password `demo123`** is 7 characters; demo login intentionally bypasses the 8-character registration validation. Registration validation itself is unchanged.
- **Publishable key in frontend env** works for GoTrue HTTP API (sign-in, settings) but does not grant admin/backend access. The backend still needs the service_role key.
- **Local `uvicorn` import** of `app.main` needs a valid Supabase key because `app/api/doctors.py` eagerly builds its client at import time; this is pre-existing behavior and not caused by this change.
- **Supabase Realtime** is treated as best-effort. If the project is unreachable, the dashboard still works via normal React Query refetching (as designed).

---

## Summary

The authentication system and public demo login are **fully implemented and locally tested** (20 backend tests, 9 frontend Vitest tests, clean lint/build). The demo credentials (`demo@gmail.com` / `demo123`) are visible on the login page, auto-fill and submit through the real backend login API, and the authenticated user receives isolated sample data with server-enforced read-only restrictions.

**However, the demo is not yet live** because:
- The original Supabase project is unreachable (DNS does not resolve).
- The new Supabase project's keys require a correct `SUPABASE_SERVICE_ROLE_KEY` from the dashboard, which is the current blocker for the Python backend.
- Render and Vercel env vars must be updated and both services redeployed.

Once those three items are done (project key, redeploy), the final verification checklist will confirm everything works.