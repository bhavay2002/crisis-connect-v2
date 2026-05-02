# CrisisConnect — Complete Production-Grade Technical Documentation

> Version: 6.0 (Signal Fusion & Platform Ecosystem Maturity Layer)
> Stack: React 18 + TypeScript + Express.js + PostgreSQL + WebSocket + OpenAI
> Architecture: Monolithic full-stack with modular service layer, event-driven internals, and AI pipeline

---

## 1. Executive Overview

### What Problem It Solves

Natural disasters and civil emergencies generate chaotic, fragmented, and frequently unverified information. First responders, NGOs, and government agencies waste critical minutes cross-referencing reports, tracking resource availability, and dispatching help. CrisisConnect eliminates this coordination gap by providing a single, real-time platform where citizens report incidents, AI validates them, volunteers are intelligently dispatched, and administrators command the response — all in milliseconds.

### Why It Matters

In a mass-casualty event, a 60-second improvement in dispatch time statistically saves lives. CrisisConnect addresses three systemic failures in traditional emergency response:

1. **Information fragmentation**: Reports arrive across phone, SMS, social media, and IoT sensors with no deduplication or prioritization.
2. **Resource blindness**: Responders cannot see real-time resource locations, skills, or availability.
3. **Trust deficit**: Misinformation and false reports in emergencies are common — bad data causes misallocated resources and death.

### Unique Differentiators

- **Multi-signal AI fusion**: Every report receives a fused priority score combining AI urgency (50%), location historical risk (20%), repetition density (20%), and submitter trust (10%) — not just a simple keyword classifier.
- **Explainable AI with full audit trails**: Every AI decision exposes its contributing factors, confidence levels, and reasoning string — auditable by government regulators.
- **Offline-first architecture**: Queued SOS submissions in localStorage survive connectivity loss and flush automatically on reconnect with up to 5 retries.
- **IoT sensor ingestion**: Fire alarms, flood sensors, earthquake monitors, and 5 other sensor types automatically generate and dispatch verified reports without human intervention.
- **SMS fallback**: Twilio-compatible webhook accepts plain SMS keywords (SOS, FIRE, FLOOD) and creates authenticated SOS alerts — enabling participation from feature phones.
- **GDPR-complete compliance layer**: Full data export, account anonymization, consent management, and retention policy enforcement built in from day one.

### Real-World Use Cases

- A flood sensor in a river basin auto-creates a high-severity report and dispatches the 3 nearest water-rescue-trained volunteers within 30 seconds.
- An admin broadcasts a critical evacuation alert to all connected clients via WebSocket in under 200ms.
- A citizen without internet submits "FLOOD" via SMS and receives a TwiML confirmation with their SOS ID.
- An NGO manager views the AI Audit page to explain dispatch decisions to a government oversight committee.

---

## 2. System Architecture

### High-Level Architecture

CrisisConnect is a **unified full-stack monolith** with modular internal service boundaries. A single Node.js process serves both the REST API and WebSocket connections, while the React frontend is served through Vite in development and as a static bundle in production.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React 18 + Vite + Wouter + TanStack Query + Zustand            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  Auth Store  │ │Realtime Store│ │ QueryClient  │            │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘            │
│         │                │                │                      │
│  ┌──────▼────────────────▼────────────────▼───────┐             │
│  │           WebSocketProvider (singleton)         │             │
│  │  One WS connection · exponential backoff       │             │
│  └─────────────────────┬───────────────────────────┘            │
└────────────────────────┼────────────────────────────────────────┘
                         │ WSS + HTTPS
┌────────────────────────┼────────────────────────────────────────┐
│                  SERVER (Node.js / Express)                       │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │  Middleware Pipeline                                      │    │
│  │  CORS → Helmet → Compression → Cookie → Body → Sanitize │    │
│  │  → Prometheus Metrics → Structured Logger → JWT Auth     │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                          │                                        │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │  Route Layer (50+ route files)                            │   │
│  │  auth · reports · resources · aid · sos · analytics      │   │
│  │  admin-command · chat · compliance · developer · IoT     │   │
│  │  integration · geo · simulation · digital-twin · trust   │   │
│  └──────┬───────────────────────────────────────────────────┘   │
│          │                                                        │
│  ┌───────▼──────────────────────────────────────────────────┐   │
│  │  Service Layer (domain modules)                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │ CrisisIntel  │  │SignalFusion  │  │ SmartDispatch │  │   │
│  │  │ Service      │  │ Service      │  │ Service       │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │ RAGKnowledge │  │EventBus      │  │ CircuitBreaker│  │   │
│  │  │ Service      │  │ (singleton)  │  │ + Retry       │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  │   │
│  └──────┬───────────────────────────────────────────────────┘   │
│          │                                                        │
│  ┌───────▼──────────────────────────────────────────────────┐   │
│  │  Data Layer                                               │   │
│  │  Drizzle ORM → Neon PostgreSQL (serverless)              │   │
│  │  In-Memory Cache (LRU, 1000 entries, 5min TTL)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WebSocket Server (ws library, integrated with http.Server)│  │
│  │  JWT auth on upgrade · origin validation · rate limiting  │  │
│  │  AES-GCM optional encryption for sensitive message types  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
  ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
  │  Neon PG DB  │ │  OpenAI API │ │ External APIs│
  │  (serverless)│ │  (GPT-4o)   │ │ OpenMeteo    │
  └──────────────┘ └─────────────┘ │ Nominatim    │
                                    │ Overpass     │
                                    └──────────────┘
```

### Data Flow (Step-by-Step: Report Submission)

1. **Client** — User fills multi-step form, browser captures GPS coordinates.
2. **Client** — `apiRequest("POST /api/reports", body)` sends JWT in `Authorization: Bearer <token>` header.
3. **Server — Middleware** — `authenticateToken` verifies JWT, attaches `req.user`. Rate limiter checks submission frequency. Zod schema validates body shape.
4. **Server — Report Controller** — `report.controller.ts` calls `report.service.ts`.
5. **Server — AI Pipeline** — `CrisisIntelligenceService.analyzeReport()` runs multi-signal analysis (rule-based or GPT-4o-mini). Returns `MultiSignalAnalysisResult`.
6. **Server — Signal Fusion** — `SignalFusionService.computeFusedScore()` queries DB in parallel for location risk, repetition density, and user trust. Computes weighted final score.
7. **Server — Event Aggregation** — `EventAggregationService` checks if report should merge into an existing incident cluster (Haversine ≤ 500m + Jaccard ≥ 0.20).
8. **Server — Database** — Report inserted via Drizzle ORM with AI scores, fused priority, and cluster assignment.
9. **Server — EventBus** — `eventBus.publish({ type: "CRISIS_CREATED", payload: {...} })` fires.
10. **Server — WebSocket Broadcast** — EventBus subscriber calls `wss.clients.forEach(ws => ws.send(...))`, pushing `new_report` to all connected clients.
11. **Client — QueryClient** — Receives `new_report` WS message, calls `queryClient.invalidateQueries(["/api/reports"])`. All subscribed components re-fetch automatically.
12. **Client — UI** — Dashboard and ActiveReports pages update with the new report without any user action.

### Component Interaction Map

```
ReportSubmissionForm → apiRequest → /api/reports (POST)
                                        │
                               ReportController
                                        │
                          ┌─────────────┼──────────────┐
                          ▼             ▼              ▼
                   ReportService  CrisisIntelligence  SignalFusion
                          │       Service              Service
                          │             │              │
                          └─────────────┴──────────────┘
                                        │
                                  DB Insert + Cache Invalidation
                                        │
                                  EventBus.publish(CRISIS_CREATED)
                                        │
                              WebSocket Broadcast → All Clients
```

---

## 3. Tech Stack Deep Dive

### Frontend

| Technology | Why Used |
|---|---|
| **React 18** | Concurrent rendering, `Suspense` boundaries for code-split lazy pages, automatic batching of state updates |
| **TypeScript** | Shared schema types between client and server via `shared/schema.ts` — eliminates an entire class of API contract bugs |
| **Vite** | Sub-second HMR in development, optimized ESM bundle splitting for 40+ lazy routes |
| **Wouter** | Minimal (1.3KB) router with hook-based API; no heavy React Router dependency needed for SPA routing |
| **TanStack Query v5** | Server state management with automatic background refetch, 30s staleTime, global 401→redirect error handler, cache invalidation triggered by WebSocket messages |
| **Zustand v5** | Lightweight client state for auth (`authStore`) and realtime data (`realtimeStore`); module-level selectors prevent over-subscription loops |
| **shadcn/ui + Radix UI** | Accessible, unstyled primitives composed with Tailwind — no fighting with third-party CSS specificity |
| **Tailwind CSS** | Utility-first with a design token system (slate-950 sidebar, red-600 accent, rounded-2xl cards) |
| **Recharts** | Declarative chart library for analytics dashboards — SVG-based, responsive containers |
| **React Leaflet + Leaflet.heat** | Interactive map with heatmap overlay, custom markers, and timeline playback controls |
| **TensorFlow.js + MobileNet** | Client-side image classification — no server round-trip for disaster type detection |
| **Framer Motion** | Page transitions and micro-interactions for emergency UI clarity |

### Backend

| Technology | Why Used |
|---|---|
| **Express.js** | Mature, minimal, well-understood; middleware chain is explicit and debuggable — critical for security audit compliance |
| **TypeScript (tsx)** | Same type system as frontend; `tsx` runs TypeScript directly without a separate compile step in development |
| **express-async-errors** | Automatically wraps all async route handlers with try/catch — no forgotten `next(err)` calls |
| **Helmet.js** | Sets 12 HTTP security headers (CSP, HSTS, COEP, COOP, CORP) in one line |
| **express-rate-limit** | Per-route rate limiting with different profiles: global (100/15min), auth (5/15min), reports (10/15min), AI (20/min) |
| **compression** | Gzip for responses >1KB reduces API payload size ~70% on large report lists |
| **jsonwebtoken + bcryptjs** | Industry-standard JWT (RS256-capable) with bcrypt cost factor 12 for password hashing |
| **ws** | Native WebSocket server library — lighter than Socket.io, full control over connection lifecycle |
| **Drizzle ORM** | Type-safe SQL builder that generates zero-overhead parameterized queries; schema-as-code with Drizzle Kit migrations |

### Database

| Technology | Why Used |
|---|---|
| **PostgreSQL (Neon serverless)** | ACID compliance for financial-grade consistency of emergency records; Neon provides serverless connection pooling eliminating cold-start database provisioning |
| **Drizzle ORM** | Generated SQL is inspectable and auditable — critical when security teams review data access patterns |
| **connect-pg-simple** | PostgreSQL-backed session store — sessions survive server restarts, enabling zero-downtime deployments |

### AI/ML

| Technology | Why Used |
|---|---|
| **OpenAI GPT-4o-mini** | Cost-effective language model for multi-signal report analysis, emotion detection, intent classification, and RAG-augmented copilot responses |
| **Rule-based fallback** | When OpenAI is unavailable, a deterministic rule engine provides graceful degradation with keyword matching, severity weights, and pattern detection |
| **TensorFlow.js MobileNet** | Client-side inference — no latency, no server cost, no PII leaving the browser for image classification |

### Infrastructure / DevOps

| Technology | Why Used |
|---|---|
| **Replit + Neon** | Serverless deployment with auto-scaling WebSocket support; Neon handles connection pooling transparently |
| **esbuild** | Production server bundle in under 2 seconds; treeshaking removes unused service code |
| **Prometheus metrics middleware** | `metricsMiddleware()` tracks request counts, latency histograms, and error rates — ready for Grafana ingestion |
| **Swagger/OpenAPI** | Auto-generated API documentation from JSDoc annotations at `/api-docs` |

---

## 4. Project Structure

### Root Layout

```
/
├── client/src/          # React frontend application
├── server/              # Express backend
├── shared/              # Types and schemas shared between client and server
├── package.json         # Unified monorepo — both client and server in one package
├── vite.config.ts       # Vite configuration (served by server in dev mode)
└── drizzle.config.ts    # Drizzle Kit migration configuration
```

### `shared/` — The Contract Layer

These files are imported by BOTH client and server, enforcing a single source of truth for data shapes.

| File | Purpose |
|---|---|
| `schema.ts` | All 30+ Drizzle table definitions, enums, Zod insert schemas, and TypeScript types |
| `validation.ts` | Shared Zod validation rules (password strength, email format, coordinate bounds) |
| `pagination.ts` | `PaginationParams` type and defaults (page, limit, sort) |
| `filtering.ts` | Generic filter builder types for report/resource queries |
| `changeTracking.ts` | Diff utilities for tracking what fields changed in an update |
| `inputValidation.ts` | Cross-cutting input sanitization functions |

### `server/` — Backend Application

#### `server/index.ts`
Entry point. Configures the full Express middleware chain in strict security order:
1. `trust proxy` — required for real IP detection behind Replit's load balancer
2. CORS with environment-aware origin whitelist
3. Helmet.js (full CSP in production, disabled in dev for Vite HMR compatibility)
4. gzip compression (threshold 1KB, level 6)
5. Cookie parser, JSON body (10MB limit), URL-encoded body
6. `express-mongo-sanitize` — strips `$` and `.` from all inputs
7. Prometheus metrics middleware
8. Structured request/response logger

#### `server/config/`
| File | Purpose |
|---|---|
| `index.ts` | Centralizes all environment variable reads with type coercion and defaults; exported as `config` object |
| `permissions.ts` | 35 fine-grained RBAC actions mapped to allowed roles; `authorize(action)` middleware checks this map |
| `rateLimits.ts` | Named rate limit profiles: `globalLimiter`, `authLimiter`, `reportLimiter`, `aiLimiter` |
| `swagger.ts` | Swagger-jsdoc config for OpenAPI spec generation |

#### `server/db/`
| File | Purpose |
|---|---|
| `db.ts` | Neon serverless PostgreSQL client + Drizzle instance; connection string read from `DATABASE_URL` |
| `storage.ts` | `IStorage` interface with concrete `DatabaseStorage` implementation — all raw DB operations abstracted here |
| `seed.ts` | Development seed data |

#### `server/middleware/`
| File | Purpose |
|---|---|
| `jwtAuth.ts` | `authenticateToken` — extracts `Bearer` token, calls `verifyAccessToken`, attaches `req.user` |
| `roleAuth.ts` | `requireRole(...roles)`, `requireAdmin`, `requireSuperAdmin`, `requireAuthority` — coarse role checks |
| `authorize.ts` | `authorize(action)` — fine-grained RBAC using the permissions map in `config/permissions.ts` |
| `errorHandler.ts` | Global Express error handler: maps `AppError` subclasses to HTTP status codes; logs 5xx errors |
| `auditLog.ts` | Middleware that writes immutable audit entries to `incident_logs` for all state-changing operations |
| `pagination.ts` | Extracts and validates `page`, `limit`, `sort`, `order` from query params |
| `rateLimiting.ts` | Applies named rate limit profiles to routes |
| `wsRateLimiting.ts` | Per-connection WebSocket message rate limiting |
| `metricsMiddleware.ts` | Prometheus counter/histogram instrumentation |
| `apiKeyAuth.ts` | `authenticateApiKey` — looks up SHA-256 hash of `X-API-Key` header, validates tier limits |
| `commonChecks.ts` | Shared pre-flight validators (ownership checks, existence checks) |
| `objectAcl.ts` | Object-level access control for storage objects |
| `apiVersion.ts` | Injects `X-API-Version` header and `X-RateLimit-*` headers on v1 API responses |

#### `server/modules/` — Domain Services

**`ai/`**
| File | Purpose |
|---|---|
| `crisis-intelligence.service.ts` | Core AI analysis: `analyzeReport(input)` → `MultiSignalAnalysisResult`. Runs GPT-4o-mini if available, falls back to rule-based engine. Returns urgency score (0–10), emotion analysis, intent classification, fake detection (0–100), and explainable decision with `auditId`. |
| `signal-fusion.service.ts` | `SignalFusionService.computeFusedScore()` — combines AI urgency (50%), location risk (20%), repetition score (20%), user trust (10%) into `FusedScore` with priority enum: LOW/MEDIUM/HIGH/CRITICAL |
| `event-aggregation.service.ts` | Clusters nearby reports using Haversine (≤500m) + Jaccard semantic similarity (≥0.20). Returns `"created"` or `"merged"` action. |
| `rag-knowledge.service.ts` | RAG copilot: 8 disaster type protocol knowledge base → GPT-4o-mini augmentation → structured output `{ steps[], warnings[], resources[] }` |
| `multimodal.service.ts` | Multimodal analysis combining image metadata (EXIF, hash), text, and location signals |
| `validation.service.ts` | Cross-references new report against similar existing reports for duplicate detection |
| `matching.controller.ts` | AI-powered resource-to-request matching with geographic proximity scoring |
| `crisis-guidance.controller.ts` | Formats copilot responses for the frontend `/copilot` page |

**`sos/`**
| File | Purpose |
|---|---|
| `dispatch.service.ts` | `SmartDispatchService.findBestResponders()` — scores volunteers by 40% geo-distance + 30% reliability + 20% skill-match + 10% response-time. `SLAEscalationService` — 30s/60s/120s tiered escalation. |

**`geo/`**
| File | Purpose |
|---|---|
| `risk-mapping.service.ts` | 0.1° grid-based risk scoring with time decay, severity weights (critical=1.0, high=0.7, medium=0.4, low=0.2), and nighttime bonus. 5 risk levels: very_low → very_high. Route optimizer: waypoint detour around high-risk zones. |

**`trust/`**
| File | Purpose |
|---|---|
| `behavioral-analysis.service.ts` | Per-user behavioral profiling: tracks submission rate, location variance, report frequency. Anomaly flags: excessive_submissions_24h, reports_too_frequent, extreme_location_variance. |

**`events/`**
| File | Purpose |
|---|---|
| `event-bus.ts` | `CrisisEventBus` singleton extending `EventEmitter`. 9 typed event types. Kafka-compatible `publish()/subscribe()` API. Max 50 listeners. |

**`resilience/`**
| File | Purpose |
|---|---|
| `circuit-breaker.ts` | `CircuitBreaker` class: CLOSED → OPEN → HALF_OPEN state machine. Configurable `failureThreshold` (default 5), `timeout` (default 30s), `successThreshold` (default 2). `getCircuitBreaker(name)` singleton factory. |
| `retry.ts` | `withRetry(fn, opts)` — exponential backoff with jitter, configurable max delay, `onRetry` callback |

**`integration/`**
| File | Purpose |
|---|---|
| `maps.service.ts` | Nominatim (OSM) reverse geocode with 24h in-memory cache + circuit breaker |
| `weather.service.ts` | Open-Meteo API — WMO weather codes → alert levels; risk score from precipitation + wind speed |
| `hospitals.service.ts` | Overpass API — nearby hospitals sorted by Haversine distance; static fallback on error |

**`notifications/`**
| File | Purpose |
|---|---|
| `notification.service.ts` | Creates DB notification records; dispatches via WebSocket to specific user connections |

**`simulation/`**
| File | Purpose |
|---|---|
| `simulation-engine.ts` | Generates realistic disaster scenario data for training exercises |

**`digital-twin/`**
| File | Purpose |
|---|---|
| `digital-twin.service.ts` | City node graph with live state — propagates disaster impact across infrastructure nodes |

**`security/`**
| File | Purpose |
|---|---|
| `device-fingerprint.service.ts` | SHA-256 IP+UA fingerprinting; riskScore +30 on multi-account detection; auto-flags at score ≥ 70 |

**`analytics/`**
| File | Purpose |
|---|---|
| `prediction.service.ts` | Historical pattern analysis + weather/seismic correlation → disaster probability predictions |

**`monitoring/`**
| File | Purpose |
|---|---|
| `metrics-store.ts` | Prometheus-compatible metrics storage for request counts, latency, error rates |

#### `server/routes/` — Route Registration (50+ files)

Each file registers a feature domain's routes on the Express app. Key files:

| File | Key Routes |
|---|---|
| `auth.routes.ts` / `newAuth.routes.ts` | `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/me` |
| `reports.routes.ts` | Full CRUD for disaster reports with pagination, filtering, AI analysis |
| `sos.routes.ts` | SOS lifecycle: create, dispatch, respond, resolve, history |
| `aid.routes.ts` | Aid offer CRUD + AI matching |
| `resources.routes.ts` | Resource request CRUD + fulfillment |
| `analytics-advanced.routes.ts` | Peak hours, SLA compliance, resource efficiency, seasonal patterns |
| `ai.routes.ts` | `/analyze`, `/copilot`, `/explain/:id`, `/decisions`, `/early-warning` |
| `admin-command.routes.ts` | Override, assign, escalate, merge incidents |
| `iot.routes.ts` | Sensor event ingestion pipeline |
| `sms.routes.ts` | Twilio-compatible SMS webhook |
| `compliance.routes.ts` | GDPR export, consent management, account deletion |
| `developer-platform.routes.ts` | API key CRUD with tier management |
| `chat.routes.ts` | Rooms, messages, typing indicators, read receipts, pinning |
| `integration.routes.ts` | Maps, weather, hospitals — all through circuit-breaker services |
| `monitoring.routes.ts` | Prometheus metrics, system stats |

#### `server/utils/`
| File | Purpose |
|---|---|
| `cache.ts` | `CacheManager` — 1000-entry LRU, configurable TTL presets (30s → 1h), auto-cleanup every 2 minutes |
| `logger.ts` | Structured logger with severity levels (debug/info/warn/error), context objects, JSON-serializable output |
| `jwtUtils.ts` | `signAccessToken()` (15min), `signRefreshToken()` (7d), `verifyAccessToken()`, `verifyRefreshToken()` |
| `passwordUtils.ts` | bcrypt hash (cost 12) and compare |
| `taskQueue.ts` | In-memory async task queue with retry logic and graceful shutdown hooks |
| `queryMonitor.ts` | Tracks slow queries (> configurable threshold) and logs warnings |
| `streamExport.ts` | Streaming JSON export for large dataset downloads |
| `clustering.ts` | Geographic report clustering utilities |
| `jobQueue.ts` | Background job processor for async AI analysis and notification dispatch |
| `validation.ts` | Server-side Zod validation helpers |

#### `server/shared/`
| Path | Purpose |
|---|---|
| `audit/audit-logger.ts` | Immutable audit log writer — appends to `incident_logs` table |
| `security/encryption.ts` | AES-256-GCM encrypt/decrypt with key derivation; `ENCRYPTION_KEY` env var required in production |
| `security/object-acl.ts` | Object-level ACL checks for storage operations |
| `storage/object-storage.ts` | S3-compatible object storage abstraction (Google Cloud Storage backend) |
| `websocket/ws-encryption.ts` | Optional AES-GCM encryption for sensitive WebSocket message types |

### `client/src/` — Frontend Application

#### `main.tsx`
React 18 `createRoot()` entry; mounts `<App />` with strict mode.

#### `App.tsx`
Router and provider tree. All authenticated routes are wrapped in a single persistent `<DashboardLayout>` instance — navigation never remounts the sidebar. 40+ pages are lazy-loaded with `React.lazy()` and wrapped in `<Suspense fallback={<PageSkeleton />}>`.

```
App
└── ErrorBoundary
    └── QueryClientProvider
        └── LowBandwidthProvider
            └── OfflineSyncProvider
                └── TooltipProvider
                    └── Router
                        ├── (unauthenticated) Landing / Login / Register
                        └── (authenticated) WebSocketProvider
                            └── DashboardLayout   ← persists across all routes
                                └── Switch
                                    ├── /dashboard → Dashboard
                                    ├── /reports → ActiveReports
                                    └── ... (40+ lazy routes)
```

#### `store/`
| File | Purpose |
|---|---|
| `authStore.ts` | Zustand store: `user`, `isAuthenticated`, `isLoading`, `setUser()`, `setLoading()`. Module-level selectors prevent over-subscription. |
| `realtimeStore.ts` | Zustand store: `isConnected`, `unreadCount`, `lastPing`. Actions: `setConnected()`, `setUnreadCount()`, `incrementUnread()`, `ping()`. |
| `index.ts` | Barrel export |

#### `providers/`
| File | Purpose |
|---|---|
| `WebSocketProvider.tsx` | Singleton WS with stable `connect()` function (only depends on `broadcast`). Zustand actions read lazily via `getState()` inside callbacks to prevent render-loop dependencies. Exponential backoff: 2s base → 30s cap × 1.5 multiplier. Invalidates TanStack Query caches on relevant WS events. |

#### `hooks/`
| File | Purpose |
|---|---|
| `useAuth.ts` | Fine-grained Zustand selectors + single combined effect to sync React Query `/api/auth/me` result into store |
| `usePermissions.ts` | `hasPermission(action)` — client-side RBAC for UI visibility |
| `useImageClassification.ts` | TensorFlow.js MobileNet loader + `classify(imageElement)` |
| `usePerformance.ts` | `usePerformanceMark()` for Web Vitals tracking |
| `use-toast.ts` | Toast notification queue |
| `use-mobile.tsx` | Viewport breakpoint detector |

#### `context/`
| File | Purpose |
|---|---|
| `LowBandwidthContext.tsx` | `useLowBandwidth()` — localStorage-persisted toggle; when enabled, components reduce polling frequency and skip non-critical fetches |
| `OfflineSyncContext.tsx` | `useOfflineSync()` — detects `navigator.onLine`, queues SOS in localStorage when offline, auto-flushes with 5-retry exponential backoff on reconnect |

#### `lib/`
| File | Purpose |
|---|---|
| `queryClient.ts` | TanStack QueryClient: `staleTime: 30_000`, `refetchOnWindowFocus: true`, global error handler (401 → clear auth + redirect, 403 → warn) |
| `authUtils.ts` | Token storage helpers: `getAccessToken()`, `setAccessToken()`, `clearTokens()` using `localStorage` |
| `utils.ts` | `cn()` (clsx + tailwind-merge), date formatters |
| `performance.tsx` | Web Vitals observer setup |

#### `modules/` — Feature Pages (by domain)

Each module follows the pattern: one `pages/` directory with lazy-loaded page components.

| Module | Pages | Key Features |
|---|---|---|
| `auth` | Landing, Login, Register, RoleSelection | JWT login, bcrypt auth, role picker |
| `reports` | Dashboard, ActiveReports, ReportDetails, SubmitReport, MyReports, ResponseTeams | Report CRUD, AI validation, voting, clustering |
| `resources` | ResourceRequests, ResourceManagement, SubmitResourceRequest | Resource lifecycle, fulfillment tracking |
| `aid` | AidOffers, SubmitAidOffer, AidOfferMatches, AidMatchingDashboard, VolunteerDashboard, MatchingEngine | AI matching, volunteer hub |
| `admin` | AdminDashboard, AIOverridePage, BroadcastAlerts, DeveloperPlatformPage, DigitalTwinPage, MonitoringPage, OrganizationsPage, SimulationPage, TrustDashboard | Full admin suite |
| `analytics` | AnalyticsDashboard, CrisisCopilot, ExplainabilityPage, ImageClassification, IntelligenceDashboard, MultimodalPage, PredictiveModeling | 7-tab intelligence dashboard, AI audit |
| `map` | Map, RiskMap | Leaflet + heatmap + risk circles |
| `chat` | ChatPage | AES-GCM encrypted messages, typing indicators, read receipts, pinning |
| `user` | UserProfile, IdentityVerification, Notifications, NotificationPreferences, ReputationDashboard, CompliancePage | GDPR, OTP, trust score |

#### `components/`

**`layout/`**
| File | Purpose |
|---|---|
| `DashboardLayout.tsx` | Single persistent layout: `bg-slate-950` sidebar (collapsible, role-filtered nav), `bg-slate-950` header (breadcrumb, notifications, user menu, WS indicator), `bg-slate-900` main content area |
| `ErrorBoundary.tsx` | React error boundary — catches render errors, shows recovery UI |
| `AlertBanner.tsx` | Global broadcast alert banner injected at layout level |

**`shared/`**
| File | Purpose |
|---|---|
| `PageHeader.tsx` | Consistent `text-2xl font-black` page title + description + optional action slot |
| `EmptyState.tsx` | Icon + message + optional CTA for empty data states |
| `PageSkeleton.tsx` | Suspense fallback with animated shimmer |
| `RoleGuard.tsx` | Renders children only if `user.role` is in the allowed list |

**`map/`**
| File | Purpose |
|---|---|
| `HeatmapLayer.tsx` | Leaflet.heat plugin wrapper with weighted data points |
| `HeatmapLegend.tsx` | Color gradient legend overlay |
| `TimelineControl.tsx` | Playback slider for historical heatmap data |
| `LayerControl.tsx` | Toggle panel for map layer visibility |

**`feed/`**
| File | Purpose |
|---|---|
| `DisasterReportCard.tsx` | Report card with severity badge, vote controls, AI score indicator |
| `StatsCard.tsx` | Dashboard KPI card |
| `TrustScoreBadge.tsx` | Visual trust level indicator |
| `RoleBadge.tsx` | Colored role chip |
| `ObjectUploader.tsx` | Uppy-based multi-file uploader for report media |

---

## 5. Core Features Breakdown

### 5.1 Report Submission with AI Validation

**What it does**: Citizens submit structured reports (type, severity, GPS, description, media) which are immediately analyzed by AI, scored for credibility, and broadcast to all connected users.

**How it works internally**:
1. `ReportSubmissionForm.tsx` collects data across 3 steps; GPS is captured via `navigator.geolocation`.
2. Media files uploaded via Uppy to S3-compatible storage; URLs stored in `mediaUrls[]` array.
3. `POST /api/reports` → `ReportController.create()` → `ReportService.createReport()`.
4. `CrisisIntelligenceService.analyzeReport()` runs in the same request cycle (not async) so the saved record already has AI scores.
5. `SignalFusionService.computeFusedScore()` runs concurrently with location risk and repetition queries via `Promise.all()`.
6. `EventAggregationService.processReport()` checks for cluster merge eligibility.
7. Record saved with `aiValidationScore`, `fakeDetectionScore`, `priorityScore`, `fusedPriority`.
8. `eventBus.publish(CRISIS_CREATED)` → WebSocket broadcast → `queryClient.invalidateQueries`.

**Edge cases handled**:
- GPS unavailable: fallback to manual location text entry with geocoding.
- OpenAI timeout: rule-based fallback activates transparently; no 500 error returned.
- Duplicate submission: event aggregation merges the report into existing cluster; user sees acknowledgment.
- Large media files: 10MB body size limit enforced; Uppy shows upload progress and handles chunking.

**Performance considerations**:
- AI analysis adds ~200ms average latency. This is acceptable for emergency submissions.
- Reports list is cached with 30s staleTime on the client; WS invalidation ensures freshness without polling.

### 5.2 Multi-Signal AI Priority Scoring (Signal Fusion)

**What it does**: Produces a single priority score (LOW/MEDIUM/HIGH/CRITICAL) from 4 independent signals.

**Formula**:
```
finalScore = 0.5 × aiUrgency + 0.2 × locationRisk + 0.2 × repetitionScore + 0.1 × userTrustScore
```

**How each component works**:

- **AI Urgency (0.5 weight)**: GPT-4o-mini or rule engine outputs a 0–10 score normalized to 0–1. Factors: keyword intensity, emotion (fear/panic = high), intent (test report = low), disaster type severity baseline.
- **Location Risk (0.2 weight)**: Queries all reports within 5km in the last 30 days. Each report contributes `severity_weight × distance_decay`. Capped at 1.0.
- **Repetition Score (0.2 weight)**: Counts same-type reports within 500m in the last 1 hour. Score = `count / 5`, capped at 1.0. Early warning trigger at ≥ 3 same-type reports per hour.
- **User Trust (0.1 weight)**: Reads `user_reputation.trustScore` (0–100), penalizes by false report rate: `baseScore × (1 - falseRate)`.

**Priority thresholds**: CRITICAL ≥ 0.8, HIGH ≥ 0.6, MEDIUM ≥ 0.35, LOW < 0.35.

### 5.3 WebSocket Real-Time Infrastructure

**What it does**: Maintains one persistent WebSocket connection per browser session, fan-out broadcasts updates to all relevant clients, and handles reconnection automatically.

**How it works**:
- Server: `ws.Server` attached to the same `http.Server` as Express. JWT token validated on `upgrade` event. Each authenticated connection stored in a `Map<userId, WebSocket>`.
- Client: `WebSocketProvider` manages one WS per React tree. `connect()` is a stable callback (never recreated) — it reads Zustand actions lazily inside callbacks via `getState()` to avoid render-loop dependencies.
- Reconnection: exponential backoff using `reconnectDelayRef` (2s → 30s × 1.5 multiplier). `connectRef` pattern ensures `onclose` always calls the latest version of `connect`.
- Components subscribe via `useRealtimeMessage(handler)` — handler is stored in a `handlerRef` so it always uses the latest closure value without causing re-subscriptions.

**Message types and cache invalidation**:
| WS Message Type | Client Action |
|---|---|
| `new_report`, `report_updated`, `report_verified` | Invalidate `/api/reports` |
| `new_notification` | Invalidate `/api/notifications/unread/count`, increment `realtimeStore.unreadCount` |
| `sos_alert` | Invalidate `/api/sos` |
| `notification_count` | Set `realtimeStore.unreadCount` directly |
| `batch_matching_complete` | Invalidate matching + aid + resource queries |

**AES-GCM Encryption**: Sensitive WS message types (chat messages) are optionally encrypted using the `ENCRYPTION_KEY` with a unique IV per message. IV and auth tag stored alongside ciphertext.

### 5.4 SOS Lifecycle Engine

**What it does**: Manages emergency alerts from creation through smart dispatch to resolution, with SLA escalation if response is delayed.

**State machine**: `CREATED → VERIFIED → BROADCASTED → ACCEPTED → IN_PROGRESS → RESOLVED → CLOSED`

**Smart Dispatch formula**:
```
totalScore = (40% × distanceScore) + (30% × reliability) + (20% × skillMatch) + (10% × responseTimeScore)
```

Skill matching: 10 disaster types mapped to required skill sets. Volunteers with matching skills get higher `skillMatch` (60–100 range).

**SLA Escalation**:
- **30 seconds**: Expand search radius, notify additional volunteers.
- **60 seconds**: Notify relevant authorities automatically.
- **120 seconds**: Public broadcast to all connected users.

All transitions logged to `incident_logs` (immutable append-only) with timestamp, actor, reason.

**SMS fallback**: `POST /api/sms/webhook` (Twilio format) — parses "SOS", "FIRE", "FLOOD" etc., creates anonymous SOS with `userId: null`, responds with TwiML `<Message>` confirmation.

### 5.5 Community Trust & Verification System

**What it does**: Maintains report credibility through community voting, AI analysis, and official confirmation, producing a trust score that feeds back into the AI signal fusion.

**Components**:
1. **Upvote/Downvote**: `POST /api/reports/:id/vote` — one vote per user per report. Updates `upvotes`, `downvotes`, recomputes `consensusScore = upvotes / (upvotes + downvotes) * 100`.
2. **AI Fake Detection**: `fakeDetectionScore` (0–100) with specific `fakeDetectionFlags[]` (e.g., `"vague_description"`, `"location_mismatch"`, `"extreme_claims"`).
3. **NGO/Official Confirmation**: `confirmedBy` + `confirmedAt` fields; only ngo/admin/authority roles can confirm.
4. **Behavioral Analysis**: `BehavioralAnalysisService` tracks per-user anomalies; flags suspicious accounts that feed into trust score penalties.
5. **Device Fingerprinting**: SHA-256 IP+UA hash; multi-account detection raises riskScore +30; auto-flag at ≥ 70.

**Trust Badges**: `unverified → trusted → verified_responder → elite_responder` based on `trustScore` thresholds.

### 5.6 AI Crisis Copilot (RAG)

**What it does**: Provides structured, protocol-compliant guidance for any disaster type in English or Hindi.

**How it works**:
1. User sends `POST /api/ai/copilot` with `{ type, location, severity, language }`.
2. `RAGKnowledgeService` retrieves the matching protocol from the in-memory knowledge base (8 disaster types, NDRF guidelines, medical protocols, evacuation procedures).
3. Base protocol is sent as context to GPT-4o-mini, which augments with location-specific advice.
4. Response structured as `{ steps: string[], warnings: string[], resources: string[] }`.
5. If OpenAI unavailable: base protocol returned directly without augmentation.

**Knowledge base coverage**: fire, flood, earthquake, storm, road_accident, epidemic, landslide, gas_leak — each with 8 action steps, 2 safety warnings, and 9 resource items.

### 5.7 IoT Sensor Ingestion Pipeline

**What it does**: Accepts readings from 8 sensor types and automatically creates, prioritizes, and dispatches emergency responses without human involvement.

**Sensor type mapping**:
| Sensor Type | Mapped Disaster | Auto Severity |
|---|---|---|
| `fire_alarm` | fire | high |
| `flood_sensor` | flood | high |
| `earthquake_sensor` | earthquake | critical |
| `gas_detector` | gas_leak | critical |
| `structural_monitor` | building_collapse | high |
| `air_quality` | chemical_spill | medium |
| `tsunami_warning` | flood | critical |
| `landslide_sensor` | landslide | high |

Critical events auto-trigger `SmartDispatchService`. Reports created under a cached system IoT user to avoid authentication requirements.

### 5.8 GDPR Compliance Layer

**What it does**: Provides complete data sovereignty controls for all users.

**Endpoints**:
- `GET /api/compliance/me/export` — JSON export of profile + all reports + SOS + resource requests + consent history.
- `DELETE /api/compliance/me/account` — Anonymizes all user-linked records (nulls `userId` foreign keys), then hard-deletes user. Requires body `{ confirm: "DELETE_MY_ACCOUNT" }`.
- `POST /api/compliance/me/consent` — Records consent with type (data_processing, location_tracking, analytics, marketing, third_party_sharing), IP, user agent, and version string.
- `GET /api/compliance/data-retention` — 7 retention rules, 6 user rights, legal basis per data type.

### 5.9 Offline-First Resilience

**What it does**: Ensures SOS alerts can be queued and submitted even during connectivity loss.

**Implementation**:
1. `OfflineSyncContext` listens to `navigator.onLine` and window `online`/`offline` events.
2. `queueSOS(data)` stores to localStorage with UUID + timestamp when `isOnline === false`.
3. On `online` event, `flushQueue()` iterates the queue, POSTs each SOS with auth token, retries up to 5 times with delay.
4. Dashboard header shows amber `Offline (N queued)` pill when `isOnline === false`.

---

## 6. AI/ML System

### Architecture

CrisisConnect uses a **hybrid AI architecture**: a rule-based deterministic engine for guaranteed availability, augmented by GPT-4o-mini when the OpenAI API is configured. Client-side TensorFlow.js MobileNet handles image classification without server involvement.

### Multi-Signal Analysis Pipeline

```
Input: { title, description, type, severity, latitude, longitude, userId }
                    │
        ┌───────────▼───────────┐
        │  CrisisIntelligence   │
        │  Service              │
        │                       │
        │  GPT-4o-mini? ──────► OpenAI API
        │       │ No            │
        │  Rule-based engine    │
        │       │               │
        │  → UrgencyScore      ◄┘
        │  → EmotionAnalysis
        │  → IntentAnalysis
        │  → FakeDetection
        │  → ExplainableDecision (auditId)
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │  SignalFusionService  │
        │                       │
        │  ┌─ computeLocation  │ ← DB query: nearby reports (30d, 5km)
        │  ├─ computeRepetition│ ← DB query: same type, 1h, 500m
        │  └─ computeUserTrust │ ← DB query: user_reputation
        │  [all 3 via Promise.all()]
        │                       │
        │  FusedScore + Priority│
        └───────────────────────┘
```

### Rule-Based Fallback Engine

When OpenAI is unavailable, the rule engine provides:
- **Urgency**: Scores based on disaster type baselines (earthquake = 8, fire = 7, epidemic = 6...) + severity modifier + keyword intensity boost for words like "trapped", "critical", "multiple victims".
- **Emotion**: Keyword pattern matching for panic indicators.
- **Fake Detection**: Flags short descriptions (<20 chars), placeholder location strings, extreme unverified claims.
- **Explainable Decision**: Full `auditId`, `contributingFactors[]` with weights, `reasoning` string — identical output shape as GPT path.

### Image Classification (Client-Side)

`useImageClassification.ts` loads `MobileNet v2` via `@tensorflow-models/mobilenet` lazy-loaded on the ImageClassification page. The model runs entirely in the browser using WebGL acceleration. Classified outputs are mapped to the platform's 13 disaster types using a category similarity map.

### Predictive Modeling

`prediction.service.ts` correlates:
- Historical report frequency per disaster type per geographic area.
- Current weather data (temperature, precipitation, wind from Open-Meteo).
- Seismic data from USGS API.

Outputs probability predictions with confidence intervals and recommended pre-positioning actions.

### Explainability System

Every AI decision is stored with:
```typescript
interface ExplainableAIDecision {
  auditId: string;            // e.g. "ai-1716432000000-ab3f7c2"
  triggered: boolean;
  confidence: number;         // 0–1
  contributingFactors: [{
    factor: string;           // e.g. "high_urgency_keywords"
    weight: number;           // 0–1
    description: string;
  }];
  reasoning: string;          // Human-readable explanation
  timestamp: string;
  modelVersion: string;
}
```

The `/explainability` frontend page renders signal fusion bar charts, radar plots of 4 components, contributing factor progress bars, and a complete audit trail — designed to satisfy government oversight requirements.

---

## 7. API Documentation

### Authentication

All authenticated endpoints require: `Authorization: Bearer <accessToken>`

Access tokens expire in **15 minutes**. Refresh tokens (7 days) are stored in httpOnly cookies and used via `POST /api/auth/refresh`.

---

#### `POST /api/auth/register`
Register a new user.

**Request**:
```json
{
  "name": "Arjun Sharma",
  "email": "arjun@example.com",
  "password": "Secure123!",
  "role": "citizen"
}
```
**Response** (201):
```json
{
  "user": { "id": "uuid", "name": "Arjun Sharma", "email": "...", "role": "citizen" },
  "accessToken": "eyJ...",
  "message": "Registration successful"
}
```
**Errors**: 400 (validation), 409 (email exists)

---

#### `POST /api/auth/login`
```json
{ "email": "admin@test.com", "password": "Admin1234!" }
```
**Response** (200):
```json
{
  "user": { "id": "...", "role": "admin" },
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```
Sets `refreshToken` httpOnly cookie (7d). Device fingerprint captured non-blocking.

---

#### `POST /api/reports`
Create a disaster report with AI analysis.

**Request**:
```json
{
  "title": "Flooding near Sector 14",
  "description": "Water level rising rapidly, 3 families stranded on rooftop",
  "type": "flood",
  "severity": "critical",
  "location": "Sector 14, Gurugram",
  "latitude": "28.4595",
  "longitude": "77.0266",
  "mediaUrls": ["https://storage.../photo.jpg"]
}
```
**Response** (201):
```json
{
  "id": "uuid",
  "aiValidationScore": 87,
  "fakeDetectionScore": 12,
  "priorityScore": 78,
  "fusedPriority": "HIGH",
  "status": "reported",
  "createdAt": "2026-05-02T10:30:00Z"
}
```

---

#### `POST /api/ai/analyze`
Run multi-signal AI analysis on report content.

**Request**:
```json
{
  "title": "Building collapse",
  "description": "4-storey building collapsed, people trapped",
  "type": "building_collapse",
  "severity": "critical",
  "location": "Mumbai",
  "latitude": "19.0760",
  "longitude": "72.8777",
  "userId": "uuid"
}
```
**Response** (200):
```json
{
  "urgencyScore": { "score": 9.2, "level": "critical", "factors": ["trapped_persons", "structural_failure"] },
  "emotionAnalysis": { "dominantEmotion": "panic", "intensity": 0.9, "isDistressed": true },
  "intentAnalysis": { "isGenuineEmergency": true, "isCasualMention": false, "isTestReport": false, "confidence": 0.95 },
  "fakeDetection": { "score": 5, "isSuspicious": false, "reasons": [] },
  "fusedScore": {
    "finalScore": 0.84,
    "priority": "CRITICAL",
    "components": { "aiUrgency": 0.92, "locationRisk": 0.65, "repetitionScore": 0.40, "userTrustScore": 0.75 },
    "weights": { "aiUrgency": 0.5, "locationRisk": 0.2, "repetitionScore": 0.2, "userTrustScore": 0.1 }
  },
  "explainableDecision": {
    "auditId": "ai-1746175800000-ab3f7c2",
    "confidence": 0.95,
    "contributingFactors": [
      { "factor": "trapped_persons", "weight": 0.35, "description": "Report mentions people trapped" },
      { "factor": "structural_collapse", "weight": 0.30, "description": "Building collapse type" }
    ],
    "reasoning": "Critical priority due to: high AI urgency (9.2/10); elevated location risk (65%)",
    "modelVersion": "gpt-4o-mini-2024"
  }
}
```

---

#### `POST /api/sos`
Create SOS alert.

**Request**:
```json
{
  "emergencyType": "flood",
  "severity": "critical",
  "location": "Anna Nagar, Chennai",
  "latitude": "13.0827",
  "longitude": "80.2707",
  "description": "Water level at chest height, need immediate rescue",
  "contactNumber": "+91-9876543210"
}
```
**Response** (201):
```json
{
  "id": "sos-uuid",
  "status": "active",
  "createdAt": "2026-05-02T10:30:00Z"
}
```
Broadcasts `sos_alert` WS event to all connected clients.

---

#### `GET /api/geo/risk-map`
**Query**: `?lat=19.07&lng=72.87&radius=10`

**Response**:
```json
{
  "cells": [
    {
      "lat": 19.1, "lng": 72.9,
      "riskLevel": "very_high",
      "riskScore": 0.87,
      "reportCount": 12,
      "dominantType": "flood"
    }
  ],
  "generatedAt": "2026-05-02T10:30:00Z"
}
```

---

#### `POST /api/ai/copilot`
**Request**: `{ "type": "flood", "location": "Chennai", "severity": "critical", "language": "en" }`

**Response**:
```json
{
  "steps": [
    "Move to highest floor or rooftop immediately",
    "Signal rescuers with bright cloth or flashlight",
    "..."
  ],
  "warnings": [
    "Do NOT attempt to cross flooded roads",
    "Avoid contact with floodwater — disease risk"
  ],
  "resources": [
    "NDRF Helpline: 011-24363260",
    "State Disaster Management: 1070",
    "..."
  ]
}
```

---

#### `GET /api/analytics/peak-hours`
Returns 24-hour incident distribution with severity-weighted risk index.

**Response**:
```json
{
  "hours": [
    { "hour": 0, "count": 3, "riskIndex": 0.45 },
    { "hour": 1, "count": 1, "riskIndex": 0.22 },
    ...
  ],
  "peakHour": 14,
  "highRiskHours": [2, 3, 14, 15]
}
```

---

#### `POST /api/iot/event`
Ingest sensor reading.

**Request**:
```json
{
  "sensorType": "flood_sensor",
  "value": 2.4,
  "location": "Bandra Bridge, Mumbai",
  "lat": "19.0544",
  "lng": "72.8405",
  "sensorId": "SENSOR-BR-001"
}
```
**Response** (201):
```json
{
  "reportId": "uuid",
  "action": "created",
  "autoDispatch": true,
  "dispatchedVolunteers": 3
}
```

---

#### `POST /api/sms/webhook`
Twilio-compatible SMS ingestion (form-encoded).

**Request Body**: `From=%2B919876543210&Body=FLOOD+Anna+Nagar+Chennai`

**Response** (200 TwiML):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>SOS received (ID: abc123). Help is being dispatched. Stay safe.</Message>
</Response>
```

---

## 8. Database Design

### Schema Overview (30+ Tables)

**Core Domain Tables**

| Table | Primary Key | Key Fields |
|---|---|---|
| `users` | `id` (UUID) | `email`, `password`, `role` (enum), `refreshToken`, identity OTP fields |
| `disaster_reports` | `id` (UUID) | `type`, `severity`, `status`, `latitude`, `longitude`, `aiValidationScore`, `fakeDetectionScore`, `fusedPriority`, `mediaUrls[]` |
| `sos_alerts` | `id` (UUID) | `userId` (nullable — supports anonymous SMS), `emergencyType`, `status`, `respondedBy` |
| `resource_requests` | `id` (UUID) | `resourceType`, `quantity`, `urgency`, `status`, `disasterReportId` (FK) |
| `aid_offers` | `id` (UUID) | `resourceType`, `quantity`, `status`, `matchedRequestId` (FK) |
| `verifications` | `id` (UUID) | `reportId` (FK), `userId` (FK) — unique constraint prevents duplicate verifications |
| `report_votes` | `id` (UUID) | `reportId`, `userId`, `voteType` — unique constraint (one vote per user per report) |
| `messages` | `id` (UUID) | `chatRoomId`, `senderId`, `content`, `isEncrypted`, `encryptionIv`, `isPinned`, `status` |
| `chat_rooms` | `id` (UUID) | `type` (direct/group/report), `relatedReportId`, `relatedSOSId` |

**Trust & Analytics Tables**

| Table | Purpose |
|---|---|
| `user_reputation` | PK = `userId`; `trustScore` (0–100), report/verification/resource counts, `responseTimeAvg` |
| `analytics_events` | Event-sourced analytics: 8 event types with `metadata` JSONB |
| `disaster_predictions` | AI predictions with `riskLevel`, `confidence`, `weatherData` JSONB, `seismicData` JSONB |
| `device_fingerprints` | SHA-256 IP+UA hash, `riskScore`, `isFlagged`, `flagReason` |

**Incident Aggregation Tables (v3.0)**

| Table | Purpose |
|---|---|
| `incidents` | Aggregated multi-report incidents: centroid geo, severity, status, report count |
| `incident_reports` | Join table: `incidents ↔ disaster_reports` |
| `incident_logs` | Immutable append-only state transition log with actor, reason, timestamp |

**Enterprise Tables (v5.0)**

| Table | Purpose |
|---|---|
| `organizations` | Name, type, verification status, active flag |
| `organization_members` | `orgId + userId + role` — supports owner, admin, member roles |
| `api_keys` | SHA-256 hash only (plain key shown once), tier, daily request count, active flag |
| `user_consents` | Per-user per-consentType grants with IP, UA, version, revocation timestamp |
| `inventory_items` | NGO/admin managed supplies with quantity, minimum threshold, expiry |
| `weather_data` | Cached weather snapshots per region with `alertLevel`, `riskScore` |

### Indexing Strategy

Disaster reports carry 7 composite indexes optimized for the platform's query patterns:
```sql
idx_disaster_reports_user_id           -- user dashboard queries
idx_disaster_reports_status            -- active reports list
idx_disaster_reports_type              -- type filtering
idx_disaster_reports_severity          -- severity filtering
idx_disaster_reports_created_at        -- chronological sort
idx_disaster_reports_status_created_at -- active recent (compound)
idx_disaster_reports_type_severity     -- type+severity compound filter
```

Sessions table: `IDX_session_expire` on `expire` column — PostgreSQL `VACUUM` relies on this for session cleanup performance.

### Relationships

```
users ──────────────── disaster_reports (one-to-many)
users ──────────────── resource_requests (one-to-many)
users ──────────────── aid_offers (one-to-many)
users ──────────────── user_reputation (one-to-one)
disaster_reports ────── verifications (one-to-many)
disaster_reports ────── report_votes (one-to-many)
disaster_reports ────── incidents (many-to-many via incident_reports)
resource_requests ───── aid_offers (matchedRequestId FK)
chat_rooms ──────────── messages (one-to-many)
chat_rooms ──────────── chat_room_members (one-to-many)
organizations ───────── organization_members (one-to-many)
```

### Scaling Considerations

- **Neon serverless**: Auto-scaling connection pool handles burst traffic without manual provisioning. Compute suspends when idle, eliminating idle costs.
- **UUID primary keys**: Avoids auto-increment sequence contention on high-write workloads; enables safe multi-region writes.
- **JSONB for metadata**: Flexible schema for AI analysis results, weather data, and analytics event metadata without schema migrations for every new field.
- **Partitioning readiness**: `disaster_reports.created_at` and `analytics_events.created_at` indexed for range queries; table partitioning by month is a natural next step at scale.

---

## 9. Authentication & Security

### JWT Auth Flow

```
Register/Login
      │
      ▼
bcrypt.compare(password, hash)   [cost factor 12]
      │
      ▼
signAccessToken(userId, email, role)   → 15min expiry, signed with ACCESS_TOKEN_SECRET
signRefreshToken(userId)               → 7d expiry, signed with REFRESH_TOKEN_SECRET
      │
      ├── accessToken → response body
      └── refreshToken → httpOnly cookie (Secure, SameSite=Strict, MaxAge=7d)

Subsequent API Requests:
  Authorization: Bearer <accessToken>
      │
      ▼
authenticateToken middleware
  → verifyAccessToken(token)
  → attach req.user = { userId, email, role }

Token Refresh:
  POST /api/auth/refresh
  → reads httpOnly cookie
  → verifyRefreshToken()
  → issues new accessToken (15min)
```

### Role-Based Access Control

**7 Roles** (lowest to highest privilege):
`citizen → volunteer → ngo → government → admin → authority → super_admin`

**35 Fine-Grained Actions** (examples):
```
incident:view          → all roles
incident:create        → citizen, volunteer, ngo, admin, authority, super_admin
incident:override      → admin, authority, super_admin
sos:dispatch           → volunteer, ngo, admin, authority, super_admin
analytics:advanced     → admin, government, authority, super_admin
system:manage          → super_admin
data:export            → admin, authority, super_admin
```

`authorize(action)` middleware reads from `permissions.ts` map and returns 403 with `{ action, role }` in body for audit logging.

### Security Infrastructure

| Layer | Implementation |
|---|---|
| **Transport** | HTTPS enforced via Replit proxy; WebSocket uses WSS |
| **Headers** | Helmet.js: CSP (script-src: self), HSTS (1yr + preload), COEP, COOP, CORP |
| **CORS** | Origin whitelist in production (`FRONTEND_URL`, `*.replit.dev`, `*.repl.co`) |
| **Rate Limiting** | Express-rate-limit: 100/15min global, 5/15min auth, 10/15min reports, 20/min AI |
| **Input Validation** | Zod schemas on every POST/PATCH handler; `express-mongo-sanitize` strips NoSQL injection characters |
| **SQL Injection** | Drizzle ORM generates exclusively parameterized queries — no raw string interpolation |
| **XSS Prevention** | httpOnly cookies for refresh tokens; no `innerHTML` usage in components |
| **Cookie Security** | `httpOnly: true`, `secure: true` (production), `sameSite: strict`, `maxAge: 7d` |
| **Encryption** | AES-256-GCM for WS messages and stored sensitive data; key from `ENCRYPTION_KEY` env |
| **Device Fingerprinting** | SHA-256(IP + UserAgent) → riskScore tracking + multi-account detection |
| **Audit Logging** | All auth events (login, logout, register, failures) written to `incident_logs` |
| **Payload Limits** | 10MB JSON body limit; Uppy handles chunked uploads to storage directly |

### Identity Verification

Three verification channels:
1. **Email OTP**: 6-digit OTP sent via email, stored hashed with 15-minute expiry.
2. **Phone OTP**: SMS via Twilio, same OTP pattern.
3. **Aadhaar (simulated)**: 12-digit Aadhaar number verification flow (UI complete, backend validates format and sets `aadhaarVerified` timestamp).

---

## 10. Deployment

### Local Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL (or Neon account)

# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY

# 3. Push schema to database
npm run db:push

# 4. Seed demo data
npm run db:seed-demo

# 5. Start development server
npm run dev
# → Vite dev server + Express on port 5000
# → HMR active for frontend
# → tsx watch for backend
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon/PostgreSQL connection string |
| `SESSION_SECRET` | ✅ Production | Express session signing key (min 32 chars) |
| `ENCRYPTION_KEY` | ✅ Production | AES-256 key for message encryption (auto-generated in dev) |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT access token signing secret |
| `REFRESH_TOKEN_SECRET` | ✅ | JWT refresh token signing secret |
| `OPENAI_API_KEY` | Optional | Enables GPT-4o-mini AI analysis (rule-based fallback if absent) |
| `FRONTEND_URL` | Production | Allowed CORS origin |
| `PORT` | Optional | Server port (default: 5000) |
| `NODE_ENV` | Auto | `development` or `production` |

### Production Deployment (Replit)

```bash
# Build command (runs automatically on deploy)
npm run build
# → vite build (frontend static bundle)
# → esbuild server/index.ts (server ESM bundle → dist/)

# Start command
npm start
# → NODE_ENV=production node dist/index.js
# → Serves static frontend + API on port 5000
```

Production checklist:
- `SESSION_SECRET`: Long random string (use `openssl rand -hex 32`)
- `ENCRYPTION_KEY`: 32-byte hex key
- `DATABASE_URL`: Production Neon connection string with SSL
- `OPENAI_API_KEY`: Set for AI features
- CSP headers: Active (Helmet enabled in production)
- HSTS: Active (1 year, preload)

### Scaling Strategy

1. **Horizontal scaling**: Stateless API (JWT auth, no in-memory session data per-request) — multiple instances can run behind a load balancer. WebSocket connections need sticky sessions or a Redis pub/sub adapter for cross-instance broadcast.
2. **Database**: Neon serverless handles connection pooling automatically. For extreme write loads, consider read replicas for analytics queries.
3. **Cache**: Current in-memory cache is per-process. For multi-instance, upgrade to Redis (drop-in replacement using same `CacheManager` interface).
4. **AI inference**: OpenAI API rate limits are the main constraint. Add request queuing via `jobQueue.ts` and implement per-tenant rate limit tracking.

---

## 11. Performance Optimization

### Client-Side

| Optimization | Implementation |
|---|---|
| **Code splitting** | 40+ lazy routes with `React.lazy()` + `Suspense` — initial bundle is auth pages only (~50KB) |
| **Persistent layout** | `DashboardLayout` mounts once in `App.tsx` — sidebar never remounts on navigation |
| **TanStack Query caching** | `staleTime: 30_000` — same data served from cache for 30s without refetch |
| **WS-driven invalidation** | Reports/notifications refresh only when relevant WS messages arrive — zero polling |
| **React 18 batching** | All synchronous state updates inside effects are automatically batched into one render |
| **Zustand selectors** | Module-level selectors (`selectUser`, `selectIsAuth`) prevent over-subscription — components only re-render for their exact slice |
| **MobileNet lazy load** | TensorFlow.js model loads only when user navigates to ImageClassification page |
| **Low-bandwidth mode** | When enabled, non-critical queries are skipped; polling intervals extended |

### Server-Side

| Optimization | Implementation |
|---|---|
| **In-memory cache** | `CacheManager` with LRU eviction (1000 entries), TTL presets (30s–1h), `getOrSet()` pattern |
| **gzip compression** | All API responses >1KB compressed at level 6; typical savings 65–75% on JSON payloads |
| **Database indexes** | 7 compound indexes on `disaster_reports`; index on `sessions.expire` for cleanup |
| **Query monitor** | `queryMonitor.ts` logs slow queries above configurable threshold |
| **Streaming exports** | Large data exports use `streamExport.ts` — prevents memory spikes from loading full datasets |
| **Circuit breakers** | External API failures fail fast; cached results served immediately from OPEN state |
| **Prometheus metrics** | Request latency histograms identify slow endpoints in production |
| **Exponential backoff** | `withRetry()` prevents thundering herd on external API recovery |

### Cache Invalidation Strategy

Write-through invalidation: whenever a report is created/updated, cache entries matching `report:*` patterns are deleted. This ensures no stale data is served while avoiding cache stampedes (new cache entries are populated on the next read).

---

## 12. Testing

### Test Strategy (Current State)

The platform is structured for testability with clear service boundaries and dependency injection patterns:

**Unit test targets**:
- `SignalFusionService.computeFusedScore()` — deterministic with mocked DB queries
- `SmartDispatchService.findBestResponders()` — scoring formula with fixture data
- `CircuitBreaker` state machine — all 3 transitions with controlled failures
- `CacheManager` — TTL expiry, LRU eviction, pattern deletion
- JWT utils — sign/verify roundtrip, expiry validation

**Integration test targets**:
- `POST /api/auth/login` → JWT issuance → `GET /api/auth/me` → valid user returned
- `POST /api/reports` → AI analysis called → report saved with scores → WS broadcast fired
- `POST /api/sos` → dispatch triggered → SLA escalation timer started
- `POST /api/sms/webhook` → anonymous SOS created → TwiML response correct

**Load test targets**:
- WebSocket: 500 concurrent connections, 1000 messages/second — verify broadcast latency <100ms
- Report submission: 50 req/second — verify rate limiter fires at 11th request per 15min window per IP
- Analytics queries: complex aggregation under concurrent load — verify cache hit rate >80%

**Edge case validation**:
- OpenAI timeout → rule-based fallback returns valid `MultiSignalAnalysisResult`
- Offline queue flush → 5-retry exhaustion → graceful failure logged
- JWT expiry during session → `POST /api/auth/refresh` succeeds → new token issued
- Rate limit burst → 429 with `Retry-After` header
- Duplicate report → event aggregation merges → original report's cluster updated

### Recommended Test Stack
```
Unit:        Vitest (fast ESM-compatible, same TS config as app)
Integration: Supertest (in-process Express testing, no port required)
E2E:         Playwright (browser automation, WebSocket testing built-in)
Load:        k6 (WebSocket load testing native support)
```

---

## 13. Logging & Monitoring

### Structured Logger

`server/utils/logger.ts` implements a structured logger with 4 severity levels:

```typescript
logger.debug("Cache cleanup completed", { entriesRemoved: 3, remainingEntries: 997 });
logger.info("GET /api/reports 200", { method: "GET", url: "/api/reports", statusCode: 200, duration: "18ms", ip: "..." });
logger.warn("Authentication failed", { path: "/api/auth/me", userId: null });
logger.error("Database connection error", error, { query: "SELECT...", retryAttempt: 2 });
```

Every log entry includes: timestamp (ISO 8601), level, message, and a context object with structured fields — JSON-serializable for log aggregation platforms (Datadog, CloudWatch, Loki).

### Prometheus Metrics

`metricsMiddleware.ts` instruments:
- `http_requests_total` (counter, labeled by method + route + status)
- `http_request_duration_seconds` (histogram, labeled by method + route)
- `websocket_connections_active` (gauge)
- `cache_hits_total` / `cache_misses_total` (counters)

Exposed at `GET /api/monitoring/stats` for scraping.

### Application-Level Monitoring

`MonitoringPage.tsx` (`/monitoring`) displays:
- System health: normal/warning/critical status
- Request rate, error rate, average latency
- WebSocket connection count
- Cache hit rate
- Database query statistics

### Error Tracking

`errorHandler.ts` global handler:
- Maps `AppError` subclasses (ValidationError, NotFoundError, AuthorizationError) to HTTP status codes
- Logs all 5xx errors with full stack traces
- Returns sanitized error messages to clients (no stack traces in production)
- `express-async-errors` ensures no unhandled promise rejections reach the process level

### Audit Trail

All state-changing operations on incidents write to `incident_logs`:
```sql
INSERT INTO incident_logs (incidentId, action, previousState, newState, actor, reason, createdAt)
VALUES (...)
```
Query: `GET /api/compliance/audit-trail?userId=X&page=1` — paginated, filterable by user.

---

## 14. Data Flow Pipeline

### End-to-End Request: Report Submission → Dashboard Update

```
Browser (User Action)
        │
        │  1. Form submit → captureGPS() → buildFormData()
        ▼
React (apiRequest)
        │
        │  2. POST /api/reports
        │     Authorization: Bearer eyJ...
        ▼
Express Middleware Chain
        │
        │  3. CORS check → Helmet headers → compression → cookie parse
        │  4. body parse → mongo sanitize → Prometheus counter++
        │  5. authenticateToken → verifyJWT → req.user = { userId, email, role }
        │  6. rateLimiter.check() → (pass or 429)
        │  7. Zod schema validation → (pass or 400)
        ▼
ReportController.create()
        │
        │  8. Call ReportService.createReport(data, userId)
        ▼
ReportService (parallel execution)
        │
        │  9a. CrisisIntelligenceService.analyzeReport()
        │      → OpenAI GPT-4o-mini OR rule engine
        │      → MultiSignalAnalysisResult (urgency, emotion, intent, fakeDetection)
        │
        │  9b. SignalFusionService.computeFusedScore()
        │      → Promise.all([locationRisk, repetitionScore, userTrust])
        │      → FusedScore { finalScore: 0.84, priority: "CRITICAL" }
        │
        │  9c. EventAggregationService.processReport()
        │      → Haversine + Jaccard check → { action: "created" or "merged" }
        ▼
Drizzle ORM → PostgreSQL (Neon)
        │
        │  10. INSERT INTO disaster_reports WITH ai_scores
        │  11. Cache invalidation: cache.deletePattern("reports:*")
        ▼
EventBus
        │
        │  12. eventBus.publish({ type: "CRISIS_CREATED", payload: { reportId, ... } })
        ▼
WebSocket Broadcast Subscriber
        │
        │  13. wss.clients.forEach(ws => ws.send(JSON.stringify({ type: "new_report", data: { reportId } })))
        ▼
All Connected Browser Clients
        │
        │  14. WebSocketProvider.onmessage → broadcast(msg)
        │  15. useRealtimeMessage handler fires in Dashboard/ActiveReports components
        │  16. queryClient.invalidateQueries(["/api/reports"])
        ▼
TanStack Query
        │
        │  17. Background refetch: GET /api/reports → fresh data
        │  18. React re-renders updated report list
        ▼
User sees new report appear within ~500ms of submission
```

---

## 15. Scalability Design

### Current Architecture Capacity

The monolith on a single Replit instance handles:
- ~200 concurrent WebSocket connections
- ~500 API requests/minute (before rate limiter triggers)
- ~50 AI analysis requests/minute (OpenAI rate limit dependent)

### Horizontal Scaling Path

**Phase 1 — Multi-instance API**:
Replace in-memory `CacheManager` with Redis (same interface, swap implementation). Replace `CrisisEventBus` with Redis pub/sub for cross-process event delivery. Add sticky-session load balancing for WebSocket connections.

**Phase 2 — WebSocket Separation**:
Extract WebSocket server to a dedicated process (or use a managed service like Ably/Pusher). REST API instances scale independently from WS instances.

**Phase 3 — AI Queue**:
Move `CrisisIntelligenceService.analyzeReport()` out of the request cycle into `jobQueue.ts`. Return `reportId` immediately (202 Accepted); AI scores filled asynchronously. Clients poll or receive WS update when scores are ready.

**Phase 4 — Read Replica**:
Move analytics queries (`/api/analytics/*`, `/api/intelligence/*`) to a PostgreSQL read replica. Write path remains on primary.

### Bottlenecks

| Bottleneck | Current Mitigation | At-Scale Solution |
|---|---|---|
| AI analysis latency | Rule-based fallback | Async queue + webhook/WS notification |
| In-memory cache | LRU eviction at 1000 entries | Redis with configurable memory |
| WebSocket fan-out | Single process broadcast | Redis pub/sub adapter for ws library |
| Database connections | Neon serverless pooling | PgBouncer with transaction mode pooling |
| OpenAI rate limits | Per-minute limiters | Per-tenant quotas + request queuing |

### Future-Proofing

- **Multi-tenancy**: `organizations` table already exists; adding `organizationId` FK to `disaster_reports` enables tenant isolation without schema redesign.
- **Multi-region**: UUID PKs and event-sourced `incident_logs` are conflict-free; Neon supports multi-region with global routing.
- **API versioning**: `apiVersion.ts` middleware injects `X-API-Version` headers; URL path versioning (`/api/v2/`) can be added without breaking existing consumers.

---

## 16. Future Improvements

### AI Upgrades

- **Fine-tuned disaster classifier**: Train a custom model on verified CrisisConnect reports for higher accuracy than general GPT-4o-mini.
- **Real-time video analysis**: Extend `multimodal.service.ts` to process video streams from CCTV APIs.
- **Predictive pre-dispatch**: Use seasonal patterns + weather forecasts to pre-position volunteers before disasters occur.
- **NLP entity extraction**: Extract victim counts, specific addresses, and medical conditions from freetext descriptions.

### Platform Evolution

- **Mobile apps**: React Native app sharing the same backend and WS infrastructure. Push notifications via FCM/APNs.
- **WhatsApp integration**: Twilio WhatsApp Business API for richer bot interactions (image submission, location sharing).
- **Drone coordination**: IoT ingestion API already supports arbitrary sensor types; drone telemetry fits the same pattern.
- **Multi-language UI**: i18n framework (react-i18next) with Hindi, Tamil, Telugu translations — aligned with NDRF's operational languages.
- **GIS integration**: Replace OpenStreetMap tiles with ISRO Bhuvan satellite imagery during active disaster events.
- **Blockchain audit**: Export `incident_logs` to an immutable blockchain ledger for tamper-proof government audit trails.
- **Digital Twin expansion**: Current city-node model → real-time integration with smart city APIs (traffic, power grid, water network).

### Architecture Improvements

- **GraphQL subscriptions**: Replace ad-hoc WS message types with a typed GraphQL subscription schema.
- **CQRS**: Separate read models (analytics, reporting) from write models (incident creation) for independent scaling.
- **Kubernetes deployment**: Containerize with Docker; Helm chart for multi-region k8s deployment.

---

## 17. Contribution Guide

### How to Contribute

1. **Fork** the repository and create a feature branch from `main`.
2. **Read** the architecture sections above before writing code — understand the service boundaries and middleware chain.
3. **Run** the development environment: `npm install && npm run db:push && npm run dev`.
4. **Write** your changes following the code standards below.
5. **Test** manually against the demo data (`npm run db:seed-demo`).
6. **Submit** a pull request with a clear description of: what changed, why, and what was tested.

### Code Standards

**TypeScript**:
- All new code must be typed — no `any` without explicit justification in a comment.
- Shared types go in `shared/schema.ts` or `shared/validation.ts` — never duplicate type definitions.
- Use `z.infer<typeof schema>` for request body types, not hand-written interfaces.

**Backend**:
- New features belong in `server/modules/<domain>/` with a `service.ts` and a route file in `server/routes/`.
- All external API calls go through `server/modules/integration/` with a circuit breaker.
- All async route handlers must use `express-async-errors` (already configured globally — just use `async (req, res) =>` without try/catch).
- All state-changing admin operations must write to `incident_logs`.
- New environment variables must be added to `server/config/index.ts` with a default or fail-fast validation.

**Frontend**:
- New pages are lazy-loaded: `const MyPage = lazy(() => import("@/modules/.../MyPage"))`.
- Pages do NOT import `DashboardLayout` — the layout is provided by `App.tsx`.
- Data fetching uses TanStack Query — no `useEffect` for fetching.
- WS subscriptions use `useRealtimeMessage(handler)` — no direct WebSocket access from page components.
- Zustand state accessed via module-level selectors — no whole-store subscriptions.
- All navigation uses `<Link href="...">` from Wouter — no inner `<a>` tags.

**Design System**:
- Cards: `rounded-2xl border shadow-sm`
- Primary accent: `red-600` / `red-700` hover
- Sidebar and header: `bg-slate-950`
- Main content area: `bg-slate-900`
- Page titles: `text-2xl font-black`
- Icon badges: `w-10 h-10 rounded-xl bg-[color]-500/10`

### Branching Strategy

```
main           ← production-ready, always deployable
feature/*      ← new features (e.g. feature/iot-geofencing)
fix/*          ← bug fixes (e.g. fix/ws-reconnect-loop)
chore/*        ← dependencies, config, refactoring
```

All branches merge to `main` via pull request with at least one review.

### Adding a New Feature: Checklist

- [ ] Service created in `server/modules/<domain>/`
- [ ] Route file created in `server/routes/` and registered in `server/routes/index.ts`
- [ ] RBAC actions added to `server/config/permissions.ts` if needed
- [ ] Drizzle schema updated in `shared/schema.ts` + `npm run db:push` run
- [ ] Cache invalidation added for any new write endpoints
- [ ] Audit logging added for admin operations
- [ ] Swagger JSDoc annotations added to route handlers
- [ ] Frontend lazy route added to `App.tsx`
- [ ] Navigation link added to `DashboardLayout.tsx` NAV_GROUPS with role filter
- [ ] `replit.md` updated with new feature description

---

## 18. Summary

### Key Takeaways

CrisisConnect is not a prototype — it is an end-to-end production system with enterprise security, AI explainability, offline resilience, and regulatory compliance built in from the ground up. Every architectural decision reflects real emergency management requirements.

### System Strengths

| Strength | Evidence |
|---|---|
| **Reliability** | Circuit breakers on all external APIs; rule-based AI fallback; offline SOS queue with 5-retry flush |
| **Security** | JWT + httpOnly cookies; Helmet CSP; AES-GCM WS encryption; RBAC with 35 actions; device fingerprinting |
| **Transparency** | Every AI decision carries an auditId, contributing factors, confidence score, and reasoning string |
| **Compliance** | Full GDPR implementation: export, anonymization, consent history, retention policy |
| **Real-time** | Singleton WebSocket with exponential backoff; TanStack Query invalidation on WS events; zero polling |
| **Scalability** | UUID PKs; stateless JWT auth; cache-manager with Redis upgrade path; event bus with Kafka-compatible API |
| **Developer Experience** | Shared TypeScript schema; unified monorepo; Swagger docs; Prometheus metrics; structured logging |

### Innovation Highlights

1. **Signal Fusion Engine** — Combining 4 independent data signals (AI, geo, repetition, trust) into a single actionable priority score with full explainability is novel in open-source disaster management platforms.

2. **Persistent Layout Architecture** — Lifting `DashboardLayout` to the router level gives users a true SPA experience where the sidebar state, scroll position, and WS connection survive page transitions without any SSR complexity.

3. **IoT → Auto-Dispatch Pipeline** — The full pipeline from sensor reading to volunteer dispatch in under 30 seconds, without human intervention, represents production-grade emergency automation.

4. **SMS + Offline + IoT Ingestion Convergence** — Three different offline/device channels (SMS via Twilio, localStorage queue, IoT sensor) all feed into the same SOS lifecycle engine, making the platform accessible across the full connectivity spectrum from no internet to sensor grid.

5. **Typed Internal Event Bus** — The `CrisisEventBus` with Kafka-compatible API (`publish()/subscribe()`) and 9 typed events provides a clean architectural boundary that enables future extraction to a real message broker (Kafka, RabbitMQ) with zero code changes at the call sites.
