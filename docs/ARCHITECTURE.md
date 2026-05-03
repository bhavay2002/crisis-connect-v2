# Architecture

## Purpose

Describes the layered architecture of CrisisConnect — how each layer is organized, how data flows between them, and the design decisions that govern scalability and resilience.

---

## Overview

CrisisConnect is a full-stack TypeScript monorepo with three primary tiers: a React client, an Express API server, and a PostgreSQL data layer. The server is further divided into domain modules, each owning its own routes, services, and data access logic.

---

## Layer Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT (React 18)                      │
│  Features  │  Design System  │  Stores (Zustand)  │  Wouter   │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTPS / WSS (port 5000)
┌───────────────────────────▼────────────────────────────────────┐
│                       API GATEWAY (Express 4)                  │
│  JWT Auth  │  Rate Limiting  │  Helmet  │  Zod Validation      │
│  Audit Logging  │  Metrics Middleware  │  CORS                 │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│                     DOMAIN SERVICES                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ AI Layer │  │SOS Engine│  │  Geo     │  │  Event Bus   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │Simulation│  │DigitalTwin│ │  Trust   │  │  Resilience  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└───────────────────────────┬────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────┐
│                       DATA LAYER                               │
│  Drizzle ORM  │  PostgreSQL (Neon serverless)                  │
│  In-memory cache  │  Background job queue  │  WS broadcast     │
└────────────────────────────────────────────────────────────────┘
```

---

## Detailed Breakdown

### 1. Client Layer (`client/src/`)

**Framework:** React 18 + Vite, TypeScript strict mode.

**State management:**

| Store | Library | Scope |
|---|---|---|
| Server state | TanStack Query v5 | API cache, background refetch, pagination |
| UI/Client state | Zustand v5 | Auth session, WS connection, selected incident |
| Form state | React Hook Form + Zod | All form inputs with validation |

**Routing:** Wouter with `React.lazy` + `Suspense` for all 40+ pages — zero bundle cost for unvisited routes.

**Real-time:** A singleton `WebSocketProvider` maintains one WS connection per browser session. All components subscribe via `useRealtimeMessage(handler)`. Exponential backoff reconnect (2s → 30s max).

**Feature architecture:** Each feature under `client/src/features/` is a self-contained module:
```
features/crisis/
├── types.ts          # TypeScript interfaces
├── crisis.api.ts     # API call functions
├── crisis.store.ts   # Zustand slice
├── hooks/            # useCrisisRealtime, useCrisisActions…
└── components/       # ActionPanel, CriticalBadge…
```

Pages in `client/src/pages/` are composition-only orchestrators.

**Design system (`client/src/components/ds/`):**

| Component | Purpose |
|---|---|
| `SeverityBadge` | Canonical severity pill — replaces 50+ ad-hoc color maps |
| `StatCard` | Metric card with icon, value, trend, severity tint |
| `SectionHeader` | Page header with badge, live indicator, and actions slot |
| `LiveIndicator` | Pulsing live/offline dot with optional label |
| `EmptyState` | Consistent zero-data state with icon, title, action |

---

### 2. API Gateway Layer

**Framework:** Express.js 4 with ESM modules, TypeScript 5.6.

**Middleware stack (execution order):**

```
1.  express.json() + urlencoded()
2.  compression (gzip for responses >1KB)
3.  helmet (CSP, HSTS, X-Content-Type)
4.  cors (origin allowlist)
5.  express-mongo-sanitize (NoSQL injection prevention)
6.  cookieParser
7.  metricsMiddleware (records all requests on res.finish)
8.  requestLoggingMiddleware (structured JSON logs)
9.  JWT authentication (per-route via jwtAuth middleware)
10. authorize(action) RBAC middleware (per-route)
11. route handlers
12. notFoundHandler (JSON 404 for /api/* routes)
13. errorHandler (standardized JSON error envelope)
```

**Route organization:** Each domain has its own route file in `server/routes/`. All files are registered in `server/routes/index.ts`.

---

### 3. Domain Services (`server/modules/`)

| Module | Key Services | Responsibility |
|---|---|---|
| `ai/` | `crisis-intelligence`, `signal-fusion`, `multimodal`, `rag-knowledge`, `event-aggregation` | AI scoring, fusion, copilot, deduplication |
| `sos/` | `dispatch.service` | Smart dispatch, SLA escalation timers |
| `geo/` | `risk-mapping.service` | Grid-based risk scoring, route optimization |
| `simulation/` | `simulation-engine` | Synthetic crisis injection for load testing |
| `digital-twin/` | `digital-twin.service` | City graph model, crisis propagation |
| `trust/` | `behavioral-analysis.service` | Per-user trust scoring, anomaly detection |
| `security/` | `device-fingerprint.service` | IP+UA fingerprinting, multi-account detection |
| `predictions/` | `predictive-response.service` | ML-based disaster forecasting |
| `resilience/` | `circuit-breaker`, `retry` | External API protection patterns |
| `integration/` | `maps.service`, `weather.service` | Nominatim, Open-Meteo, Overpass APIs |
| `events/` | `event-bus` | Typed internal event bus (9 event types) |
| `monitoring/` | `metrics-store` | Prometheus-format metrics collection |
| `webhooks/` | `webhook-dispatcher` | HMAC-signed external webhook fan-out |

---

### 4. Data Layer

**ORM:** Drizzle ORM with `@neondatabase/serverless` driver.

**Key tables:**

| Table | Purpose |
|---|---|
| `users` | Accounts with 7-value role enum |
| `disaster_reports` | Core incident records with AI scores and media URLs |
| `sos_alerts` | SOS events with full state machine |
| `incidents` | Aggregated multi-report incidents |
| `incident_logs` | Immutable append-only audit trail |
| `ai_overrides` | Human review queue for AI decisions |
| `organizations` | Multi-tenant org layer with member roles |
| `weather_data` | Cached weather snapshots per region |
| `city_nodes` / `city_edges` | Digital twin infrastructure graph |
| `simulation_runs` | Simulation history with injected event IDs |
| `api_keys` | Developer API key registry (SHA-256 hash only) |
| `webhook_subscriptions` / `webhook_deliveries` | Developer platform delivery log |
| `device_fingerprints` | Security fingerprint tracking |
| `user_consents` | GDPR consent records |

---

## Data Flow

### Incident Report Submission

```
Client form submit
    → POST /api/reports (Zod validation)
    → AI multi-signal analysis (crisis-intelligence.service)
    → Signal fusion (signal-fusion.service)
    → Event aggregation / deduplication (event-aggregation.service)
    → Insert disaster_reports row
    → eventBus.publish("CRISIS_CREATED")
    → WebSocket broadcast to all clients
    → Smart dispatch evaluation (dispatch.service)
    → SLA escalation timers registered
    → Response: { reportId, fusedScore, priority, dispatch, auditId }
```

### SOS Lifecycle State Machine

```
POST /api/sos
    → Insert sos_alerts (status: CREATED)
    → SmartDispatch: score = 40%geo + 30%skill + 15%avail + 15%rep
    → Assign responder → broadcast sos_dispatch_notification
    → t+30s: SLAEscalationService → expand radius, retry dispatch
    → t+60s: notify authorities → broadcast escalation alert
    → t+120s: public broadcast → all connected clients
    → Responder PATCH /api/sos/:id → transitions logged to incident_logs
    → Final state: RESOLVED | CLOSED
```

### WebSocket Event Fan-out

```
eventBus.publish({ type: "CRISIS_CREATED", payload: { ... } })
    → CrisisEventBus (extends EventEmitter)
    → registered listener in routes/index.ts
    → broadcastToAll({ type: "NEW_CRISIS", ... })
    → ws.send() to every connected WebSocket client
    → Client WebSocketProvider → useRealtimeMessage handlers
    → TanStack Query cache invalidation → UI update
```

---

## Scalability Design

### Horizontal Scaling

- **Stateless API pods:** Session state lives in PostgreSQL (connect-pg-simple). JWT auth is stateless.
- **WebSocket fan-out:** Currently in-process. Multi-pod deployments replace in-memory pub/sub with Redis — `server/utils/pubsub.ts` handles both modes transparently via `REDIS_URL`.
- **Job queue:** `server/utils/jobQueue.ts` is in-process. Redis-backed Bull is the documented multi-pod upgrade path.
- **AI analysis:** Offloaded to `server/workers/ai-analysis.worker.ts` via job queue — the API pod never blocks on AI calls.

### Caching Strategy

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| Disaster reports list | In-memory LRU | 30s | On new report insert |
| User stats | In-memory | 60s | On user update |
| Geocode results | In-memory | 24h | Never (stable geographic data) |
| Weather data | PostgreSQL row | On-demand fetch | On `GET /api/integration/weather` |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| ESM modules (Node 20) | Native `import/export`, no CommonJS interop complexity |
| Drizzle ORM over Prisma | Lighter runtime, better Neon serverless compatibility |
| Zustand over Redux | Simpler boilerplate, no action/reducer ceremony for UI state |
| Wouter over React Router | Smaller bundle, sufficient for SPA routing patterns |
| Circuit breakers on all external calls | External APIs fail during disasters — fallbacks prevent cascading failures |
| Typed event bus | Decouples modules without a message broker in single-pod deployments |
| Feature-based frontend | Domain teams can own their feature folder independently |

---

## Edge Cases & Limitations

- **WebSocket multi-pod:** In-process pub/sub does not fan out across multiple server pods. Redis is the documented upgrade path (already abstracted).
- **AI fallback accuracy:** Rule-based scoring is significantly less accurate than GPT-4o-mini, particularly for nuanced or multilingual reports.
- **Neon cold-start latency:** First query after idle can add 200–500ms. Use connection pooling in production.
- **Digital twin defaults:** The Mumbai-inspired 15-node seed is illustrative. Real deployments must seed actual city infrastructure.

---

## Related Docs

- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) — deeper trade-off analysis
- [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) — AI pipeline internals
- [DEPLOYMENT.md](DEPLOYMENT.md) — running in production
- [CONFIGURATION.md](CONFIGURATION.md) — all environment variables
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — full directory map
