# Crisis Connect - Real-Time Disaster Management Platform

## Overview
Crisis Connect is a real-time disaster management and emergency response coordination platform. Its core purpose is to enhance data quality and streamline relief operations through rapid, GPS-tracked incident reporting with multimedia, crowd-sourced verification, and coordinated emergency responses. The platform utilizes AI for report validation, duplicate detection, and resource matching, with a mobile-first design for speed and clarity in emergency situations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
**Framework**: React with TypeScript, using Vite.
**UI/UX**: shadcn/ui (Radix UI + Tailwind CSS) following an Emergency Services Design Pattern and Material Design principles, prioritizing clarity, speed, and mobile-first accessibility.
**Design System**: Inter font, JetBrains Mono, HSL-based color system with light/dark themes.
**State Management**: TanStack Query (server state) + Zustand (client state via `client/src/store/`).
**Routing**: Wouter for client-side routing with `React.lazy` + `Suspense` for all 40+ pages (code splitting).
**Real-time Updates**: Singleton `WebSocketProvider` at `client/src/providers/WebSocketProvider.tsx` — ONE WS connection per session, subscribed to via `useRealtimeMessage(handler)` hook. Exponential back-off reconnect (2s → 30s).

**Feature-Based Architecture** (`client/src/features/`):
Each feature is a self-contained mini-application with its own types, services, hooks, store, and components. Pages are composition-only orchestrators.
- `crisis/` — types, crisis.api.ts, useCrisisRealtime/useCrisisActions/useCrisisStats hooks, crisis.store.ts (re-exports decisionStore), ActionPanel/CriticalBadge/IncidentTimeline/LiveCounter components
- `chat/` — types, chat.api.ts, useChatSocket/useChatActions hooks, chat.store.ts (Zustand for typing/optimistic), MessageBubble/PinnedBar/QuickActions/RoomList components
- `map/` — types, geo.api.ts, useMapFilters/useMapSync/useSelectIncident hooks, map.store.ts (re-exports commandCenterStore), IncidentPanel component
- `sos/` — types, sos.api.ts, useSOSRealtime hook
- `analytics/` — types, analytics.api.ts, useAnalyticsSummary/useMonitoringStats/useRiskPredictions hooks
- `index.ts` — top-level barrel (`import { useCrisisActions } from "@/features/crisis"`)

**Shared Layer** (`client/src/shared/`):
- `services/api.ts` — typed HTTP wrapper (get/post/patch/put/delete) over apiRequest
- `types/common.types.ts` — Severity, UserRole, LatLng, PaginatedResponse, ApiError
- `utils/format.ts` — timeAgo, shortDateTime, capitalize, slugToLabel, abbreviate
- `hooks/index.ts` — re-exports useAuth, usePermissions, useToast, usePerformance

**App Layer** (`client/src/app/`):
- `providers/index.ts` — barrel for WebSocketProvider, useWSContext, useRealtimeMessage
- `store/index.ts` — barrel for global Zustand stores (auth, realtime)

**Key Stores** (`client/src/store/`):
- `authStore.ts` — user session + role
- `realtimeStore.ts` — WS ping/unread count
- `decisionStore.ts` — active decision, event log (40 items), new report IDs highlight window
- `commandCenterStore.ts` — selectedIncident, routes (polylines), bidirectional map⇄panel sync

**Key Features**:
-   **Dashboards**: Includes a main dashboard, Volunteer Hub (demand-supply, resource management, report verification, AI insights), and Admin Dashboard (user management, report moderation, analytics export).
-   **Command Center Map** (`/map`): Operational split-pane layout — full-screen Leaflet map (left) + `IncidentPanel` (right, 380px). Clicking any marker hydrates the panel instantly via `commandCenterStore` (Zustand). `useMapEvents` flies the map to the selected incident. Severity-coded markers scale up when selected. Route polylines overlay on dispatch. Panel shows SLA timer, AI confidence bar, verification count, and 4 command buttons (Dispatch / Broadcast / Full Report / Upvote). Filters and heatmap/layer controls remain in a collapsible top bar.
-   **Interactive Map layers**: Heatmap overlay, demo shelters/evacuation zones/roads, timeline playback, filter controls for 13 disaster types — all preserved from previous version.
-   **Report Submission**: Multi-step form supporting 13 emergency types, severity, automatic GPS, multi-media upload (photos/videos/voice recordings to S3-compatible storage), and AI validation.
-   **Resource Management**: Systems for victims to request resources and volunteers to offer them, with AI-powered matching and status tracking.
-   **Notification System**: Real-time WebSocket-based notifications with priority levels and user preferences.
-   **Report Verification System**: Community upvote/downvote, consensus scoring combining votes, AI validation, and NGO/official confirmation for a trust score.
-   **Duplicate Detection & Clustering**: Non-AI-based detection using text similarity, location proximity, and time/type matching, with a Cluster Management UI.
-   **Image Classification**: Client-side AI disaster type detection using TensorFlow.js (MobileNet) for uploaded images.
-   **Predictive Modeling**: AI-powered disaster forecasting using historical patterns, real-time weather (OpenWeather API), and seismic activity (USGS API) to predict affected areas and assess risk levels.

### Backend
**Framework**: Express.js with TypeScript on Node.js.
**API Design**: RESTful API.
**WebSocket Server**: Integrated for real-time notifications.
**Session Management**: Express sessions with PostgreSQL store.
**Middleware**: JSON parsing, logging, secure sessions, Passport.js.

### Database
**ORM**: Drizzle ORM with PostgreSQL (Neon serverless driver).
**Schema Highlights**: Sessions, Users, Disaster Reports (with 13 types, media URLs, AI score, verification), Verifications, Resource Requests, Aid Offers, Notifications, Notification Preferences.
**Migrations**: Drizzle Kit.

### Authentication & Authorization
**Provider**: JWT-based authentication with access and refresh tokens.
**Implementation**: Custom JWT middleware (`jwtAuth`), bcrypt password hashing, token refresh flow.
**Token Security**: Access tokens (15min expiry) for API requests, refresh tokens (7 days) stored in httpOnly cookies for XSS prevention.
**Authentication Endpoints**: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`.
**Security Features**: Rate limiting on auth endpoints, audit logging for all auth events (login, logout, registration, failures), password strength validation.
**Role-Based Access Control**: Five roles (Citizen, Volunteer, NGO, Government, Admin) with `requireRole` middleware.
**Identity Verification**: Email (OTP), Phone (SMS OTP), and simulated Aadhaar verification.
**User Reputation System**: Trust score (0-100) based on verified contributions and achievements.

### Performance Optimization
-   **Pagination System**: Standardized across API endpoints with configurable page size, metadata, sorting, and filtering.
-   **In-Memory Caching**: High-performance caching for frequently accessed data (reports, user stats, dashboard) with configurable TTL, LRU eviction, and automatic invalidation.
-   **Database Indexes**: Strategic indexes on key fields for optimized query performance.
-   **Response Compression**: Automatic gzip compression for API responses > 1KB.
-   **Cache Invalidation Strategy**: Automatic invalidation on data changes for real-time consistency.

### Security Infrastructure
-   **Secret Management**: Fail-fast validation for required environment variables (`SESSION_SECRET`, `ENCRYPTION_KEY`) in production.
-   **HTTP Security Middleware**: CORS protection, Helmet.js for security headers (CSP, HSTS, X-Content-Type-Options, Cross-Origin Policies).
-   **Rate Limiting**: Global, authentication, report submission, and AI request specific rate limits.
-   **Input Sanitization**: `express-mongo-sanitize` to prevent NoSQL injection, payload size limits.
-   **Cookie Security**: HttpOnly, Secure, SameSite=strict, MaxAge for session cookies.
-   **Input Validation**: Server-side Zod validation for all API inputs.
-   **SQL Injection Prevention**: Drizzle ORM parameterized queries.
-   **WebSocket Security**: Origin validation, session authentication, rate limiting, WSS encryption, and optional AES-GCM message encryption for sensitive types.
-   **Background Task Queue**: In-memory queue for async processing with retry logic and graceful shutdown.
-   **Shared Middleware**: Reusable authentication, validation, and authorization middleware.

## Elite Architecture Features (v2.0)

### T001 — AI Layer (Multi-Signal Crisis Intelligence)
- **Service**: `server/modules/ai/crisis-intelligence.service.ts`
- Multi-signal analysis combining text + severity + GPS + emotion + intent
- Urgency scoring: continuous 0–10 scale with 5 levels (minimal → critical)
- Explainable AI: every decision includes `auditId`, contributing factors, confidence, and reasoning
- Fake detection: score 0–100 with specific reason flags
- Early warning: auto-detects ≥3 same-type reports in 1 hour
- Rule-based fallback when OpenAI is not configured
- Endpoints: `POST /api/ai/analyze`, `GET /api/ai/early-warning`, `POST /api/ai/copilot`, `GET /api/ai/explain/:id`

### T002 — SOS Lifecycle Engine (Smart Dispatch + SLA Escalation)
- **Service**: `server/modules/sos/dispatch.service.ts`
- SmartDispatchService: Haversine geo-routing + skill match (10 disaster types) + reputation weighting
  - Score = 40% distance + 30% skill + 15% availability + 15% reputation
- SLAEscalationService: 30s → expand radius, 60s → notify authorities, 120s → public broadcast
- Endpoints: `POST /api/sos/:id/dispatch`, `GET /api/sos/:id/dispatch-status`

### T003 — Geo-Intelligence (Risk Mapping + Route Optimization)
- **Service**: `server/modules/geo/risk-mapping.service.ts`
- Grid-based (0.1° cells) risk scoring with time decay, severity weights, nighttime bonus
- 5 risk levels: very_low → very_high
- Route optimizer: waypoint detour around high-risk zones with Haversine path analysis
- Endpoints: `GET /api/geo/risk-map`, `POST /api/geo/route`, `GET /api/geo/safe-zones`
- Frontend: `/risk-map` — Interactive Leaflet map with risk circles + route polylines

### T004 — AI Crisis Copilot (RAG Knowledge + Multi-Language)
- **Service**: `server/modules/ai/rag-knowledge.service.ts`
- RAG knowledge base: 8+ disaster type protocols (NDRF guidelines, medical instructions, evacuation)
- Multi-language: Hindi + English with local Indian emergency numbers
- GPT-4o-mini augments base protocols when available
- Endpoint: `POST /api/ai/copilot`
- Frontend: `/copilot` — Full guidance UI with structured output

### T005 — Real-Time Communication (Broadcast Alerts)
- **Service**: `server/routes/broadcast.routes.ts`
- Admin/NGO broadcast alerts (info/warning/critical) via WebSocket to all clients
- Alert types: `broadcast_alert`, `sos_dispatch_notification`, `sos_sla_escalation`
- Alert expiration support
- Endpoints: `POST /api/alerts/broadcast`, `GET /api/alerts/broadcast`
- Frontend: `/broadcast-alerts` — Alert composer + active alerts panel

### T006 — Trust & Fraud Prevention
- **Service**: `server/modules/trust/behavioral-analysis.service.ts`
- Per-user behavioral profiling: submission rate, report frequency, location consistency
- Anomaly flags: excessive_submissions_24h, reports_too_frequent, extreme_location_variance
- Trust badge system: unverified → trusted → verified_responder → elite_responder
- System-wide anomaly detection (submission spikes, disaster-type clustering)
- Endpoints: `GET /api/trust/user/:id/profile`, `/score`, `GET /api/trust/anomalies`, `/high-risk-users`
- Frontend: `/trust` — Admin anomaly + high-risk user dashboard

### T007 — Analytics & Intelligence Dashboard
- **Service**: `server/routes/analytics-advanced.routes.ts`
- Peak crisis hours (24h heatmap with severity-weighted risk index)
- SLA compliance tracking (response time distribution + compliance rate)
- Resource efficiency scoring (fulfillment rate, aid match rate, inventory alerts)
- Seasonal patterns (monthly incident distribution with top disaster type)
- System health monitoring (normal/warning/critical status)
- Predictive analytics (historical + seasonal → probability predictions with recommendations)
- Endpoints: `/api/analytics/peak-hours`, `/sla-compliance`, `/resource-efficiency`, `/seasonal-patterns`, `/system-health`, `/predict`
- Frontend: `/intelligence` — 5-tab intelligence dashboard (Overview, SLA, Peak Hours, Seasonal, Resources)

### New Frontend Pages (Elite)
| Route | Component | Access |
|-------|-----------|--------|
| `/intelligence` | IntelligenceDashboard | admin, government |
| `/copilot` | CrisisCopilot | all roles |
| `/risk-map` | RiskMap | volunteer, ngo, admin, government |
| `/broadcast-alerts` | BroadcastAlerts | ngo, admin |
| `/trust` | TrustDashboard | admin only |

## Production-Grade Engineering (v3.0 — Signal Fusion & Command Interface)

### Signal Fusion Engine
- **Service**: `server/modules/ai/signal-fusion.service.ts`
- Formula: `finalScore = 0.5×ai_urgency + 0.2×location_risk + 0.2×repetition_score + 0.1×user_trust_score`
- Returns `fusedScore` with `priority` (LOW/MEDIUM/HIGH/CRITICAL), `finalScore`, and all 4 component values
- Integrated into `POST /api/ai/analyze` response

### Event Aggregation Engine
- **Service**: `server/modules/ai/event-aggregation.service.ts`
- Geo clustering: Haversine ≤ 500m, 3-hour rolling window
- Semantic merge gate: Jaccard similarity ≥ 0.20 on tokenized title+description
- Actions: `"created"` (new cluster) or `"merged"` (linked to existing incident)
- Returns `{ action, incidentId, reportId, cluster: { geoDist, semanticSim } }`
- Manual trigger: `POST /api/admin/incidents/aggregate/:reportId` (admin only)

### Admin Command Interface
- **Routes**: `server/routes/admin-command.routes.ts`
- `PATCH /api/admin/incident/:id/override` — severity + notes override with audit log
- `POST /api/admin/incident/:id/assign` — responder assignment with audit log
- `POST /api/admin/incident/:id/escalate` — force escalate with reason logging
- `POST /api/admin/incidents/merge` — manual merge of two incidents
- `GET /api/admin/incidents` — list active aggregated incidents
- `GET /api/admin/incidents/:id/reports` — linked report details
- `GET /api/admin/incident/:id/history` — full state transition log
- All endpoints protected by `requireRole("admin")`

### IoT Ingestion Pipeline
- **Routes**: `server/routes/iot.routes.ts`
- `POST /api/iot/event` — accepts sensor_type, value, location, lat/lon, sensor_id
- Maps 8 sensor types → disaster types + severities (fire_alarm, flood_sensor, earthquake_sensor, gas_detector, structural_monitor, air_quality, tsunami_warning, landslide_sensor)
- Creates disaster reports in DB, broadcasts via WebSocket, auto-dispatches for critical events
- System user created/cached for IoT-generated reports (no manual auth needed)
- `GET /api/iot/sensor-types` — sensor type catalog with thresholds

### SOS State Machine & History
- **Routes**: `server/routes/sos.routes.ts`
- All state transitions logged to `incident_logs` table
- `GET /api/sos/:id/history` — full transition log with state machine spec:
  `CREATED → VERIFIED → BROADCASTED → ACCEPTED → IN_PROGRESS → RESOLVED → CLOSED`
- Escalation transitions also logged with reason

### New Database Tables
- `incidents` — aggregated multi-report incidents (centroid geo, severity, status, report count)
- `incident_reports` — join table linking incidents ↔ disaster_reports
- `incident_logs` — immutable append-only audit log for all state transitions

### Updated Dispatch Formula
- `40% haversine-geo + 30% reliability + 20% skill-match + 10% response-time`
- Exposed in dispatch response as `algorithm` field

### Copilot Structured Output
- `POST /api/ai/copilot` returns `{ steps[], warnings[], resources[] }` per spec
- 8 action steps, 2 safety warnings, 9 resource items for flood scenario (example)

## Spec §5-8 Features (v4.0 — Real-Time Comms, Trust, Explainable AI, Analytics)

### §5 — Real-Time Communication Infrastructure
- **Chat rooms**: Group (named) and Direct (DM, auto-creates shared room) via `POST /api/chat/rooms` + `POST /api/chat/dm`
- **Messages**: End-to-end AES-GCM encrypted, stored with `status` (sent/delivered/read), `isPinned`, `isPriority`
- **Read Receipts**: `PATCH /api/chat/rooms/:roomId/messages/:msgId/read` → sets `status=read`, `readAt` timestamp; broadcasts `READ_RECEIPT` WS event
- **Delivery Receipts**: `PATCH .../deliver` → `status=delivered`, `deliveredAt`; triggered by receiver on WS `RECEIVE_MESSAGE`
- **Typing Indicators**: `POST /api/chat/rooms/:roomId/typing` → broadcasts `TYPING_START`/`TYPING_STOP` to all room members
- **Pin/Unpin**: `PATCH .../messages/:id/pin` — `isPinned` toggle; `GET .../messages/pinned` returns pinned list
- **Frontend**: `client/src/modules/chat/pages/ChatPage.tsx` — full-featured chat UI with real-time WS, typing display, receipt status icons, pinned messages panel, low-bandwidth mode awareness
- **Low-Bandwidth Context**: `client/src/context/LowBandwidthContext.tsx` — localStorage-persisted Wifi toggle in dashboard nav bar

### §6 — Trust & Fraud Prevention Enhancements
- **Device Fingerprinting**: `server/modules/security/device-fingerprint.service.ts`
  - IP+UA SHA-256 hash fingerprinting; tracks `requestCount`, `riskScore` (0-100), `isFlagged`
  - Multi-account detection: riskScore +30 when same device used with different user ID; auto-flags at score ≥ 70
  - **DB**: `device_fingerprints` table (id, userId, ipAddress, userAgent, fingerprintHash, riskScore, requestCount, isFlagged, flagReason, firstSeenAt, lastSeenAt)
  - **Captured on login**: `POST /api/auth/login` upserts fingerprint record (non-blocking, fire-and-forget)
  - **Admin endpoints**: `GET /api/security/devices/flagged`, `/high-risk?minRisk=N`, `/user/:userId`

### §7 — Explainable AI
- **AI Decision Audit Log**: `GET /api/ai/decisions?page=N&limit=N`
  - Paginated list of AI decisions for every disaster report (auditId, fusedPriority, confidence, triggered, urgencyLevel, contributing factors, reasoning, recommendations)
- **Per-Report Explainability**: `GET /api/ai/explain/:reportId` — full breakdown (contributing factors, signal fusion components, fakeDetection, urgency, intent)
- **Frontend**: `client/src/modules/analytics/pages/ExplainabilityPage.tsx` at `/explainability`
  - Decision list with priority color-coding and suspicious flags
  - **Signal Fusion** tab: bar chart + radar of 4 components (AI Urgency 50%, Location Risk 20%, Repetition 20%, User Trust 10%)
  - **Contributing Factors** tab: progress-bar breakdown with weight %, reasoning text
  - **Classification** tab: urgency/intent/fakeDetection/fusedPriority cards
  - **Audit Trail** tab: auditId, timestamp, modelVersion, confidence
- Nav: "AI Audit" link added for admin/government roles

### §8 — Analytics Enhancements
- **Incident Conversion Funnel**: `GET /api/analytics/funnel`
  - 5-stage incident funnel: Submitted → Verified → Resources Requested → Dispatched → Resolved
  - SOS resolution funnel: Activated → Responding → Resolved
  - Overall conversion rate %
- **User Cohort Analysis**: `GET /api/analytics/cohort`
  - 4 cohorts: New (<7d), Recent (7-30d), Regular (30-90d), Established (90d+)
  - Role breakdown, engagement rate (% of users who have submitted reports), multi-reporters count
  - Reports-per-user per role
- **Frontend**: IntelligenceDashboard now has 7 tabs (+ Funnel, Cohort)
  - Funnel tab: color-coded horizontal bars + recharts BarChart layout="vertical"
  - Cohort tab: PieChart for cohort distribution, BarChart for reports-by-role, role grid

## Spec §9-12 Features (v5.0 — Enterprise Backbone Layer)

### §9 — Multi-Role Enterprise System
- **Extended roles**: `user_role` enum now includes `authority` and `super_admin` in addition to `citizen`, `volunteer`, `ngo`, `admin`, `government`
- **Policy-Based RBAC**: `server/config/permissions.ts` — 35 fine-grained actions (incident:*, sos:*, report:*, resource:*, aid:*, user:*, org:*, analytics:*, broadcast:*, trust:*, ai:*, chat:*, system:manage, data:*)
  - `server/middleware/authorize.ts` — `authorize(action)` middleware uses permissions map, returns 403 with action+role in body
  - All new routes use `authorize()` instead of hardcoded role arrays
- **Organizations**: `organizations` + `organization_members` tables (Drizzle schema + migrated)
  - `GET /api/organizations` — list all active orgs (requires `org:view`)
  - `POST /api/organizations` — create org, auto-adds creator as `owner` member, fires `ORG_CREATED` event
  - `GET /api/organizations/:id` — org detail with member list (inner join users)
  - `PATCH /api/organizations/:id` — update name, verification, active status (requires `org:manage`)
  - `POST /api/organizations/:id/members` — add member with role (requires `org:manage`)
  - `DELETE /api/organizations/:id/members/:userId` — remove member
  - `GET /api/organizations/me/memberships` — current user's org memberships
  - `GET /api/organizations/:id/analytics` — tenant-scoped analytics (member count, role breakdown)
- **Frontend**: `OrganizationsPage.tsx` at `/organizations` — org cards with type badges, verification icons, create dialog, my memberships panel, 4-stat header
- **roleAuth.ts**: `requireAdmin` now includes `authority` + `super_admin`; added `requireSuperAdmin`, `requireAuthority`

### §10 — Event-Driven Architecture (Internal Event Bus)
- **Typed Event Bus**: `server/modules/events/event-bus.ts` — singleton `CrisisEventBus` extends EventEmitter
  - 9 event types: `CRISIS_CREATED`, `CRISIS_UPDATED`, `SOS_ACTIVATED`, `SOS_RESOLVED`, `INCIDENT_MERGED`, `ALERT_BROADCAST`, `USER_REGISTERED`, `ORG_CREATED`, `IOT_EVENT`
  - Interface mirrors Kafka producer/consumer API (`publish()` / `subscribe()`)
  - Cross-service wiring: 4 active bus → WebSocket broadcast bridges registered at startup
  - `GET /api/events/stats` — returns listener counts per event type
- **Wired events**: `ORG_CREATED` emitted on org creation; `SOS_ACTIVATED` fired from SMS webhook

### §11 — Offline-First & Resilience
- **SMS Webhook (Twilio-compatible)**: `POST /api/sms/webhook` (form-encoded, Twilio format)
  - Parses SMS commands: HELP, SOS, FIRE, FLOOD, MEDICAL, ACCIDENT, EARTHQUAKE, STORM, GAS, LANDSLIDE
  - Maps each to `emergencyType` + `severity` → creates SOS alert as anonymous user
  - Responds with TwiML `<Message>` confirmation + short SOS ID
  - `POST /api/sms/status` — Twilio delivery status callback (dev logging)
  - `POST /api/sms/simulate` — dev-only endpoint to test SMS flow
- **Schema fix**: `sos_alerts.user_id` made nullable to support anonymous (SMS/offline) SOS
- **Frontend Offline Queue**: `client/src/context/OfflineSyncContext.tsx`
  - Wraps entire app (inside `OfflineSyncProvider`)
  - Detects `navigator.onLine` + window `online`/`offline` events
  - `queueSOS(data)` — persists to `localStorage` when offline with UUID + timestamp
  - `flushQueue()` — on reconnect, sends all pending SOS with auth token; retries up to 5 times
  - `useOfflineSync()` — exposes `{ isOnline, queueLength, isSyncing, lastSyncAt, queueSOS, flushQueue }`
  - Dashboard header shows amber "Offline (N queued)" pill when offline

### §12 — Security & Compliance (GDPR)
- **user_consents table**: `userId`, `consentType` (enum: data_processing, location_tracking, analytics, marketing, third_party_sharing), `granted`, `ipAddress`, `userAgent`, `grantedAt`, `revokedAt`, `version`
- **GDPR Endpoints**:
  - `GET /api/compliance/me/export` — full data export: profile, reports, SOS, resource requests, consents (JSON download)
  - `DELETE /api/compliance/me/account` — anonymizes reports/SOS (nulls userId), hard-deletes user; requires `confirm: "DELETE_MY_ACCOUNT"` in body
  - `POST /api/compliance/me/consent` — records consent with IP + UA + version
  - `GET /api/compliance/me/consents` — consent history ordered by timestamp
  - `GET /api/compliance/data-retention` — full retention policy (7 rules, 6 user rights, legal basis per data type)
  - `GET /api/compliance/audit-trail` — paginated `incident_logs` with optional `userId` filter
- **Frontend**: `CompliancePage.tsx` at `/compliance` — "Privacy & Data" nav item visible to all roles
  - **Consents tab**: 5 consent toggles with grant/revoke, consent history list
  - **Data Export tab**: 5 data categories listed, JSON download button
  - **Retention tab**: sortable retention rules table, user rights badges
  - **Delete tab**: double-confirmation with typed `DELETE_MY_ACCOUNT` string

## Spec §13-16 Features (v6.0 — Platform Ecosystem Maturity Layer)

### §13 — Integration Ecosystem
- **Integration Gateway pattern**: all external API calls go through `server/modules/integration/` service layer with circuit breakers, retries, and fallbacks. Core services never call external APIs directly.
- **Maps API (Nominatim — free, no key)**:
  - `GET /api/integration/maps/reverse-geocode?lat&lng` — reverse geocodes coordinates via Nominatim (OSM). Results cached 24h in-memory; falls back to "lat, lng" string on error.
  - `GET /api/integration/maps/distance?lat1&lng1&lat2&lng2` — Haversine distance + estimated road travel time
  - `GET /api/integration/maps/cache` — geocode cache stats + circuit breaker status
  - Circuit breaker: `maps-nominatim` (threshold=3, timeout=60s)
- **Weather API (Open-Meteo — free, no key)**:
  - `GET /api/integration/weather?lat&lng&region` — fetches current conditions, stores to `weather_data` table. Returns temp, rainfall, wind_speed, humidity, WMO weather code, computed `alertLevel` (none/watch/warning/emergency), `riskScore` (0–100)
  - `GET /api/integration/weather/latest?region` — latest stored row for a region
  - `GET /api/integration/weather/regions` — all stored weather snapshots
  - WMO code map: 25 codes classified to 4 alert levels; risk score factors in precipitation and wind speed
  - Circuit breaker: `weather-openmeteo`
- **Hospital DB (Overpass API/OSM — free, no key)**:
  - `GET /api/integration/hospitals/nearby?lat&lng&radius` — finds hospitals within radius km via Overpass API, returns sorted by distance with name, address, phone, website, emergency flag, availability (deterministic from OSM node ID)
  - Falls back to a single static "District General Hospital" entry on error
  - Circuit breaker: `hospitals-overpass`
- **Circuit Breaker status**: `GET /api/integration/status` — all circuit breaker states
- **Resilience modules** (used by all integration services):
  - `server/modules/resilience/circuit-breaker.ts` — `CircuitBreaker` class with CLOSED/OPEN/HALF_OPEN states, configurable failure threshold, timeout, success threshold. `getCircuitBreaker(name)` singleton factory.
  - `server/modules/resilience/retry.ts` — `withRetry(fn, opts)` with exponential backoff + jitter, max delay cap, `onRetry` callback

### §14 — Developer Platform
- **API Keys** (`api_keys` table — migrated):
  - `POST /api/developer/keys` — generates `cc_` prefixed 48-char key, stores SHA-256 hash only (plain key shown once). Supports `free` (100/day), `paid` (10k/day), `enterprise` (1M/day) tiers. Max 10 keys per account.
  - `GET /api/developer/keys` — lists keys (prefix only, no hash)
  - `DELETE /api/developer/keys/:id` — revokes key (sets `isActive=false`)
  - `POST /api/developer/keys/:id/reset` — resets daily request count
  - Rate limit headers on every v1 response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Tier`
- **`server/middleware/apiKeyAuth.ts`** — extracts key from `Authorization: Bearer` or `X-Api-Key`, hashes and looks up, checks `isActive` + expiry + daily limit, increments `requestCount`, sets rate limit headers
- **Public v1 API** (API key authenticated):
  - `POST /v1/crisis/report` — submit crisis report via API key; validates enum types, inserts to `disaster_reports`, fires `crisis.created` webhook event
  - `GET /v1/crisis/alerts?limit` — paginated recent alerts (max 100)
  - `GET /v1/crisis/:id` — incident detail
- **Webhooks** (`webhook_subscriptions` + `webhook_deliveries` tables — migrated):
  - `POST /api/developer/webhooks` — register endpoint URL + event list, generates `whsec_` HMAC secret
  - `GET /api/developer/webhooks` — list subscriptions
  - `DELETE /api/developer/webhooks/:id` — delete
  - `GET /api/developer/webhooks/:id/deliveries` — delivery history (attempts, status codes, errors)
  - `POST /api/developer/webhooks/:id/test` — dispatch a test `crisis.created` event
  - `server/modules/webhooks/webhook-dispatcher.ts` — `dispatchWebhookEvent(event, data)` fan-out with HMAC-SHA256 signature (`X-CrisisConnect-Signature`), fire-and-forget retries (4 attempts, 1s base delay), delivery log, auto-disables subscription after 10+ failures
- **Frontend**: `DeveloperPlatformPage.tsx` at `/developer` — 3 tabs: API Keys (key creation dialog, usage bar), Webhooks (event multi-select, test button), API Docs (code samples, signature verification snippet, rate limit table)

### §15 — Monitoring & Observability
- **Prometheus-format metrics**: `GET /api/metrics` — returns `text/plain` with `http_requests_total{method,route,status}`, `http_errors_total`, `http_response_time_ms` (histogram with buckets 50/100/250/500/1000/+Inf), `process_uptime_seconds`, `active_connections`, `requests_per_minute`
- **`server/middleware/metricsMiddleware.ts`** — records every request into `MetricsStore` singleton on `res.finish`; wired globally in `server/index.ts`
- **`server/modules/monitoring/metrics-store.ts`** — `MetricsStore` singleton: counters, histograms, P95 calculation, recent-window request rate
- **`GET /api/health/detailed`** — enhanced health check: DB ping, memory usage %, circuit breaker states → returns `ok`/`degraded`/`down` per service + overall status
- **`GET /api/monitoring/stats`** — platform stats (totalReports, totalSOS, totalUsers) + runtime metrics + circuit breaker list
- **`GET /api/monitoring/alerts`** — threshold-based alert list: error rate >5%/10%, avg response >1000ms/2000ms, open circuit breakers
- **Frontend**: `MonitoringPage.tsx` at `/monitoring` — 8-card KPI grid, 4-tab layout (Health checks with per-service status badges, Circuit Breakers, Chaos Engineering, Raw Prometheus metrics viewer)

### §16 — Testing & Reliability (Chaos Engineering)
- **`GET /api/dev/chaos/experiments`** — lists 4 available experiments with descriptions
- **`POST /api/dev/chaos/start`** — starts an experiment for up to 2 minutes: `latency` (2–5s delay), `error_rate` (20% → 500), `memory` (~50MB allocation), `db_slow` (log events)
- **`POST /api/dev/chaos/stop`** — stops all or a specific experiment
- **`GET /api/dev/chaos/test`** — endpoint that respects active experiments (delays, random 500s)
- All chaos routes are **dev-only** (`NODE_ENV !== production` gate)
- Chaos experiments shown in Monitoring page with real-time active status + "Run 30s" / "Stop All" buttons

### New Tables (all migrated via `npm run db:push`)
- `weather_data` — region, lat/lng, temp, rainfall, wind_speed, humidity, weather_code, alert_level enum, risk_score, raw_data JSONB, fetched_at
- `api_keys` — user_id FK, name, key_hash (unique), key_prefix, tier enum, daily_limit, request_count, last_used_at, is_active, expires_at
- `webhook_subscriptions` — user_id FK, url, events TEXT[], secret, is_active, failure_count, last_delivered_at
- `webhook_deliveries` — subscription_id FK, event, payload JSONB, status_code, attempts, success, error, delivered_at

### Nav additions (admin/authority/super_admin roles)
- "Developer Platform" at `/developer` — Code icon
- "Monitoring" at `/monitoring` — Activity icon

## Spec §17-18 Features (v7.0 — Top 1% Research + Industry Grade Layer)

### §17.1 — Multimodal AI (Text + Voice + Image Fusion)
- **Architecture**: Three-signal weighted fusion — Text (40%), Voice transcript (30%), Image URL (30%) → single crisis score
- **`server/modules/ai/multimodal.service.ts`** — `analyzeMultimodal(input)` with GPT-4o vision + text. Falls back to keyword-based heuristic if OpenAI not configured. Returns: `crisisType`, `urgency` (0–1), `confidence` (0–1), `severity`, `explanation`, `fusionScores`, `fusedScore`, `requiresHumanReview`, `source`
- **Human review triggers**: confidence < 0.7, urgency ≥ 0.85, or severity = critical
- **Endpoints**:
  - `POST /api/ai/multimodal-analyze` — analyze single report (text + voice + imageUrl + location)
  - `POST /api/ai/multimodal-batch` — analyze up to 5 reports in one call
  - `GET /api/ai/multimodal-info` — fusion weights + review triggers + model info
- **Frontend**: `MultimodalPage.tsx` at `/multimodal-ai` (admin/authority/super_admin) — 3 signal input panels, fusion weight info cards, result display with score bars, signal breakdown grid, human review alert

### §17.2 — Crisis Simulation Engine
- **Architecture**: Synthetic event generator that injects real `disaster_reports` + `sos_alerts` rows tagged `[SIM]` into the live database. Fires `CRISIS_CREATED` EventBus events. Returns detailed performance metrics.
- **`server/modules/simulation/simulation-engine.ts`** — `runSimulation(config)` supports 7 scenarios × 4 intensities (low/medium/high/extreme). Intensity multiplier scales event count (1×/2×/4×/8×). Events are jitter-distributed around a base coordinate.
- **7 scenarios**: flood, earthquake, storm, mass_accident, epidemic, coordinated_attack, infrastructure_failure — each with distinct reportTypes array, defaultSeverity, estimatedAffected, and SOS injection ratio
- **Metrics returned**: totalEventsInjected, reportsCreated, sosAlertsCreated, peakSeverity, estimatedAffected, responseTimeSimMs, queueBacklog, failureRate, scenarioScore (0–100)
- **New table**: `simulation_runs` — scenario, location, intensity, eventCount, status enum, metricsData JSONB, injectedEventIds[], initiatedBy FK
- **Endpoints**:
  - `GET /api/simulation/scenarios` — all 7 scenarios with metadata
  - `POST /api/simulation/run` — run simulation (admin/authority/super_admin, max 20 events)
  - `GET /api/simulation/runs` — history (last 20)
  - `GET /api/simulation/runs/:id` — single run detail
- **Frontend**: `SimulationPage.tsx` at `/simulation` — scenario grid picker, location select, intensity selector, event count slider, metrics dashboard, run history list

### §17.3 — Digital Twin (City-Level Graph Model)
- **Architecture**: Bidirectional weighted graph of city nodes with Dijkstra-style BFS propagation. Crisis at node A → propagate across edges up to N hops (N = severity level). Finds nearest responders via Haversine distance + graph travel time.
- **`server/modules/digital-twin/digital-twin.service.ts`** — `simulateCrisisPropagation(impact, cityId)` + `seedDefaultCityModel(cityId)` 
- **Mumbai-inspired seed model**: 15 nodes — 2 hospitals, 2 fire stations, 2 police stations, 2 shelters, 2 road junctions, 2 bridges, 3 zones — + 15 edges with realistic travel times and congestion factors
- **Propagation output**: affectedNodes (with hop count, travel time, risk increase), nearestResponders (sorted by travel time, with availability = available/limited/overwhelmed), predictedResponseTime, riskSpread (contained/moderate/severe/catastrophic), bottlenecks (nodes with riskScore ≥ 60 in propagation path), estimatedAffectedPopulation, confidenceScore
- **New tables**: `city_nodes` (cityId, name, type enum, lat, lng, riskScore, capacity, metadata), `city_edges` (fromNodeId FK, toNodeId FK, distanceKm, travelTimeMinutes, roadType, congestionFactor)
- **Endpoints**:
  - `POST /api/digital-twin/seed` — seed default city model (idempotent)
  - `GET /api/digital-twin/model?cityId` — full city graph (nodes + edges)
  - `POST /api/digital-twin/simulate` — propagation from a specific node
  - `POST /api/digital-twin/simulate-location` — auto-find nearest node to lat/lng and propagate
  - `PATCH /api/digital-twin/nodes/:id/risk` — update node risk score
- **Frontend**: `DigitalTwinPage.tsx` at `/digital-twin` — node grid with type-color badges, simulation panel, propagation result with responder list, bottleneck badges

### §17.4 — AI Decision Override (Human-in-the-Loop)
- **Architecture**: Every AI classification can be flagged for human review. Admins see a queue of pending decisions, can approve or override with new severity/type. Override writes back to the actual `disaster_reports` row.
- **Review trigger logic**: `confidence < 0.7 || urgency >= 0.85 || severity === "critical"` → `requiresHumanReview = true`, status = `pending_review`
- **New table**: `ai_overrides` — incidentId, incidentType, originalDecision JSONB, overriddenDecision JSONB, aiConfidence, aiUrgency, requiresHumanReview, status enum (pending_review/approved/overridden/auto_approved), overriddenBy FK, reason, notes, createdAt, reviewedAt
- **Endpoints**:
  - `POST /api/ai-overrides` — create override record for any AI decision
  - `GET /api/ai-overrides?status=` — list (filter by status)
  - `GET /api/ai-overrides/:id` — single record
  - `PATCH /api/ai-overrides/:id/review` — approve or override (writes back to disaster_reports if override)
  - `GET /api/ai-overrides/stats/summary` — total/pending/approved/overridden/autoApproved/overrideRate
- **Frontend**: `AIOverridePage.tsx` at `/ai-override` — 5-card stats bar, pending count alert, Pending Review / All Decisions tabs, review dialog with approve/override action, new severity/type selectors, reason textarea, full audit history

### §18 — Product Differentiation (Implemented)
CrisisConnect is no longer a reporting app. It is an **AI Intelligence Platform + Real-Time Infrastructure + Predictive Analytics + Human Control Layer**:
1. **AI-Powered Crisis Intelligence**: multimodal detection (text+voice+image), explainable AI decisions, human-in-the-loop governance
2. **Real-Time Coordination**: WebSocket dispatch, broadcast alerts, responder matching, live map
3. **Predictive Risk Engine**: weather risk scoring, digital twin propagation, simulation stress testing
4. **Platform Ecosystem**: developer API keys + webhooks, Prometheus metrics, circuit breakers, chaos engineering

### New Tables in §17 (migrated via `npm run db:push`)
- `simulation_runs` — scenario enum, location, intensity, status enum, metricsData JSONB, injectedEventIds text[]
- `city_nodes` — cityId, name, type enum (8 values), lat, lng, riskScore, capacity, metadata JSONB, isActive
- `city_edges` — cityId, fromNodeId FK, toNodeId FK, distanceKm, travelTimeMinutes, roadType, congestionFactor
- `ai_overrides` — incidentId, incidentType, originalDecision JSONB, overriddenDecision JSONB, status enum (4 values), overriddenBy FK, reason, notes, reviewedAt

### New Nav Items (admin/authority/super_admin roles)
- "Multimodal AI" at `/multimodal-ai` — Brain icon
- "Simulation Engine" at `/simulation` — Zap icon
- "Digital Twin" at `/digital-twin` — Globe icon
- "AI Override" at `/ai-override` — ShieldAlert icon

## External Dependencies
-   **Database**: PostgreSQL via Neon serverless.
-   **AI Service**: Replit AI Integrations (GPT-4o-mini) with rule-based fallback.
-   **Object Storage**: Replit App Storage for media uploads.
-   **Fonts**: Google Fonts (Inter, JetBrains Mono).
-   **Weather API**: OpenWeather API (for predictive modeling).
-   **Seismic Activity Data**: USGS API (for predictive modeling).
-   **NPM Packages**: Radix UI, TanStack Query, Wouter, Drizzle ORM, Zod, date-fns, lucide-react, Leaflet, leaflet.heat, Uppy, MediaRecorder API.