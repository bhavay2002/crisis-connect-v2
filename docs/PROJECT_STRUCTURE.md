# Project Structure

## Purpose

Annotated directory map of the CrisisConnect codebase. Use this document to orient yourself before exploring or modifying specific areas.

---

## Overview

CrisisConnect is a TypeScript monorepo with a React frontend, an Express backend, and a shared schema layer. All three share the same `node_modules` and TypeScript configuration.

---

## Top-Level Directory

```
crisisconnect/
├── client/           # React frontend application
├── server/           # Express backend application
├── shared/           # Types and schemas shared between client and server
├── docs/             # Project documentation (this folder)
├── tests/            # Test suites (unit + integration)
├── k8s/              # Kubernetes manifests
├── scripts/          # Utility scripts
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── drizzle.config.ts # Drizzle Kit migration configuration
├── tsconfig.json     # Root TypeScript config (references client + server)
├── vite.config.ts    # Vite configuration (dev server + build)
├── vitest.config.ts  # Vitest test runner configuration
└── package.json      # Root package — scripts run both client and server
```

---

## Client (`client/`)

```
client/
└── src/
    ├── app/                    # App-level wiring
    │   ├── providers/          # Barrel for WebSocketProvider
    │   └── store/              # Barrel for global Zustand stores
    │
    ├── components/
    │   ├── ds/                 # Design system primitives
    │   │   ├── StatCard.tsx        # Metric card with icon/value/trend
    │   │   ├── SeverityBadge.tsx   # Severity pill (critical/high/medium/low)
    │   │   ├── SectionHeader.tsx   # Page header with badge + actions slot
    │   │   ├── LiveIndicator.tsx   # Pulsing live/offline dot
    │   │   └── EmptyState.tsx      # Zero-data state with icon + action
    │   │
    │   ├── ai/                 # AI explainability widgets
    │   │   ├── AIExplainabilityPanel.tsx
    │   │   ├── ConfidenceMeter.tsx
    │   │   ├── SignalRadar.tsx      # 4-axis radar chart
    │   │   ├── FactorBars.tsx       # Contribution bars
    │   │   └── DecisionTimeline.tsx
    │   │
    │   ├── crisis/             # Crisis-specific components
    │   ├── decisions/          # Decision feed components
    │   ├── layout/             # DashboardLayout, sidebar, header
    │   ├── map/                # Map overlay components
    │   ├── notifications/      # Notification bell + panel
    │   ├── reports/            # Report card, detail, submission form
    │   ├── resources/          # Resource request/offer components
    │   ├── system/             # NetworkStatusBanner, RetryCard, SectionBoundary
    │   │   ├── NetworkStatusBanner.tsx   # Animated connectivity banner
    │   │   ├── RetryCard.tsx             # Standardized retry UI
    │   │   └── SectionBoundary.tsx       # Error boundary for widgets
    │   └── ui/                 # shadcn/ui primitives (button, dialog, table…)
    │
    ├── context/
    │   ├── LowBandwidthContext.tsx   # Low-bandwidth mode toggle
    │   └── OfflineSyncContext.tsx    # Offline SOS queue + flush
    │
    ├── features/               # Self-contained feature modules
    │   ├── analytics/          # useAnalyticsSummary, useMonitoringStats
    │   ├── chat/               # chat.api, useChatSocket, chat.store, components
    │   ├── crisis/             # crisis.api, useCrisisActions, crisis.store
    │   ├── map/                # geo.api, useMapFilters, map.store
    │   │   ├── hooks/
    │   │   │   ├── useMapFilters.ts      # Filter state + filtered reports
    │   │   │   ├── useMapSync.ts         # Map ↔ panel sync, useSelectIncident
    │   │   │   └── useCommandCenter.ts   # WS-driven command center state
    │   │   └── components/IncidentPanel.tsx
    │   ├── roles/              # Role-based dashboard routing
    │   │   ├── RoleDashboard.tsx         # Routes / and /dashboard by role
    │   │   ├── CitizenDashboard.tsx      # SOS-first, minimal UI
    │   │   ├── VolunteerCommandDashboard.tsx
    │   │   └── AuthorityCommandCenter.tsx # Dark mode, map-primary
    │   └── sos/                # sos.api, useSOSRealtime
    │
    ├── lib/
    │   ├── motion.ts           # Framer Motion preset animations
    │   ├── queryClient.ts      # TanStack Query client + apiRequest helper
    │   ├── tokens.ts           # Design token definitions (colors, spacing, type)
    │   └── performance.tsx     # Performance measurement utilities
    │
    ├── modules/                # Page-level feature groupings
    │   ├── admin/              # Admin pages (user management, moderation)
    │   ├── aid/                # Aid offer pages
    │   ├── analytics/          # ExplainabilityPage, IntelligenceDashboard
    │   ├── auth/               # Login, register pages
    │   ├── chat/               # ChatPage
    │   ├── map/                # Map.tsx (command center map)
    │   ├── reports/            # ActiveReports, ReportDetails, SubmitReport
    │   ├── resources/          # ResourceRequests
    │   └── user/               # Profile, settings
    │
    ├── pages/                  # Top-level page entry points (route-level)
    │   ├── DataFusionPage.tsx
    │   ├── DecisionEnginePage.tsx
    │   ├── ExecutiveDashboardPage.tsx
    │   ├── GovernanceDashboard.tsx
    │   └── PolicyEnginePage.tsx
    │
    ├── providers/
    │   └── WebSocketProvider.tsx   # Singleton WS connection + context
    │
    ├── shared/
    │   ├── hooks/
    │   │   ├── useNetworkStatus.ts      # Browser online/offline
    │   │   ├── useSystemStatus.ts       # CONNECTED/DEGRADED/OFFLINE/RECOVERING
    │   │   ├── useVirtualList.ts        # @tanstack/react-virtual wrapper
    │   │   ├── useShallowSelector.ts    # Zustand multi-field selector
    │   │   └── useStableCallback.ts     # Stable callback ref (useEvent pattern)
    │   ├── services/api.ts              # Typed HTTP wrapper (get/post/patch…)
    │   ├── types/common.types.ts        # Severity, UserRole, PaginatedResponse
    │   └── utils/format.ts             # timeAgo, shortDateTime, capitalize
    │
    ├── store/
    │   ├── authStore.ts            # User session + role
    │   ├── realtimeStore.ts        # WS ping + unread count
    │   ├── decisionStore.ts        # Active decision, event log (40 items)
    │   └── commandCenterStore.ts   # selectedIncident, routes (polylines)
    │
    └── App.tsx                 # Root router with React.lazy route definitions
```

---

## Server (`server/`)

```
server/
├── index.ts                    # Entry point — creates Express app, registers routes
├── vite.ts                     # Vite dev server integration (HMR in development)
├── worker.ts                   # Worker process entry (AI analysis, cron scheduler)
│
├── config/
│   ├── index.ts                # Centralized config with validation
│   ├── permissions.ts          # 35 fine-grained RBAC actions
│   ├── rateLimits.ts           # Rate limit presets per route type
│   └── swagger.ts              # Swagger/OpenAPI configuration
│
├── db/
│   ├── index.ts                # Drizzle client initialization
│   ├── storage.ts              # DatabaseStorage class (IStorage interface)
│   └── seed.ts                 # Development seed data
│
├── errors/
│   └── AppError.ts             # Custom error classes (NotFoundError, ConflictError…)
│
├── middleware/
│   ├── apiKeyAuth.ts           # API key extraction + validation
│   ├── apiVersion.ts           # API versioning middleware
│   ├── auditLog.ts             # Audit event logging
│   ├── authorize.ts            # RBAC middleware (authorize(action))
│   ├── commonChecks.ts         # Reusable validation helpers
│   ├── errorHandler.ts         # Global error → JSON response
│   ├── jwtAuth.ts              # JWT token validation
│   ├── metricsMiddleware.ts    # Prometheus metrics collection
│   ├── objectAcl.ts            # Object storage ACL enforcement
│   ├── pagination.ts           # Pagination parameter parsing
│   ├── rateLimiting.ts         # Route-specific rate limiters
│   ├── roleAuth.ts             # Role-based access shortcuts
│   └── wsRateLimiting.ts       # WebSocket message rate limiting
│
├── modules/                    # Domain service modules
│   ├── ai/
│   │   ├── crisis-intelligence.service.ts    # Main AI analysis engine
│   │   ├── signal-fusion.service.ts          # Multi-signal score fusion
│   │   ├── multimodal.service.ts             # Text + voice + image fusion
│   │   ├── rag-knowledge.service.ts          # RAG copilot knowledge base
│   │   ├── event-aggregation.service.ts      # Geo + semantic deduplication
│   │   ├── validation.service.ts             # AI report validation
│   │   ├── matching.controller.ts            # Aid matching logic
│   │   └── crisis-guidance.controller.ts     # Copilot response construction
│   │
│   ├── sos/
│   │   └── dispatch.service.ts               # SmartDispatch + SLA escalation
│   │
│   ├── geo/
│   │   └── risk-mapping.service.ts           # Grid risk scoring + route optimizer
│   │
│   ├── simulation/
│   │   └── simulation-engine.ts              # Synthetic crisis injector
│   │
│   ├── digital-twin/
│   │   └── digital-twin.service.ts           # City graph + Dijkstra propagation
│   │
│   ├── trust/
│   │   └── behavioral-analysis.service.ts    # Per-user behavioral scoring
│   │
│   ├── security/
│   │   └── device-fingerprint.service.ts     # IP+UA fingerprinting
│   │
│   ├── predictions/
│   │   ├── predictive-response.service.ts    # ML-based forecasting
│   │   └── prediction-scheduler.ts           # node-cron scheduler (every 10 min)
│   │
│   ├── resilience/
│   │   ├── circuit-breaker.ts                # CircuitBreaker class
│   │   └── retry.ts                          # withRetry() with exponential backoff
│   │
│   ├── integration/
│   │   ├── maps.service.ts                   # Nominatim geocoding
│   │   └── weather.service.ts                # Open-Meteo weather API
│   │
│   ├── events/
│   │   └── event-bus.ts                      # Typed CrisisEventBus singleton
│   │
│   ├── monitoring/
│   │   └── metrics-store.ts                  # Prometheus metrics store
│   │
│   ├── webhooks/
│   │   └── webhook-dispatcher.ts             # HMAC-signed fan-out
│   │
│   ├── reports/
│   │   └── report.service.ts                 # Report business logic
│   │
│   ├── notifications/
│   │   └── notification.service.ts           # Push notification delivery
│   │
│   ├── analytics/
│   │   └── analytics.service.ts              # Analytics aggregation
│   │
│   ├── fusion/                               # Adaptive fusion pipeline
│   ├── graph/                                # Incident graph analysis
│   ├── policy/                               # Policy engine rules
│   └── aid/                                  # Aid matching services
│
├── routes/                     # Express route registrations (~50 files)
│   ├── index.ts                # Master router — registers all sub-routers, event bus wiring
│   ├── auth.routes.ts
│   ├── reports.routes.ts
│   ├── sos.routes.ts
│   ├── ai.routes.ts
│   ├── ai-intelligence.routes.ts
│   ├── admin-command.routes.ts
│   ├── analytics.routes.ts
│   ├── analytics-advanced.routes.ts
│   ├── broadcast.routes.ts
│   ├── chat.routes.ts
│   ├── compliance.routes.ts
│   ├── developer-platform.routes.ts
│   ├── digital-twin.routes.ts
│   ├── geo-intelligence.routes.ts
│   ├── integration.routes.ts
│   ├── iot.routes.ts
│   ├── monitoring.routes.ts
│   ├── organizations.routes.ts
│   ├── simulation.routes.ts
│   ├── sms.routes.ts
│   ├── trust.routes.ts
│   └── … (30+ more domain route files)
│
├── scripts/
│   ├── seed-demo.ts            # Demo data seed script
│   └── seed-large.ts           # Large-scale load testing seed
│
├── shared/                     # Server-internal shared utilities
│
├── utils/
│   ├── logger.ts               # Structured logging (JSON, levels)
│   ├── pubsub.ts               # In-memory / Redis pub/sub adapter
│   ├── jobQueue.ts             # Background job queue with retry
│   ├── clustering.ts           # Report clustering utilities
│   └── performance.ts          # Timing utilities
│
├── validators/
│   └── aiValidation.ts         # AI response Zod schemas
│
└── workers/
    └── ai-analysis.worker.ts   # AI analysis job handler (async)
```

---

## Shared (`shared/`)

```
shared/
├── schema.ts           # Drizzle table definitions + Zod insert schemas + TypeScript types
│                       # All database tables are defined here — single source of truth
├── pagination.ts       # PaginationParams interface + parsePagination()
├── filtering.ts        # ReportFilter interface
├── inputValidation.ts  # Cross-cutting Zod validators
├── validation.ts       # Shared Zod schemas
└── changeTracking.ts   # Field change detection utilities
```

---

## Tests (`tests/`)

```
tests/
├── unit/               # Pure function tests — no database, no network
│   └── *.test.ts
└── integration/        # API endpoint tests with Supertest
    └── *.test.ts
```

---

## Infrastructure (`k8s/`, `docker-compose.yml`)

```
k8s/
├── deployment.yaml     # CrisisConnect Deployment (replicas, resource limits, probes)
├── service.yaml        # ClusterIP service
├── ingress.yaml        # Ingress with TLS termination
└── configmap.yaml      # Non-secret configuration

docker-compose.yml      # app + db + nginx stack for local integration testing
Dockerfile              # Multi-stage build (node:20-alpine)
nginx.conf              # Reverse proxy + static file serving + WebSocket upgrade
```

---

## Key Files at a Glance

| File | What it does |
|---|---|
| `shared/schema.ts` | The single source of truth for all DB tables and TypeScript types |
| `server/routes/index.ts` | Registers all route files and wires event bus → WebSocket |
| `server/modules/events/event-bus.ts` | Typed internal event bus (9 event types) |
| `server/modules/resilience/circuit-breaker.ts` | Reusable circuit breaker for all external calls |
| `client/src/App.tsx` | Root router with all 40+ page definitions |
| `client/src/providers/WebSocketProvider.tsx` | Single WS connection per session |
| `client/src/lib/queryClient.ts` | TanStack Query config + `apiRequest` helper |
| `client/src/lib/tokens.ts` | Design token definitions (colors, spacing, typography) |

---

## Related Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the layers interact
- [API_REFERENCE.md](API_REFERENCE.md) — route-level documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) — where to put new code
