# CrisisConnect

**AI-powered disaster management platform — from first alert to full resolution.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Overview

CrisisConnect unifies disaster victims, volunteers, NGOs, government agencies, and autonomous IoT sensors into a single real-time coordination platform. When every second counts, it eliminates the fragmented communication that costs lives.

**The problem:** During disasters, information is scattered across phone calls, social media, and paper forms. First responders lack real-time situational awareness. Resources go unmatched. Duplicate reports clog decision pipelines.

**The innovation:** A multi-signal AI fusion engine scores and prioritizes every incoming incident across four dimensions — AI urgency, geographic risk, crowd repetition, and user trust — then routes it to the right responder automatically, with full explainability at every step.

---

## Features

### Core AI Intelligence

| Feature | Description |
|---|---|
| Multi-signal fusion | `AI urgency × 0.5 + location risk × 0.2 + repetition × 0.2 + user trust × 0.1` |
| Explainable AI | Every decision ships with `auditId`, contributing factors, confidence, and reasoning |
| Fake report detection | Behavioral scoring 0–100 with named reason flags |
| AI Crisis Copilot | RAG knowledge base (8 disaster protocols, Hindi + English) augmented by GPT-4o-mini |
| Multimodal analysis | Text + voice transcript + image URL fused into a single crisis score |
| Early warning | Auto-detects ≥3 same-type reports in 1 hour and escalates |
| Human-in-the-loop | Review queue for low-confidence AI decisions with approve/override flow |

### Infrastructure & Resilience

| Feature | Description |
|---|---|
| Circuit breakers | CLOSED / OPEN / HALF_OPEN pattern on all external integrations |
| SLA escalation engine | 30s → expand radius, 60s → notify authorities, 120s → public broadcast |
| Event-driven bus | 9 typed internal events wired to WebSocket fan-out |
| Offline-first SOS | LocalStorage queue flushes automatically on reconnect |
| SMS ingestion | Twilio-compatible webhook parses SOS, FIRE, FLOOD, MEDICAL commands from SMS |
| Chaos engineering | 4 built-in experiments (latency, error_rate, memory, db_slow) |
| IoT ingestion | 8 sensor types → auto disaster reports with smart dispatch |

### Platform & UX

| Feature | Description |
|---|---|
| Role-based UX | Citizen, Volunteer, NGO, Authority, Admin each get a purpose-built interface |
| Interactive command map | Split-pane Leaflet map with heatmap, risk circles, evacuation zones, route polylines |
| Real-time chat | AES-GCM encrypted, read receipts, typing indicators, pinned messages |
| Digital twin | City-level graph model with Dijkstra crisis propagation simulation |
| GDPR compliance | Full data export, account deletion, consent management |
| Developer platform | API keys, webhook subscriptions, HMAC-signed deliveries, rate-limit headers |

### Observability

| Feature | Description |
|---|---|
| Prometheus metrics | `/api/metrics` — request counters, histograms, P95 latency, uptime |
| Structured logging | JSON entries with level, timestamp, context, and stack traces |
| Monitoring dashboard | 8-card KPI grid, circuit breaker status, chaos experiment controls |
| Detailed health check | DB ping, memory %, per-service status → `ok / degraded / down` |

---

## System Highlights

- **50+ API route files** organized into domain modules — auth, AI, SOS, geo, simulation, trust, compliance, developer, monitoring
- **Feature-based frontend architecture** — each feature is a self-contained module with its own types, hooks, store slice, and components
- **Zero silent failures** — every external call has a circuit breaker, every UI error has a `SectionBoundary`, every offline action has a queue
- **Production-grade design system** — token-driven, Stripe/Linear-level consistency across 40+ pages
- **Full audit trail** — immutable `incident_logs` table records every state transition

---

## Architecture Snapshot

```
┌──────────────────────────────────────────────────────────┐
│  React 18 + Vite  │  TanStack Query  │  Zustand          │  ← Client
│  Wouter routing   │  WebSocket hook  │  Design System    │
└──────────────────────────────────────────────────────────┘
                          │ HTTPS + WSS
┌──────────────────────────────────────────────────────────┐
│  Express.js (ESM)  │  JWT Auth  │  Rate Limiting         │  ← API Gateway
│  Helmet / CORS     │  Zod validation  │  Audit logging   │
├──────────────────────────────────────────────────────────┤
│  AI Module    │  SOS Dispatch  │  Geo Intelligence        │  ← Domain Services
│  Signal Fusion│  Event Bus     │  Circuit Breakers        │
│  Simulation   │  Digital Twin  │  Trust / Fraud           │
├──────────────────────────────────────────────────────────┤
│  Drizzle ORM  │  PostgreSQL (Neon serverless)             │  ← Data Layer
└──────────────────────────────────────────────────────────┘
```

Full architecture detail → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (or a [Neon](https://neon.tech) serverless URL)
- OpenAI API key *(optional — rule-based fallback is included)*

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (see docs/CONFIGURATION.md)
cp .env.example .env

# 3. Apply database schema
npm run db:push

# 4. Seed demo data (optional)
npm run db:seed-demo

# 5. Start development server
npm run dev
```

The application is available at `http://localhost:5000`.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@test.com | password123 |
| Volunteer | volunteer@test.com | password123 |
| Citizen | citizen@test.com | password123 |

---

## Example Output

**Incident submitted → AI fusion pipeline response:**

```json
{
  "reportId": "rpt_abc123",
  "fusedScore": 8.4,
  "priority": "CRITICAL",
  "components": {
    "aiUrgency": 9.2,
    "locationRisk": 7.5,
    "repetitionScore": 8.0,
    "userTrustScore": 6.8
  },
  "dispatch": {
    "responderId": "vol_xyz",
    "algorithm": "40% geo + 30% reliability + 20% skill + 10% response-time",
    "estimatedEta": "8 minutes"
  },
  "auditId": "aud_def456",
  "requiresHumanReview": false
}
```

---

## Project Structure

```
crisisconnect/
├── client/src/
│   ├── features/        # Self-contained feature modules (crisis, map, chat, sos…)
│   ├── components/ds/   # Design system primitives (StatCard, SeverityBadge…)
│   ├── modules/         # Page-level feature modules
│   ├── pages/           # Route-level page entry points
│   └── store/           # Zustand global stores
├── server/
│   ├── modules/         # Domain services (ai, sos, geo, simulation, trust…)
│   ├── routes/          # Express route handlers (~50 files)
│   ├── middleware/      # Auth, rate limit, metrics, RBAC
│   ├── workers/         # Background job handlers
│   └── utils/           # Logger, pubsub, clustering, job queue
├── shared/              # Drizzle schema, Zod validators, shared types
├── docs/                # Full documentation
└── k8s/                 # Kubernetes manifests
```

Full annotated breakdown → [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

---

## Configuration

All environment variables with defaults and security guidance → [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

**Minimum required:**

```env
DATABASE_URL=postgresql://user:pass@host/db
SESSION_SECRET=<32+ character random string>
ENCRYPTION_KEY=<32-character hex key>
```

---

## Deployment

Step-by-step local, Docker, and production guides → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

```bash
# Production build
npm run build

# Start production server
npm start
```

Docker Compose and Kubernetes configs are in `docker-compose.yml` and `k8s/`.

---

## Testing

```bash
npm test                   # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Coverage report (v8)
```

Tests are in `tests/unit/` and `tests/integration/` using Vitest + Supertest.

---

## Documentation Index

| Document | Description |
|---|---|
| [API_REFERENCE.md](docs/API_REFERENCE.md) | All endpoints — method, route, auth, request/response examples |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layer diagram, data flow, scalability design decisions |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables, secrets, and feature flags |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branching strategy, PR standards, code conventions |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local, Docker, cloud, and CI/CD step-by-step guides |
| [FEATURE_ENGINEERING.md](docs/FEATURE_ENGINEERING.md) | AI feature pipeline, signal fusion formula, transformations |
| [MODEL_CARD.md](docs/MODEL_CARD.md) | AI model purpose, inputs, outputs, bias and limitations |
| [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Annotated folder-level map of the entire codebase |
| [SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Deep trade-offs, design decisions, scalability patterns |
| [TRAINING_GUIDE.md](docs/TRAINING_GUIDE.md) | Data preparation, fine-tuning, reproducibility guide |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues, error codes, debugging steps |

---

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full workflow.

Quick rules:
- Branch from `main` with prefix: `feat/`, `fix/`, `chore/`
- All PRs must pass `npm run check` (TypeScript) and `npm test`
- No direct pushes to `main`

---

## License

MIT — see [LICENSE](LICENSE).

---

*CrisisConnect — Connecting Communities in Times of Crisis.*
