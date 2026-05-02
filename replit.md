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
**State Management**: TanStack Query.
**Routing**: Wouter for client-side routing.
**Real-time Updates**: Custom `useWebSocket` hook.

**Key Features**:
-   **Dashboards**: Includes a main dashboard, Volunteer Hub (demand-supply, resource management, report verification, AI insights), and Admin Dashboard (user management, report moderation, analytics export).
-   **Interactive Map**: Leaflet-based map with color-coded markers, a high-impact heatmap, demo overlays (shelters, evacuation zones), timeline playback, and filter controls for 13 disaster types. The heatmap aggregates data from multiple sources with weighted intensity.
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

## External Dependencies
-   **Database**: PostgreSQL via Neon serverless.
-   **AI Service**: Replit AI Integrations (GPT-4o-mini) with rule-based fallback.
-   **Object Storage**: Replit App Storage for media uploads.
-   **Fonts**: Google Fonts (Inter, JetBrains Mono).
-   **Weather API**: OpenWeather API (for predictive modeling).
-   **Seismic Activity Data**: USGS API (for predictive modeling).
-   **NPM Packages**: Radix UI, TanStack Query, Wouter, Drizzle ORM, Zod, date-fns, lucide-react, Leaflet, leaflet.heat, Uppy, MediaRecorder API.