# CrisisConnect Elite Architecture Features

## Overview
All 8 elite feature tracks have been implemented, providing industry-level disaster management capabilities.

---

## T001 — AI Layer (Multi-Signal Crisis Intelligence)

### Services
- `server/modules/ai/crisis-intelligence.service.ts`

### Capabilities
- **Multi-signal analysis**: Text + severity + type + GPS + image count combined scoring
- **Urgency scoring**: Continuous 0–10 scale with 5 levels (minimal → critical)
- **Emotion detection**: Fear, panic, calm, desperate, urgent, neutral
- **Intent detection**: Genuine emergency vs. casual mention vs. test report
- **Explainable AI**: Every decision includes `auditId`, contributing factors with weights, confidence, and reasoning
- **Fake detection**: Score 0–100 with specific reason flags
- **Early warning detection**: Clusters ≥3 reports of same type in 1 hour
- **Graceful degradation**: Rule-based fallback when OpenAI is unavailable

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/analyze` | Multi-signal crisis analysis |
| GET | `/api/ai/early-warning` | Detect early warning patterns |
| POST | `/api/ai/copilot` | RAG-based crisis guidance |
| GET | `/api/ai/explain/:reportId` | Explainable AI for a report |

---

## T002 — SOS Lifecycle Engine (Smart Dispatch + SLA Escalation)

### Services
- `server/modules/sos/dispatch.service.ts`

### Capabilities
- **SmartDispatchService**: Haversine geo-distance routing, skill matching for 10 disaster types, reputation weighting
  - Score formula: `40% distance + 30% skill match + 15% availability + 15% reputation`
- **SLAEscalationService**: Three-tier escalation
  - 30s → expand search radius to 50km
  - 60s → notify district authorities
  - 120s → broadcast region-wide public alert
- Auto-cancels escalation timers when SOS is resolved/cancelled

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sos/:id/dispatch` | Trigger smart dispatch for an SOS |
| GET | `/api/sos/:id/dispatch-status` | Get dispatch/response status |

---

## T003 — Geo-Intelligence (Risk Mapping + Route Optimization)

### Services
- `server/modules/geo/risk-mapping.service.ts`

### Capabilities
- **RiskMappingService**: Grid-based (0.1° cells) risk scoring
  - Factors: severity weight, time decay (72h), nighttime multiplier, density bonus
  - 5 risk levels: very_low → very_high
- **RouteOptimizer**: Haversine path analysis + waypoint detour around high-risk zones
- **Safe zones**: Inverse filter of risk map

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/geo/risk-map?lat=&lon=&radius=` | Generate risk map for area |
| POST | `/api/geo/route` | Optimize route avoiding high-risk zones |
| GET | `/api/geo/safe-zones?lat=&lon=` | Get safe zones near coordinates |

### Frontend
- **`/risk-map`** — Interactive Leaflet map with risk zone circles, route polylines, high-risk table

---

## T004 — AI Crisis Copilot (RAG Knowledge + Multi-Language)

### Services
- `server/modules/ai/rag-knowledge.service.ts`

### Capabilities
- **RAG knowledge base**: Embedded protocols for 8+ disaster types (fire, flood, earthquake, storm, road accident, epidemic, landslide, gas leak, building collapse)
- **Multi-language**: Hindi + English instructions
- **Local emergency numbers**: India-specific (112, 100, 101, 108, NDRF: 011-24363260)
- **Structured output**: Immediate actions, medical guidance, evacuation protocol, do-nots, government guidelines
- **OpenAI enhancement**: GPT-4o-mini augments base protocols with context-aware instructions

### Frontend
- **`/copilot`** — Full UI with emergency type/severity/location form + structured guidance output

---

## T005 — Real-Time Communication (Broadcast Alerts)

### Services
- `server/routes/broadcast.routes.ts`

### Capabilities
- **Broadcast alert system**: Admin/NGO can push global or regional alerts with severity levels (info/warning/critical)
- **WebSocket delivery**: Alerts delivered instantly via `type: "broadcast_alert"` to all connected clients
- **SOS dispatch notifications**: `type: "sos_dispatch_notification"` targeted to responders
- **SLA escalation events**: `type: "sos_sla_escalation"` at 30s/60s/120s thresholds
- **Alert expiration**: Time-boxed alerts automatically excluded after expiry

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/alerts/broadcast` | Send broadcast alert (admin/NGO) |
| GET | `/api/alerts/broadcast` | Get active broadcast alerts |
| POST | `/api/alerts/sos-dispatch` | Send SOS dispatch notification |

### Frontend
- **`/broadcast-alerts`** — Alert composer + active alerts list (admin/NGO only)

---

## T006 — Trust & Fraud Prevention

### Services
- `server/modules/trust/behavioral-analysis.service.ts`

### Capabilities
- **BehavioralAnalysisService**: Per-user behavioral profiling
  - Submission rate (24h window)
  - Average time between reports (spam detection)
  - Location consistency scoring (jump detection)
  - Severity distribution analysis (all-critical flag)
  - False report rate from reputation table
- **Anomaly detection flags**: `excessive_submissions_24h`, `reports_too_frequent`, `extreme_location_variance`, `disproportionate_critical_reports`, `high_false_report_rate`
- **Trust badge system**: unverified → trusted → verified_responder → elite_responder
- **System-wide anomaly detection**: Submission spikes and disaster-type clustering

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trust/user/:userId/profile` | Get behavioral profile |
| GET | `/api/trust/user/:userId/score` | Get trust score summary |
| GET | `/api/trust/anomalies` | System-wide anomaly detection (admin) |
| GET | `/api/trust/high-risk-users` | List high-risk users (admin) |

### Frontend
- **`/trust`** — Admin dashboard with anomaly alerts + high-risk user profiling

---

## T007 — Analytics & Intelligence Dashboard

### Services
- `server/routes/analytics-advanced.routes.ts`
- `server/modules/analytics/prediction.service.ts` (existing, enhanced)

### Capabilities
- **Peak crisis hours**: 24-hour heatmap with incident count + severity-weighted risk index
- **SLA compliance tracking**: Response time distribution (< 30s / 30-60s / 60-120s / > 120s), compliance rate
- **Resource efficiency scoring**: Fulfillment rate, aid match rate, inventory low-stock alerts
- **Seasonal patterns**: Monthly incident distribution with top disaster type per month
- **System health**: Real-time status (normal/warning/critical), active reports/SOS, anomaly count
- **Predictive analytics**: Historical pattern + seasonal boost → probability-based predictions with recommendations

### Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analytics/predict` | Generate disaster predictions for area |
| GET | `/api/analytics/peak-hours` | Peak crisis hour analysis |
| GET | `/api/analytics/sla-compliance` | SLA response time compliance |
| GET | `/api/analytics/resource-efficiency` | Resource utilization scoring |
| GET | `/api/analytics/seasonal-patterns` | Monthly/seasonal patterns |
| GET | `/api/analytics/system-health` | Real-time system health |

### Frontend
- **`/intelligence`** — Full intelligence dashboard with tabs: Overview, SLA, Peak Hours, Seasonal, Resources

---

## T008 — Architecture Summary

### Stack
- **Backend**: Node.js + Express + TypeScript, PostgreSQL via Drizzle ORM
- **AI**: OpenAI GPT-4o-mini (graceful rule-based fallback)
- **Real-time**: WebSocket (ws library) with encrypted message delivery
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Leaflet maps + Recharts

### New Routes Summary
All new routes registered in `server/routes/index.ts`:
- `registerAIIntelligenceRoutes` — `/api/ai/*`
- `registerGeoIntelligenceRoutes` — `/api/geo/*`
- `registerTrustRoutes` — `/api/trust/*`
- `registerBroadcastRoutes` — `/api/alerts/broadcast`
- `registerAdvancedAnalyticsRoutes` — `/api/analytics/peak-hours`, `/sla-compliance`, etc.

### New Frontend Pages
| Route | Component | Access |
|-------|-----------|--------|
| `/intelligence` | IntelligenceDashboard | admin, government |
| `/copilot` | CrisisCopilot | all roles |
| `/risk-map` | RiskMap | volunteer, ngo, admin, government |
| `/broadcast-alerts` | BroadcastAlerts | ngo, admin |
| `/trust` | TrustDashboard | admin only |
