# AI Posture Corrector and Analyser (SAURON)

A full-stack posture coaching app with:
- a Next.js dashboard and control UI,
- a local Python webcam posture detector,
- PostgreSQL-backed event/history storage,
- local-LLM AI chat and weekly recommendations.

The current UI/product name in code is `SAURON`.

## What This Project Includes

- Authentication (email/password) with DB-backed users.
- Live monitor control page (`/monitor`) that starts/stops the Python detector from the web UI.
- Event ingestion API (`/api/events`) for session/activity/posture events.
- Stats dashboard (`/dashboard`) with score, trend, activity hours, and friends leaderboard.
- Reminders page (`/reminders`) with browser notifications + speech.
- AI coach page (`/ai`) with:
  - chat endpoint (`/api/coach`) using local Ollama, fallback if model is unavailable,
  - chat history endpoint (`/api/coach/history`),
  - weekly recommendation endpoint (`/api/coach/recommendation`).
- Profile and friends management (`/profile`, `/api/profile`, `/api/friends`).

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Chart.js
- Backend: Next.js Route Handlers (Node runtime), `pg` for PostgreSQL
- AI: local Ollama chat API
- CV Monitor: Python + OpenCV + MediaPipe

## Project Structure

```text
app/                         Next.js app routes + API routes
components/features/         Major page components (dashboard, monitor, ai, reminders, profile)
lib/db.ts                    DB access + history/score + AI persistence helpers
python-client/               Webcam posture detector script + Python dependencies
Database.sql                 Canonical SQL schema used by APIs
env.example                  Base env vars for local LLM endpoint
```

## Prerequisites

- Node.js 20+ (recommended for Next.js 16)
- npm
- PostgreSQL database
- Python 3.10+ (for webcam monitoring)
- Optional but recommended: Ollama for local AI responses

## Setup

### 1) Install Node dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env.local` in repo root:

```bash
cp env.example .env.local
```

Then add required DB config:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
LOCAL_LLM_URL=http://127.0.0.1:11434
LOCAL_LLM_MODEL=llama3.2
```

Optional monitor overrides:

```env
# Optional overrides used by /api/monitor
POSTURE_SCRIPT_PATH=python-client/main.py
POSTURE_PYTHON_BIN=python3
MPLCONFIGDIR=.tmp/matplotlib
```

### 3) Initialize the database

Run `Database.sql` against your PostgreSQL instance.

This creates:
- `users`
- `friends`
- `history`
- `streak`
- `advice`
- `leaderboard`
- `coach_chat_history`
- `coach_weekly_recommendations`

### 4) Set up Python posture client

```bash
cd python-client
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 5) Optional: start local Ollama model

```bash
ollama pull llama3.2
ollama serve
```

### 6) Run the app

```bash
npm run dev
```

App default URL: `http://localhost:3000`

## Runtime Behavior

### Auth flow

- Signup/login call `/api/auth/signup` and `/api/auth/login`.
- Passwords are stored as `sha256:<hash>` in the `users` table.
- Client auth state is kept in localStorage and a simple cookie (`postureos-auth`) for route protection.
- Protected route matching is configured in `proxy.ts`.

### Monitor flow

- `/monitor` page calls `/api/monitor` with `action: start|stop`.
- `/api/monitor` spawns `python-client/main.py` (or configured script path).
- Monitor stdout logs are parsed in the frontend:
  - `"Fix your posture!"` -> posts `BAD_POSTURE` event
  - `"Too Close to Screen!"` -> posts `TOO_CLOSE` event
- Event posting is debounced (10s) on the client to reduce duplicates.

### Stats + score

- `/api/events` persists events into `history`.
- Score is recomputed and persisted to `users.score` after event writes.
- `/api/stats/summary` returns:
  - score,
  - bad posture + too-close totals,
  - activity hour breakdown.

### AI features

- `/api/coach`:
  - sends user question to local Ollama (`/api/chat`),
  - returns plain text response,
  - falls back to deterministic response when local model is unavailable.
- `/api/coach/history` returns persisted chat history per user.
- `/api/coach/recommendation`:
  - builds weekly recommendation from user profile + history,
  - saves/upserts recommendation in DB,
  - refreshes when new data indicates a week-scale update is needed.

## API Endpoints

| Endpoint | Method(s) | Purpose |
|---|---|---|
| `/api/auth/signup` | `POST` | Create account |
| `/api/auth/login` | `POST` | Validate credentials |
| `/api/profile` | `GET`, `POST` | Read/update profile |
| `/api/profile/password` | `POST` | Change password |
| `/api/friends` | `GET`, `POST` | List/add friends |
| `/api/friends/leaderboard` | `GET` | Friends score ranking |
| `/api/events` | `POST`, `GET` | Persist posture/session events |
| `/api/stats/summary` | `GET` | Aggregated stats and score |
| `/api/leaderboard` | `GET` | Global leaderboard |
| `/api/monitor` | `GET`, `POST` | Start/stop monitor process and check status |
| `/api/coach` | `POST`, `GET` | AI chat response |
| `/api/coach/history` | `GET` | AI chat history |
| `/api/coach/recommendation` | `GET` | Weekly recommendation |

## Contributors and Contributions

Use this section to clearly show who built what. This is useful for recruiters, reviewers, and team grading.

### Team Contributions

### @gurkarangill07
- Name: Gurkaran
- Role: Product Lead, Frontend Engineer, Integration
- Key contributions:
  - Proposed the core app concept and feature direction from scratch.
  - Designed and implemented the frontend experience across the major product surfaces.
  - Implemented current score display logic and dashboard-facing score behavior.
  - Implemented the auto-updating time behavior on dashboard and live monitor views.
  - Implemented reminders page UI behavior, including popup reminder interactions.
  - Integrated the Ask Me Anything chatbot UI with backend APIs.
  - Connected frontend flows to teammate-built backend APIs across key features.
- Proof:
  - PRs: https://github.com/OmidRahmanian/Hackathon/pulls?q=is%3Apr+author%3Agurkarangill07
  - Commits: https://github.com/OmidRahmanian/Hackathon/commits/main/?author=gurkarangill07

### @SahandSZH
- Name: Sahand
- Role: Backend, AI Logic, Data Integration
- Key contributions:
  - Implemented backend APIs used to connect frontend flows to the data layer.
  - Built backend logic for AI Coach and weekly AI recommendations.
  - Set up PostgreSQL backend integration and related API plumbing.
  - Implemented backend logic for friends leaderboard behavior.
  - Contributed to database-related backend work with Omid.
- Proof:
  - PRs: https://github.com/OmidRahmanian/Hackathon/pulls?q=is%3Apr+author%3ASahandSZH
  - Commits: https://github.com/OmidRahmanian/Hackathon/commits/main/?author=SahandSZH

### @OmidRahmanian
- Name: Omid
- Role: Computer Vision, Posture Analysis, Database
- Key contributions:
  - Implemented the camera monitoring flow triggered by the monitor start action.
  - Built posture analysis logic used during live detection sessions.
  - Built the primary database schema foundation and core DB setup.
  - Contributed to database implementation with Sahand.
- Proof:
  - PRs: https://github.com/OmidRahmanian/Hackathon/pulls?q=is%3Apr+author%3AOmidRahmanian
  - Commits: https://github.com/OmidRahmanian/Hackathon/commits/main/?author=OmidRahmanian

## Verification Commands

```bash
npx tsc --noEmit
npm run dev
```

## Known Caveats

- Auth/session is lightweight and client-driven (not production-grade auth).
- Password hashing is plain SHA-256 without salting/slow KDF.
- AI endpoints depend on local Ollama for best output; fallback is used if unreachable.
- In some environments, `npm run build` can fail if `python-client/.venv/bin/python3` is an invalid symlink target.
- `python-client/requirements.txt` includes `flask`, but Flask is not used by `python-client/main.py`.

## Troubleshooting

- Camera does not start:
  - confirm OS camera permissions for terminal/IDE,
  - ensure no other app is locking webcam,
  - verify Python deps are installed in `python-client/.venv`.
- AI coach returns fallback:
  - verify Ollama is running on `LOCAL_LLM_URL`,
  - ensure `LOCAL_LLM_MODEL` is available locally.
- Empty stats/dashboard:
  - ensure `DATABASE_URL` is valid,
  - ensure `Database.sql` has been applied,
  - start monitor and generate events first.
