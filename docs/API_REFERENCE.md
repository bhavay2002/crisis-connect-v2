# API Reference

## Purpose

Complete reference for every HTTP endpoint in CrisisConnect — method, route, authentication requirement, request schema, and response shape.

---

## Overview

The CrisisConnect API is a RESTful JSON API served on port 5000. All `/api/*` routes return `Content-Type: application/json`. The public developer API is available under `/v1/*` and requires an API key.

**Base URL (development):** `http://localhost:5000`

**Authentication:** JWT access token in `Authorization: Bearer <token>` header. Refresh tokens are stored in `httpOnly` cookies.

**Error envelope (all errors):**
```json
{
  "message": "Human-readable error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Pagination (all list endpoints):**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

## Authentication

### Register
`POST /api/auth/register`

**Auth:** None

**Request:**
```json
{
  "email": "user@example.com",
  "password": "MinLength8!",
  "name": "Jane Doe",
  "role": "citizen"
}
```

**Response `201`:**
```json
{
  "user": { "id": "usr_abc", "email": "...", "role": "citizen" },
  "accessToken": "eyJ..."
}
```

---

### Login
`POST /api/auth/login`

**Auth:** None · Rate limited: 10 req/15 min

**Request:**
```json
{ "email": "user@example.com", "password": "..." }
```

**Response `200`:**
```json
{
  "user": { "id": "...", "email": "...", "role": "citizen", "name": "..." },
  "accessToken": "eyJ..."
}
```
Sets `httpOnly` cookie `refreshToken`.

---

### Refresh Token
`POST /api/auth/refresh`

**Auth:** Refresh token cookie

**Response `200`:** `{ "accessToken": "eyJ..." }`

---

### Logout
`POST /api/auth/logout`

**Auth:** JWT · Clears refresh token cookie.

---

### Current User
`GET /api/auth/me`

**Auth:** JWT

**Response `200`:** Full user object including role, reputation, verification status.

---

## Disaster Reports

### Submit Report
`POST /api/reports`

**Auth:** JWT · Rate limited: 5 req/15 min

**Request:**
```json
{
  "type": "flood",
  "severity": "high",
  "title": "Flash flood on MG Road",
  "description": "Water rising rapidly...",
  "location": "MG Road, Bangalore",
  "latitude": "12.9716",
  "longitude": "77.5946",
  "mediaUrls": ["https://..."]
}
```

**Response `201`:**
```json
{
  "id": "rpt_abc",
  "fusedScore": 8.4,
  "priority": "CRITICAL",
  "aiValidationScore": 87,
  "requiresHumanReview": false,
  "dispatch": { "responderId": "...", "eta": "8 minutes" }
}
```

**Disaster types:** `flood | earthquake | fire | storm | epidemic | road_accident | building_collapse | power_outage | water_contamination | gas_leak | chemical_spill | landslide | other`

**Severity levels:** `low | medium | high | critical`

---

### List Reports
`GET /api/reports?page=1&limit=20&type=flood&severity=high&status=reported`

**Auth:** JWT

---

### Get Report
`GET /api/reports/:id`

**Auth:** JWT

---

### Update Report Status
`PATCH /api/reports/:id/status`

**Auth:** JWT · Roles: admin, authority, government

**Request:** `{ "status": "verified" }`

---

### Verify Report (Upvote)
`POST /api/reports/:id/verify`

**Auth:** JWT

---

### Flag Report
`POST /api/reports/:id/flag`

**Auth:** JWT

**Request:** `{ "flagType": "false_report" | "duplicate" | "spam" }`

---

## SOS Alerts

### Activate SOS
`POST /api/sos`

**Auth:** JWT (or anonymous for SMS webhook)

**Request:**
```json
{
  "emergencyType": "flood",
  "severity": "critical",
  "location": "456 Park Ave",
  "latitude": "12.9716",
  "longitude": "77.5946",
  "description": "Trapped on rooftop",
  "contactNumber": "+91-9999999999"
}
```

**Response `201`:** `{ "id": "sos_xyz", "status": "active", "dispatchedTo": {...} }`

---

### Get SOS
`GET /api/sos/:id`

**Auth:** JWT

---

### Update SOS Status
`PATCH /api/sos/:id`

**Auth:** JWT · Roles: volunteer, ngo, admin, authority

**Request:** `{ "status": "in_progress" | "resolved" | "cancelled" }`

---

### Smart Dispatch
`POST /api/sos/:id/dispatch`

**Auth:** JWT · Roles: admin, authority

**Response:** `{ "responderId": "...", "score": 8.2, "algorithm": "40% geo + 30% reliability + 20% skill + 10% response-time", "eta": "6 min" }`

---

### Dispatch Status
`GET /api/sos/:id/dispatch-status`

**Auth:** JWT

---

### SOS State History
`GET /api/sos/:id/history`

**Auth:** JWT

**Response:** Full state machine transition log from `incident_logs`.

---

## AI Services

### Analyze Report
`POST /api/ai/analyze`

**Auth:** JWT · Rate limited: 20 req/min

**Request:** `{ "reportId": "rpt_abc" }`

**Response:**
```json
{
  "auditId": "aud_def",
  "fusedScore": 8.4,
  "priority": "CRITICAL",
  "components": {
    "aiUrgency": 9.2,
    "locationRisk": 7.5,
    "repetitionScore": 8.0,
    "userTrustScore": 6.8
  },
  "fakeDetection": { "score": 12, "isSuspicious": false },
  "urgencyLevel": "critical",
  "intent": "genuine_emergency",
  "requiresHumanReview": false
}
```

---

### Explain Decision
`GET /api/ai/explain/:reportId`

**Auth:** JWT · Roles: admin, authority, government

**Response:** Full breakdown with contributing factors, signal fusion components, reasoning, and audit trail.

---

### AI Decision Log
`GET /api/ai/decisions?page=1&limit=20`

**Auth:** JWT · Roles: admin, authority, government

---

### Early Warning
`GET /api/ai/early-warning`

**Auth:** JWT · Roles: admin, authority, government

**Response:** List of detected incident clusters (≥3 same-type reports within 1 hour).

---

### AI Crisis Copilot
`POST /api/ai/copilot`

**Auth:** JWT · Rate limited: 10 req/min

**Request:**
```json
{
  "query": "What should I do in a flash flood?",
  "language": "en",
  "disasterType": "flood",
  "location": "Mumbai"
}
```

**Response:**
```json
{
  "steps": ["Move to higher ground immediately", "..."],
  "warnings": ["Do not walk through moving water", "..."],
  "resources": ["NDRF Helpline: 011-24363260", "..."]
}
```

---

### Multimodal Analysis
`POST /api/ai/multimodal-analyze`

**Auth:** JWT · Roles: admin, authority, government

**Request:**
```json
{
  "text": "Building on fire, people trapped",
  "voiceTranscript": "Help help fire third floor",
  "imageUrl": "https://...",
  "location": "MG Road"
}
```

---

### AI Override Queue
`GET /api/ai-overrides?status=pending_review`

**Auth:** JWT · Roles: admin, authority

---

### Review AI Override
`PATCH /api/ai-overrides/:id/review`

**Auth:** JWT · Roles: admin, authority

**Request:**
```json
{
  "action": "override",
  "overriddenDecision": { "severity": "critical", "type": "earthquake" },
  "reason": "Field verification confirmed severity"
}
```

---

## Admin Command Interface

### List Incidents
`GET /api/admin/incidents`

**Auth:** JWT · Role: admin

---

### Override Incident
`PATCH /api/admin/incident/:id/override`

**Auth:** JWT · Role: admin

**Request:** `{ "severity": "critical", "notes": "Upgraded after field report" }`

---

### Assign Responder
`POST /api/admin/incident/:id/assign`

**Auth:** JWT · Role: admin

**Request:** `{ "responderId": "vol_xyz" }`

---

### Escalate Incident
`POST /api/admin/incident/:id/escalate`

**Auth:** JWT · Role: admin

**Request:** `{ "reason": "No response in 10 minutes" }`

---

### Merge Incidents
`POST /api/admin/incidents/merge`

**Auth:** JWT · Role: admin

**Request:** `{ "primaryId": "inc_1", "secondaryId": "inc_2" }`

---

### Incident History
`GET /api/admin/incident/:id/history`

**Auth:** JWT · Role: admin

---

## Resource Management

### List Resource Requests
`GET /api/resources?page=1&limit=20&status=pending`

**Auth:** JWT

---

### Create Resource Request
`POST /api/resources`

**Auth:** JWT

**Request:** `{ "type": "water", "quantity": 50, "urgency": "high", "location": "..." }`

---

### List Aid Offers
`GET /api/aid`

**Auth:** JWT

---

### Create Aid Offer
`POST /api/aid`

**Auth:** JWT · Roles: volunteer, ngo

---

### Match Aid to Request
`POST /api/aid/match`

**Auth:** JWT · Roles: volunteer, ngo, admin

---

## Analytics

### Summary Stats
`GET /api/analytics/summary`

**Auth:** JWT

---

### Incident Funnel
`GET /api/analytics/funnel`

**Auth:** JWT · Roles: admin, government, authority

**Response:** 5-stage funnel (Submitted → Verified → Resources → Dispatched → Resolved) with counts and conversion rates.

---

### User Cohort
`GET /api/analytics/cohort`

**Auth:** JWT · Roles: admin, government, authority

---

### Peak Hours
`GET /api/analytics/peak-hours`

**Auth:** JWT · Roles: admin, government, authority

---

### SLA Compliance
`GET /api/analytics/sla-compliance`

**Auth:** JWT · Roles: admin, government, authority

---

### Resource Efficiency
`GET /api/analytics/resource-efficiency`

**Auth:** JWT · Roles: admin, government, authority

---

### Seasonal Patterns
`GET /api/analytics/seasonal-patterns`

**Auth:** JWT · Roles: admin, government, authority

---

### Predictive Analytics
`GET /api/analytics/predict`

**Auth:** JWT · Roles: admin, government, authority

---

## Geo Intelligence

### Risk Map
`GET /api/geo/risk-map`

**Auth:** JWT

**Response:** Grid of 0.1° cells with risk scores (0–100) and risk levels (very_low → very_high).

---

### Route Optimization
`POST /api/geo/route`

**Auth:** JWT · Roles: volunteer, ngo, admin, government, authority

**Request:**
```json
{
  "origin": { "lat": 12.97, "lng": 77.59 },
  "destination": { "lat": 12.93, "lng": 77.62 }
}
```

**Response:** Safe route polyline avoiding high-risk zones.

---

### Safe Zones
`GET /api/geo/safe-zones`

**Auth:** JWT

---

## Integrations

### Reverse Geocode
`GET /api/integration/maps/reverse-geocode?lat=12.97&lng=77.59`

**Auth:** JWT · Cached 24h

---

### Weather
`GET /api/integration/weather?lat=12.97&lng=77.59&region=Bangalore`

**Auth:** JWT

**Response:** `{ "temperature": "28°C", "rainfall": "12mm", "alertLevel": "watch", "riskScore": 42 }`

---

### Nearby Hospitals
`GET /api/integration/hospitals/nearby?lat=12.97&lng=77.59&radius=5`

**Auth:** JWT

---

### Integration Status
`GET /api/integration/status`

**Auth:** JWT · Roles: admin

**Response:** All circuit breaker states.

---

## Monitoring & Health

### Health Check
`GET /api/health`

**Auth:** None

**Response:** `{ "status": "ok" }`

---

### Detailed Health
`GET /api/health/detailed`

**Auth:** JWT · Roles: admin

**Response:** `{ "db": "ok", "memory": "72%", "circuitBreakers": {...}, "overall": "ok" }`

---

### Prometheus Metrics
`GET /api/metrics`

**Auth:** JWT · Roles: admin

**Response:** `text/plain` Prometheus format — `http_requests_total`, `http_response_time_ms`, `process_uptime_seconds`.

---

### Monitoring Stats
`GET /api/monitoring/stats`

**Auth:** JWT · Roles: admin, authority

---

### Monitoring Alerts
`GET /api/monitoring/alerts`

**Auth:** JWT · Roles: admin, authority

---

## Developer Platform

### Create API Key
`POST /api/developer/keys`

**Auth:** JWT

**Request:** `{ "name": "My Integration", "tier": "free" }`

**Response:** `{ "key": "cc_abc123..." }` *(shown once — store it immediately)*

---

### List API Keys
`GET /api/developer/keys`

**Auth:** JWT · Returns key prefix only, never the full key.

---

### Register Webhook
`POST /api/developer/webhooks`

**Auth:** JWT

**Request:** `{ "url": "https://yourapp.com/hook", "events": ["crisis.created", "sos.activated"] }`

**Response:** `{ "id": "...", "secret": "whsec_..." }`

---

### Test Webhook
`POST /api/developer/webhooks/:id/test`

**Auth:** JWT

---

### Webhook Delivery History
`GET /api/developer/webhooks/:id/deliveries`

**Auth:** JWT

---

## Public v1 API (API Key Required)

All `/v1/*` routes accept `Authorization: Bearer <api_key>` or `X-Api-Key: <api_key>`.

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Tier`.

### Submit Crisis Report
`POST /v1/crisis/report`

---

### Get Recent Alerts
`GET /v1/crisis/alerts?limit=20`

---

### Get Incident
`GET /v1/crisis/:id`

---

## Simulation

### Run Simulation
`POST /api/simulation/run`

**Auth:** JWT · Roles: admin, authority, super_admin

**Request:**
```json
{
  "scenario": "flood",
  "location": "Mumbai",
  "intensity": "high",
  "eventCount": 15
}
```

**Response:** `{ "totalEventsInjected": 15, "reportsCreated": 12, "sosAlertsCreated": 3, "scenarioScore": 74 }`

---

### Simulation History
`GET /api/simulation/runs`

**Auth:** JWT · Roles: admin, authority, super_admin

---

## Digital Twin

### Seed City Model
`POST /api/digital-twin/seed`

**Auth:** JWT · Role: admin

---

### Get City Model
`GET /api/digital-twin/model?cityId=mumbai`

**Auth:** JWT

---

### Simulate Propagation
`POST /api/digital-twin/simulate`

**Auth:** JWT · Roles: admin, authority

**Request:** `{ "nodeId": "node_hospital_1", "cityId": "mumbai" }`

---

## Compliance (GDPR)

### Export My Data
`GET /api/compliance/me/export`

**Auth:** JWT · Downloads JSON archive.

---

### Delete My Account
`DELETE /api/compliance/me/account`

**Auth:** JWT

**Request:** `{ "confirm": "DELETE_MY_ACCOUNT" }`

---

### Record Consent
`POST /api/compliance/me/consent`

**Auth:** JWT

**Request:** `{ "consentType": "data_processing", "granted": true }`

---

## SMS Webhook (Twilio)

### Incoming SMS
`POST /api/sms/webhook`

**Auth:** None (Twilio signature) · Form-encoded

**Supported commands:** `SOS`, `FIRE`, `FLOOD`, `MEDICAL`, `ACCIDENT`, `EARTHQUAKE`, `STORM`, `GAS`, `LANDSLIDE`, `HELP`

**Response:** TwiML `<Response><Message>...</Message></Response>`

---

## Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed Zod validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT but insufficient role/permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g. email already registered) |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server error |
| 503 | `CIRCUIT_OPEN` | External service circuit breaker is open |

---

## Related Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — how routes are organized
- [CONFIGURATION.md](CONFIGURATION.md) — environment variables
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) — API design decisions
