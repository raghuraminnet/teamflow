# TeamFlow — Voice-Powered Team Operations Platform

> Automate team work, track tasks and status updates by project, client, and users — with built-in AI voice agents for team communication.

**Phase 1** — Core platform live with voice agent infrastructure. Self-hosted, non-monolithic, API-gateway-orchestrated.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│           INTERNET (port 80 / 443)                        │
└──────────────────────┬─────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  NGINX          │  TLS termination (optional)
              │  (web container)│  Static files / SPA
              └────────┬────────┘  /api → gateway:3000
                       │           /ws → gateway:3000
              ┌────────▼────────────────────────────┐
              │     GATEWAY SERVICE (:3000)         │
              │  JWT validation · Rate limiting     │
              │  Header injection · Proxy routing │
              └──┬──────────┬───────────┬──────────┘
                 │          │           │
          ┌───────▼──┐ ┌────▼─────┐ ┌───▼────────┐
          │ teamflow │ │  voice   │ │   notify   │
          │   API    │ │  agent   │ │  service   │
          │ (:3001)  │ │ (:3002)  │ │  (:3003)   │
          └───────┬──┘ └────┬────┘ └───┬────────┘
                  │         │          │
         ┌────────▼─────────▼──────────▼────────┐
         │          PostgreSQL 16                 │
         │  teamflow schema · voice schema · notify │
         └───────────────────────────────────────┘
```

**6 services, all containerized:**

| Service | Image | Port | Role |
|---------|-------|------|------|
| `postgres` | postgres:16-alpine | 5432 | All data |
| `teamflow-api` | teamflow-api | 3001 | Core REST API |
| `gateway` | teamflow-gateway | 3000 | JWT auth + proxy |
| `voice` | teamflow-voice | 3002 | Voice agents + calls |
| `notify` | teamflow-notify | 3003 | SSE + email |
| `web` | teamflow-web | 80 | Frontend + nginx |

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
git clone <repo>
cd teamflow
cp .env.example .env
```

### 2. Configure environment

Edit `.env`:

```bash
JWT_SECRET=replace-with-a-long-random-string-min-32-chars
JWT_REFRESH_SECRET=another-long-random-string-min-32-chars
FRONTEND_ORIGIN=https://your-domain.com
```

### 3. Start all services

```bash
docker compose up -d
```

Visit `http://localhost` — you'll be redirected to the login page.

### 4. Create your admin account

Register a new account via the UI — first registered user becomes admin.

---

## 🔐 Security

| Layer | Mechanism |
|-------|-----------|
| Auth | JWT access (15min) + refresh (7d), HTTP-only cookies |
| Gateway | Token validation on every request, injects `X-User-*` headers |
| Rate limiting | Per-user (100/min) + per-IP (500/min) via gateway |
| CORS | Gateway-level origin allowlist |
| Role guards | `admin` / `team_member` enforced on every route |
| Passwords | bcrypt with 12 salt rounds |
| Voice calls | Asterisk AMI auth, SIP signaling encryption |
| Recordings | JWT-gated via gateway before nginx serves |

---

## 📁 Project Structure

```
teamflow/
├── docker-compose.yml      # All 6 services + volumes + networks
├── .env.example            # Environment variables template
│
├── services/
│   ├── teamflow/          # Core REST API (Express + Drizzle)
│   │   └── src/
│   │       ├── routes/    # auth, clients, projects, tasks, workflows, kb, activity
│   │       └── db/        # schema.ts, migrate.ts
│   │
│   ├── voice/             # Voice agent service
│   │   └── src/
│   │       ├── asterisk/  # AMI client (call control)
│   │       ├── stt/       # Whisper STT bridge
│   │       ├── tts/       # Piper TTS bridge
│   │       ├── llm/       # Ollama / OpenAI bridge
│   │       ├── agents/    # Step flow executor
│   │       └── campaigns/ # Campaign runner
│   │
│   └── notify/            # SSE + email notification service
│       └── src/
│           ├── sse.ts    # Server-Sent Events manager
│           └── email.ts  # Nodemailer sender
│
├── gateway/               # API Gateway (JWT + proxy)
│   └── src/index.ts
│
├── frontend/              # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── pages/admin/   # Dashboard, Clients, Projects, Tasks, Team, Voice, Workflows, KB
│   │   ├── pages/team/   # My Tasks, Projects, KB
│   │   └── pages/auth/   # Login, Register
│   ├── Dockerfile         # Multi-stage build → nginx:alpine
│   └── nginx.conf         # Frontend nginx config
│
└── nginx/                 # Source configs (mounted into web container)
    ├── nginx.conf         # Main config (gzip, security headers, rate limit zones)
    └── conf.d/default.conf # Server block (SPA routing + API/SSE proxy)
```

---

## 🌐 API Routes

All traffic goes through the Gateway → `https://your-domain.com/api`

### Core (teamflow-api)
| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /api/auth/register | ❌ | Public |
| POST | /api/auth/login | ❌ | Public |
| POST | /api/auth/refresh | ❌ | Cookie only |
| GET | /api/clients | ✅ | admin |
| POST | /api/clients | ✅ | admin |
| GET | /api/projects | ✅ | All |
| POST | /api/projects | ✅ | admin |
| GET | /api/tasks | ✅ | All |
| POST | /api/tasks | ✅ | All |
| PUT | /api/tasks/:id | ✅ | All (assignee/admin) |
| POST | /api/tasks/:id/comments | ✅ | All |
| GET | /api/workflows | ✅ | All |
| POST | /api/workflows/run | ✅ | All |
| GET | /api/activity | ✅ | All |
| GET | /api/admin/stats | ✅ | admin |
| GET | /api/admin/users | ✅ | admin |

### Voice (voice-svc)
| Method | Path | Auth | Role |
|--------|------|------|------|
| GET | /api/voice/agents | ✅ | admin |
| POST | /api/voice/agents | ✅ | admin |
| GET | /api/voice/campaigns | ✅ | admin |
| POST | /api/voice/campaigns | ✅ | admin |
| POST | /api/voice/campaigns/:id/run | ✅ | admin |
| GET | /api/voice/calls | ✅ | admin |
| GET | /api/voice/recordings/:file | ✅ | admin |

### Notifications (notify-svc)
| Method | Path | Auth | Role |
|--------|------|------|------|
| GET | /api/notify/sse | ✅ | All (SSE stream) |
| GET | /api/notify/me | ✅ | All |
| PUT | /api/notify/me/read/:id | ✅ | All |
| POST | /api/notify/send | ✅ | Internal |

---

## 🔔 Notifications

Events pushed in real-time via SSE:

| Event | Trigger |
|-------|---------|
| `task.created` | New task assigned |
| `task.status_changed` | Task moved to new status |
| `task.due_soon` | 24h before due date |
| `project.updated` | Project details changed |
| `workflow.completed` | Workflow run finished |
| `call.started` | Voice campaign launches |
| `call.completed` | Voice campaign ends |

---

## 🎙️ Voice Agent Setup

Voice agents need additional infrastructure. Set these in `.env`:

```bash
# Asterisk (VoIP server — install on your VPS)
ASTERISK_HOST=your-asterisk-server
ASTERISK_PORT=5038
ASTERISK_MANAGER_USER=teamflow
ASTERISK_MANAGER_SECRET=your-secret

# Whisper (STT — run locally or use a container)
WHISPER_URL=http://whisper:9001
WHISPER_MODEL=base

# Piper TTS (run locally or use a container)
PIPER_URL=http://piper:5000
PIPER_VOICE=en_US-amy-medium

# LLM (Ollama — run locally)
LLM_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3
```

### Voice Agent Step Types

Agents run a flow of steps:

| Step | Description |
|------|-------------|
| `speak` | Play TTS message to caller |
| `collect` | Record audio, transcribe response |
| `condition` | Branch based on transcribed keywords |
| `task_update` | Update a task in TeamFlow |
| `delay` | Wait before next step |
| `transfer` | Alert admin / transfer to human |
| `end` | Hang up and save call log |

---

## 🛠️ Development

```bash
# Run specific service in dev mode
cd services/teamflow && npm run dev
cd gateway && npm run dev
cd services/voice && npm run dev
cd services/notify && npm run dev

# Frontend dev with proxy
cd frontend && npm run dev

# Database migrations (run on startup via Drizzle)
cd services/teamflow && npm run migrate

# Check logs
docker compose logs -f teamflow-api
docker compose logs -f gateway
docker compose logs -f voice
```

---

## 📊 Database Schemas

Three PostgreSQL schemas on one instance:

**`teamflow`** — Core app data
- `users`, `clients`, `projects`, `tasks`, `task_comments`
- `workflow_templates`, `workflow_template_steps`, `workflow_runs`, `workflow_run_steps`
- `kb_articles`, `activity_log`

**`voice`** — Voice agent data
- `voice_agents`, `campaigns`, `call_logs`, `contacts`

**`notify`** — Notifications
- `notifications`, `notification_prefs`

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *required* | Min 32 char random string |
| `JWT_REFRESH_SECRET` | *required* | Min 32 char random string |
| `RATE_LIMIT` | 100 | Requests/min per user |
| `RATE_LIMIT_IP` | 500 | Requests/min per IP |
| `FRONTEND_ORIGIN` | http://localhost:80 | For CORS |
| `ASTERISK_HOST` | asterisk | Asterisk server hostname |
| `WHISPER_MODEL` | base | tiny/base/small/medium/large |
| `PIPER_VOICE` | en_US-amy-medium | Piper voice ID |
| `LLM_PROVIDER` | ollama | ollama or openai |
| `OLLAMA_MODEL` | llama3 | Ollama model name |

---

## 🚢 Deployment

```bash
# Build and start
docker compose build
docker compose up -d

# Watch logs
docker compose logs -f

# Stop all
docker compose down

# Rebuild one service
docker compose build teamflow-api && docker compose up -d teamflow-api
```

For production with HTTPS, add your SSL certs to `nginx/ssl/` and update nginx.conf to listen on 443 with TLS.

---

## Phase 2 (Planned)

- [ ] Workflow builder UI (visual drag-drop step editor)
- [ ] Voice agent builder UI (create agents, manage campaigns)
- [ ] Call recording playback in browser
- [ ] Real-time task board updates (SSE)
- [ ] Scheduled workflow cron runner
- [ ] Asterisk installation + provisioning
- [ ] Self-hosted Whisper + Piper + Ollama Docker setup
- [ ] Email templates for notifications
- [ ] Client portal (clients view their project status)
- [ ] API token system for external integrations

---

_Built from AgentLabs-inspired architecture, adapted for internal team operations._