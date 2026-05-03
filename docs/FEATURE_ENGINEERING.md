# Feature Engineering

## Purpose

Documents the AI feature pipeline in CrisisConnect — how raw incident data is transformed into structured signals, how those signals are fused into a priority score, and the rationale behind each design choice.

---

## Overview

CrisisConnect's AI pipeline is a four-stage process:

```
Raw incident data
    → Signal extraction (4 independent signals)
    → Normalization (all signals to 0–10 scale)
    → Weighted fusion
    → Priority classification + explainability output
```

Each stage is independently testable and has a rule-based fallback when external services are unavailable.

---

## Input Data

| Field | Type | Source | Used By |
|---|---|---|---|
| `title` | string | User submission | AI urgency, fake detection |
| `description` | string | User submission | AI urgency, fake detection, intent |
| `type` | enum (13 values) | User submission | Location risk, copilot routing |
| `severity` | enum (4 values) | User submission | AI urgency baseline, override trigger |
| `latitude` / `longitude` | string | GPS or manual | Location risk, repetition score |
| `mediaUrls` | string[] | File upload | Multimodal analysis (optional) |
| `userId` | string | Auth session | User trust score |
| `createdAt` | timestamp | Server | Repetition window calculation |

---

## Signal Extraction

### Signal 1: AI Urgency Score (`aiUrgency`)

**Service:** `server/modules/ai/crisis-intelligence.service.ts`

**Range:** 0–10

**Method:**

When OpenAI is configured:
```
Input → GPT-4o-mini with structured output schema
  → urgency (0–10), confidence (0–1), intent classification, fake score
```

When OpenAI is not configured (rule-based fallback):
```
Keywords extracted from title + description
Severity weight applied (low=1, medium=3, high=6, critical=9)
Keyword categories: medical_emergency (+3), mass_casualty (+4), trapped (+3),
                    fire (+2), flood (+2), earthquake (+4), bomb (+5)…
```

**Urgency levels:**

| Score | Level |
|---|---|
| 0–2 | minimal |
| 2–4 | low |
| 4–6 | moderate |
| 6–8 | high |
| 8–10 | critical |

---

### Signal 2: Location Risk Score (`locationRisk`)

**Service:** `server/modules/geo/risk-mapping.service.ts`

**Range:** 0–10

**Method:**
```
1. Discretize coordinates to 0.1° grid cell
2. Query all disaster_reports in that cell from the last 7 days
3. Compute base score = count × severity_weight
4. Apply time decay: score × exp(-λ × days_since_report), λ = 0.1
5. Apply nighttime bonus if current hour is 20:00–06:00 (×1.2)
6. Normalize to 0–10 scale
```

**Severity weights:**
- `low`: 1.0
- `medium`: 2.0
- `high`: 4.0
- `critical`: 8.0

**Output:**
```json
{
  "riskScore": 7.2,
  "riskLevel": "high",
  "incidentCount": 4,
  "dominantType": "flood"
}
```

---

### Signal 3: Repetition Score (`repetitionScore`)

**Service:** `server/modules/ai/event-aggregation.service.ts`

**Range:** 0–10

**Method:**
```
1. Query disaster_reports of the same type within:
   - Haversine distance ≤ 500m from the submitted incident
   - Time window: last 3 hours
2. Compute Jaccard similarity of tokenized (title + description) between the new report
   and each candidate (similarity threshold: 0.20)
3. Count confirmed duplicates N
4. repetitionScore = min(N × 2, 10)
```

A high repetition score indicates crowd confirmation of the same event — raising overall priority.

**Side effect:** If a matching cluster exists, the new report is linked (`incident_reports` join table). If no cluster exists, a new one is created.

---

### Signal 4: User Trust Score (`userTrustScore`)

**Service:** `server/modules/trust/behavioral-analysis.service.ts`

**Range:** 0–10 (normalized from internal 0–100 trust score)

**Trust score components:**

| Metric | Weight | Description |
|---|---|---|
| Verified reports | +5 each | Reports confirmed by community |
| False report flags | -20 each | Admin/community flagged false |
| Submission velocity | Variable | Excess submissions decay score |
| Location consistency | Variable | Extreme variance lowers score |
| Account age | +1 per 30 days | Long-standing accounts get bonus |
| Identity verification | +10 | Email/phone OTP verified |

**Trust badge thresholds:**

| Score | Badge |
|---|---|
| 0–25 | `unverified` |
| 26–50 | `trusted` |
| 51–75 | `verified_responder` |
| 76–100 | `elite_responder` |

---

## Signal Fusion

**Service:** `server/modules/ai/signal-fusion.service.ts`

**Formula:**
```
fusedScore = (aiUrgency    × 0.50)
           + (locationRisk × 0.20)
           + (repetitionScore × 0.20)
           + (userTrustScore  × 0.10)
```

**Priority classification:**

| fusedScore | Priority |
|---|---|
| 0–2.5 | LOW |
| 2.5–5.0 | MEDIUM |
| 5.0–7.5 | HIGH |
| 7.5–10.0 | CRITICAL |

**Weight rationale:**

- **50% AI urgency:** Text content is the richest signal. Urgency from GPT-4o-mini (or keyword fallback) captures the direct severity of what the person is describing.
- **20% location risk:** Historical hotspot data amplifies incidents in areas with a pattern of prior events.
- **20% repetition:** Crowd-sourced confirmation is a strong independent signal — multiple independent reports of the same event are very likely genuine.
- **10% user trust:** A small weighting that discounts noise from new/unverified accounts without dismissing their reports entirely.

---

## Multimodal Fusion

**Service:** `server/modules/ai/multimodal.service.ts`

When text, voice transcript, and image URL are all provided:

```
textScore    = analyze(text)       → normalized 0–1
voiceScore   = analyze(transcript) → normalized 0–1
imageScore   = analyze(imageUrl)   → normalized 0–1 (GPT-4o vision)

fusedScore = (textScore × 0.40) + (voiceScore × 0.30) + (imageScore × 0.30)
```

**Human review triggers from multimodal:**
- `confidence < 0.70`
- `urgency >= 0.85`
- `severity === "critical"`

When OpenAI is not configured, multimodal falls back to text-only keyword analysis.

---

## Fake Report Detection

**Service:** `server/modules/ai/crisis-intelligence.service.ts`

**Output:** `fakeScore` (0–100), `isSuspicious` (boolean), `reasons[]`

**Detection signals:**

| Signal | Weight | Description |
|---|---|---|
| Vague description | High | Short text with no specific details |
| Repeated submission | High | Same text hash submitted recently |
| Suspicious timing | Medium | Submitted immediately after a major news event |
| Location mismatch | High | Reported location inconsistent with user's historical locations |
| Coordinated accounts | Critical | Same device fingerprint, different user IDs |
| Low trust score | Medium | Account with history of flagged reports |

**Threshold:** `fakeScore >= 70` → `isSuspicious: true` → auto-flagged, not auto-removed.

---

## Explainability Output

Every AI analysis produces a full audit record stored in `ai_overrides`:

```json
{
  "auditId": "aud_abc123",
  "reportId": "rpt_xyz",
  "fusedScore": 8.4,
  "priority": "CRITICAL",
  "components": {
    "aiUrgency": 9.2,
    "locationRisk": 7.5,
    "repetitionScore": 8.0,
    "userTrustScore": 6.8
  },
  "fakeDetection": {
    "score": 12,
    "isSuspicious": false,
    "reasons": []
  },
  "confidence": 0.87,
  "urgencyLevel": "critical",
  "intent": "genuine_emergency",
  "reasoning": "Multiple reports of flooding corroborated by location risk history...",
  "recommendations": ["Dispatch flood response team", "Issue evacuation advisory"],
  "requiresHumanReview": false,
  "modelVersion": "gpt-4o-mini-2024-07-18",
  "timestamp": "2026-05-03T07:32:35.365Z"
}
```

---

## Feature Pipeline: End-to-End

```
POST /api/reports (user submits incident)
  │
  ├── Zod validation (type, severity, coordinates)
  │
  ├── Signal 1: AIValidationService.validateReport()
  │     → OpenAI GPT-4o-mini OR rule-based
  │     → urgency, confidence, intent, fakeScore
  │
  ├── Signal 2: RiskMappingService.getLocationRisk(lat, lng, type)
  │     → Grid query from disaster_reports (last 7 days)
  │     → riskScore, riskLevel, incidentCount
  │
  ├── Signal 3: EventAggregationService.aggregate(report)
  │     → Haversine ≤500m + Jaccard ≥0.20 + 3h window
  │     → repetitionScore, clusterAction, clusterSize
  │
  ├── Signal 4: TrustService.getUserTrustScore(userId)
  │     → Historical behavioral analysis
  │     → trustScore (0–100) → normalized to 0–10
  │
  ├── Fusion: SignalFusionService.fuse(sig1, sig2, sig3, sig4)
  │     → fusedScore, priority
  │
  ├── Override check: requiresHumanReview?
  │     → Insert into ai_overrides if true
  │
  ├── Insert disaster_reports row with AI scores
  │
  └── eventBus.publish("CRISIS_CREATED") → dispatch + WebSocket
```

---

## Edge Cases & Limitations

- **Non-English reports:** The rule-based fallback and keyword lists are English/Hindi only. GPT-4o-mini handles multilingual input but the rule-based fallback will under-score non-English reports.
- **GPS spoofing:** Location risk and repetition scoring trust the provided coordinates. No GPS authentication is performed.
- **Trust score cold start:** New users start with score 0. Their first reports get minimal trust weighting, which may under-prioritize genuine emergencies from new users.
- **Repetition score saturation:** The repetition score caps at 10 (N=5 matching reports). A mega-disaster with 100 matching reports gets the same repetition score as a minor event with 5.

---

## Related Docs

- [MODEL_CARD.md](MODEL_CARD.md) — AI model limitations and bias
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) — design decisions behind the fusion formula
- [ARCHITECTURE.md](ARCHITECTURE.md) — where these services live in the stack
