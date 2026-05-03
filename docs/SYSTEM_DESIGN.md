# System Design

## Purpose

Deep-dive into the architectural trade-offs, design decisions, and patterns that underpin CrisisConnect. Where ARCHITECTURE.md describes *what* exists, this document explains *why* it was built that way.

---

## Overview

CrisisConnect is designed around three non-negotiable constraints of disaster response systems:

1. **Availability over consistency** — the platform must remain functional even when external services (AI, weather, maps) are down.
2. **Explainability over accuracy** — every automated decision must be interpretable by a human operator who can override it.
3. **Offline tolerance** — citizens in disaster zones often have degraded connectivity. The platform must still accept critical SOS submissions.

Every major design decision derives from one of these constraints.

---

## Detailed Breakdown

### 1. Multi-Signal AI Fusion

**Problem:** A single AI model score is opaque, brittle, and fails silently when OpenAI is unavailable.

**Decision:** Replace single-score AI with a four-component weighted fusion formula evaluated locally:

```
fusedScore = (aiUrgency × 0.5) + (locationRisk × 0.2) + (repetitionScore × 0.2) + (userTrustScore × 0.1)
```

| Component | Source | Weight | Rationale |
|---|---|---|---|
| `aiUrgency` | OpenAI GPT-4o-mini or rule-based fallback | 50% | Primary signal — text content analysis |
| `locationRisk` | Grid risk map (last 7 days of incidents) | 20% | High-risk areas amplify urgency |
| `repetitionScore` | Count of same-type reports ≤500m / 3h | 20% | Crowd confirmation boosts confidence |
| `userTrustScore` | Behavioral reputation (0–100 → 0–10) | 10% | Vetted users downweight anonymous noise |

**Trade-off:** The 50% weight on AI urgency means poor AI output significantly degrades the final score. Mitigation: the rule-based fallback uses keyword weights calibrated on historical data, so accuracy degrades gracefully rather than failing completely.

---

### 2. Circuit Breaker Pattern for External APIs

**Problem:** External APIs (OpenMeteo, Nominatim, Overpass, OpenAI) are flaky during actual disasters — exactly when reliability is most critical.

**Decision:** All external calls go through `CircuitBreaker` instances, never directly. The circuit breaker has three states:

```
CLOSED (normal)
  → N consecutive failures → OPEN
OPEN (tripped)
  → timeout period → HALF_OPEN
HALF_OPEN (testing)
  → M consecutive successes → CLOSED
  → 1 failure → OPEN
```

**Configuration defaults:** `failureThreshold: 5`, `timeout: 30s`, `successThreshold: 2`.

**Fallbacks:** Every circuit-protected call has a synchronous fallback that returns stale data or a safe default — never an error to the caller.

**Trade-off:** Fallback data may be stale (e.g., geocode from cache, weather from last stored snapshot). This is acceptable — stale data is better than a failed request during a disaster.

---

### 3. Event-Driven Internal Bus vs. Direct Service Calls

**Problem:** Services need to react to each other's events (a new SOS should trigger dispatch, which should trigger a WebSocket broadcast), but direct coupling makes services hard to test and extend.

**Decision:** A typed `CrisisEventBus` singleton (extends Node's `EventEmitter`) decouples publishers from subscribers.

```typescript
// Publisher (sos.routes.ts)
eventBus.publish({ type: "SOS_ACTIVATED", payload: { sosId, userId, location } });

// Subscriber (routes/index.ts)
eventBus.subscribe("SOS_ACTIVATED", (payload) => {
  broadcastToAll({ type: "SOS_ACTIVATED", ...payload });
});
```

**Trade-off:** In a single-process deployment, `EventEmitter` is synchronous within a tick — subscribers run before the next await. For multi-pod deployments, this must be replaced with a message broker (Redis Streams or Kafka). The API mirrors Kafka's producer/consumer interface intentionally to make migration straightforward.

---

### 4. Offline-First SOS Queue

**Problem:** Citizens in disaster zones may lose internet connectivity precisely when they need to send an SOS.

**Decision:** `OfflineSyncContext` stores SOS submissions in `localStorage` when `navigator.onLine === false`. On reconnect, `flushQueue()` replays them in submission order with auth tokens attached.

```
Browser offline
  → queueSOS(data) → localStorage["offlineSOSQueue"]
Browser reconnects
  → flushQueue() → POST /api/sos (up to 5 retries per item)
  → clear queue on success
```

**Trade-off:** LocalStorage is limited to ~5MB and is not shared across tabs. A failed flush (e.g., auth token expired) will retry up to 5 times before giving up, and the item remains in the queue for manual inspection.

---

### 5. SLA Escalation Timer Architecture

**Problem:** SOS alerts that are not responded to within a time window must automatically escalate — but the escalation logic must survive server restarts.

**Decision:** Escalation is implemented as three `setTimeout` chains anchored to the SOS activation timestamp. On server restart, any active SOS alerts have their timers re-registered from the database.

```
SOS activated → t+0s: dispatch attempt
              → t+30s: expand radius, retry dispatch
              → t+60s: notify local authorities, broadcast alert
              → t+120s: public broadcast to all clients
```

**Trade-off:** `setTimeout` is in-process. For multi-pod deployments, escalation must move to a durable job queue (e.g., Bull with Redis) to avoid duplicate escalations across pods.

---

### 6. Role-Based UX (Not Just RBAC)

**Problem:** Traditional role-based systems hide/show UI elements for the same page. In disaster management, each role needs a fundamentally different workflow — a citizen needs SOS-first, a volunteer needs a task queue, an authority needs a command map.

**Decision:** The `/` and `/dashboard` routes render entirely different component trees based on role:

| Role | Component | Philosophy |
|---|---|---|
| `citizen` / `user` | `CitizenDashboard` | SOS-first, large buttons, calming colors |
| `volunteer` / `ngo` | `VolunteerCommandDashboard` | Task queue, accept/complete flow |
| `authority` / `government` | `AuthorityCommandCenter` | Dark mode, full-screen map, dispatch actions |
| `admin` / `super_admin` | Redirect to `/admin` | Operations and moderation |

**Trade-off:** More component code to maintain. Mitigated by the feature module architecture — each dashboard imports from the same feature hooks and services.

---

### 7. Drizzle ORM vs. Prisma

**Decision:** Drizzle ORM over Prisma.

| Criterion | Drizzle | Prisma |
|---|---|---|
| Runtime overhead | Minimal (pure SQL builder) | Prisma Client engine adds ~10MB binary |
| Neon compatibility | Native with `@neondatabase/serverless` | Requires workarounds |
| Raw SQL escape hatch | `sql` tag, easy | Complex |
| Migration workflow | `drizzle-kit push` (dev) | `prisma migrate` (generates migration files) |
| Type inference | Inferred from schema | Generated from schema |

The Neon serverless driver compatibility was the deciding factor — Prisma's query engine has known issues with WebSocket-based serverless Postgres connections.

---

### 8. WebSocket Architecture

**Problem:** Disaster events must reach all connected clients with minimal latency. Standard polling would add 5–30 seconds of lag.

**Decision:** A single WebSocket server is integrated with the Express HTTP server. The client maintains one singleton WebSocket connection per session, reconnecting with exponential backoff (2s → 30s).

**Message types:**
- `NEW_CRISIS` — new disaster report created
- `CRISIS_UPDATED` — report status changed
- `SOS_ACTIVATED` — SOS alert created
- `SOS_RESOLVED` — SOS alert resolved
- `sos_dispatch_notification` — responder assigned
- `sos_sla_escalation` — SLA timer fired
- `broadcast_alert` — admin/NGO broadcast
- `TYPING_START` / `TYPING_STOP` — chat typing indicators
- `READ_RECEIPT` / delivery receipts — chat message status

**Security:** WebSocket connections require JWT authentication on the initial HTTP handshake. Message encryption (AES-GCM) is applied to `chat_message` payloads.

---

### 9. Human-in-the-Loop AI Override

**Problem:** AI confidence scores are not always reliable, especially for edge cases (e.g., a genuine but unusual report flagged as suspicious).

**Decision:** Reports with `confidence < 0.7 || urgency >= 0.85 || severity === "critical"` are marked `requiresHumanReview: true` and inserted into the `ai_overrides` table with status `pending_review`.

Admins see a queue of pending decisions, can inspect the AI reasoning, and either approve the AI decision or override it (writing the correction back to `disaster_reports`).

**Trade-off:** This adds review latency for critical reports. Mitigated by: (1) dispatch still happens automatically at the AI-assessed priority, and (2) the override updates the report for future analytics and model feedback.

---

## Key Design Decisions Summary

| Decision | Pattern | Trade-off |
|---|---|---|
| External API protection | Circuit breaker + sync fallback | Stale data on fallback |
| Cross-service communication | Typed event bus | Multi-pod requires message broker |
| Offline SOS | LocalStorage queue | No cross-tab sharing |
| SLA escalation | setTimeout chains | In-process, not durable |
| AI scoring | Multi-signal fusion formula | OpenAI quality still dominates 50% |
| Role differentiation | Separate component trees | More component code |
| DB access | Drizzle ORM | Less mature ecosystem than Prisma |
| Session state | PostgreSQL store | Extra DB latency vs. Redis |

---

## Scalability Roadmap

| Current | Scaled |
|---|---|
| Single Express process | Kubernetes deployment (horizontal pods) |
| In-process pub/sub | Redis pub/sub adapter (already abstracted) |
| In-process job queue | Redis + Bull queue |
| In-process SLA timers | Durable job queue (Bull delayed jobs) |
| In-memory LRU cache | Redis cache |
| Neon serverless | PostgreSQL + PgBouncer pooler |

---

## Edge Cases & Limitations

- **Anonymous SOS:** SMS-triggered SOS alerts have no `userId`. Any analytics or trust scoring that joins on `userId` must handle null.
- **Simulation data in production DB:** The simulation engine inserts real rows tagged `[SIM]`. Production dashboards filter these out via status field, but analytics endpoints must be verified to exclude simulation data.
- **Digital twin city data:** The default seed uses a Mumbai-inspired 15-node graph. Propagation accuracy depends entirely on the quality of the seed data.
- **AI fallback accuracy:** The rule-based AI fallback uses keyword matching tuned for English and Hindi. Reports in other languages will have degraded urgency scoring.

---

## Related Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — what the layers are
- [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) — AI scoring details
- [MODEL_CARD.md](MODEL_CARD.md) — AI model inputs and outputs
- [DEPLOYMENT.md](DEPLOYMENT.md) — scaling guide
