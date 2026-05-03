# Model Card

## Purpose

Documents the AI models used in CrisisConnect — their purpose, inputs, outputs, performance characteristics, known limitations, and responsible use guidance.

---

## Overview

CrisisConnect uses a hybrid AI architecture: GPT-4o-mini (via OpenAI API) for text and image understanding, combined with deterministic algorithms for signal fusion, geographic risk, and crowd aggregation. The system is designed to remain functional when the external AI model is unavailable by falling back to rule-based scoring.

---

## Models

### 1. Crisis Intelligence Model

| Attribute | Value |
|---|---|
| **Model ID** | `gpt-4o-mini-2024-07-18` |
| **Provider** | OpenAI |
| **Type** | Large Language Model (text generation with structured output) |
| **Task** | Crisis report classification and urgency scoring |
| **Service file** | `server/modules/ai/crisis-intelligence.service.ts` |
| **Fallback** | Rule-based keyword scoring (always available) |

**Inputs:**

| Field | Type | Description |
|---|---|---|
| `title` | string | Incident title (max 200 chars) |
| `description` | string | Full incident description (max 2000 chars) |
| `type` | enum | One of 13 disaster type categories |
| `severity` | enum | User-reported severity (low/medium/high/critical) |
| `location` | string | Location name or address |

**Outputs:**

| Field | Type | Range | Description |
|---|---|---|---|
| `urgency` | number | 0–10 | Continuous urgency score |
| `urgencyLevel` | enum | minimal/low/moderate/high/critical | Categorical bucket |
| `confidence` | number | 0–1 | Model confidence in the classification |
| `intent` | enum | genuine_emergency/test/unclear/suspected_false | Intent classification |
| `fakeScore` | number | 0–100 | Probability of being a false report |
| `isSuspicious` | boolean | — | `fakeScore >= 70` |
| `reasoning` | string | — | Human-readable explanation |
| `recommendations` | string[] | — | Suggested response actions |

**System prompt design:** The prompt instructs the model to act as a disaster management AI assistant, focus on the described content rather than meta-commentary, output structured JSON matching the output schema, and flag uncertainty explicitly rather than guessing.

---

### 2. Multimodal Crisis Fusion Model

| Attribute | Value |
|---|---|
| **Model ID** | `gpt-4o-mini-2024-07-18` (vision capability) |
| **Provider** | OpenAI |
| **Type** | Multimodal LLM (text + vision) |
| **Task** | Fusing text, voice transcript, and image signals |
| **Service file** | `server/modules/ai/multimodal.service.ts` |

**Input modalities and weights:**

| Modality | Weight | Source |
|---|---|---|
| Text (title + description) | 40% | User submission |
| Voice transcript | 30% | Audio-to-text (external or provided) |
| Image URL | 30% | Uploaded media URL |

**Outputs:**

| Field | Type | Description |
|---|---|---|
| `crisisType` | enum | Detected disaster type from media |
| `urgency` | number 0–1 | Normalized urgency from fused signals |
| `confidence` | number 0–1 | Fusion confidence |
| `severity` | enum | Assessed severity |
| `explanation` | string | Per-modality reasoning |
| `fusionScores` | object | Individual scores per modality |
| `fusedScore` | number | Weighted fusion result |
| `requiresHumanReview` | boolean | True when confidence <0.7 or urgency ≥0.85 |

---

### 3. RAG Crisis Copilot

| Attribute | Value |
|---|---|
| **Model ID** | `gpt-4o-mini-2024-07-18` |
| **Provider** | OpenAI |
| **Type** | Retrieval-Augmented Generation |
| **Task** | Contextual disaster guidance in Hindi and English |
| **Service file** | `server/modules/ai/rag-knowledge.service.ts` |

**Knowledge base:**

The RAG knowledge base contains 8 disaster protocols embedded as structured documents:

| Protocol | Source |
|---|---|
| Flood response | NDRF guidelines (India) |
| Earthquake response | IMD + NDRF protocols |
| Fire evacuation | National Fire Protection guidelines |
| Medical emergency | Red Cross first-aid protocols |
| Storm shelter guidance | National Cyclone Risk Mitigation guidelines |
| Gas leak response | PESO safety guidelines |
| Building collapse | Urban search and rescue (USAR) protocols |
| Epidemic containment | WHO outbreak response framework |

**Retrieval:** Keyword + disaster type matching selects the top-2 relevant protocol documents. GPT-4o-mini augments the base protocol with location context when available.

**Output format:**
```json
{
  "steps": ["Step 1…", "Step 2…"],
  "warnings": ["Warning 1…"],
  "resources": ["NDRF: 011-24363260", "Emergency: 112"]
}
```

---

### 4. Rule-Based Fallback Scorer

| Attribute | Value |
|---|---|
| **Type** | Deterministic keyword + weight scoring |
| **Task** | AI urgency scoring when OpenAI is unavailable |
| **Service file** | `server/modules/ai/crisis-intelligence.service.ts` |

**Keyword categories and weights:**

| Category | Keywords (examples) | Score Added |
|---|---|---|
| Mass casualty | "dead", "casualties", "mass", "dozens" | +4 |
| Trapped | "trapped", "stuck", "buried", "rescue" | +3 |
| Medical emergency | "injured", "bleeding", "unconscious", "ambulance" | +3 |
| Earthquake | "earthquake", "tremor", "collapse", "rubble" | +4 |
| Fire | "fire", "burning", "smoke", "flames" | +2 |
| Flood | "flood", "submerged", "water rising" | +2 |
| Severe weather | "storm", "cyclone", "hurricane", "tornado" | +2 |

Severity baseline: `low=1, medium=3, high=6, critical=9`

Final score: `min(baseline + keyword_sum, 10)`

---

## Signal Fusion Algorithm (Non-ML)

The final priority score is computed by a deterministic weighted formula — not a trained model:

```
fusedScore = (aiUrgency × 0.50)
           + (locationRisk × 0.20)
           + (repetitionScore × 0.20)
           + (userTrustScore × 0.10)
```

This is fully auditable, reproducible, and does not drift over time. See [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) for full details.

---

## Performance Characteristics

| Metric | Value | Conditions |
|---|---|---|
| AI urgency latency (OpenAI) | 400–1200ms | p50 / p95 |
| AI urgency latency (fallback) | < 5ms | Always |
| Fake score accuracy | ~78% precision | Internal validation set |
| Intent classification accuracy | ~82% | Internal validation set |
| Multimodal fusion latency | 800–2500ms | p50 / p95, all modalities |
| Copilot response latency | 1000–4000ms | p50 / p95 |

*Note: Accuracy metrics are based on internal testing on a labeled dataset of 500 manually reviewed reports. Independent third-party evaluation has not been performed.*

---

## Bias & Limitations

### Language Bias
The system is optimized for English and Hindi. Reports in other languages will have reduced accuracy in both AI scoring and rule-based fallback. Non-English keywords are not in the current keyword dictionary.

### Geographic Bias
The RAG knowledge base references Indian emergency protocols (NDRF, IMD, PESO). Deployments in other countries should update the knowledge base with local protocols and emergency numbers.

### Severity Escalation Bias
The AI model tends to escalate severity when keywords like "children", "hospital", or "school" appear, even when the described event may be minor. This is a deliberate safety bias — false positives are preferred over false negatives in life-safety contexts.

### Trust Score Cold Start
New users start with a trust score of 0. Their reports receive only 10% weighting from the trust signal, but this does not prevent their reports from being prioritized if AI urgency and location risk are high.

### Fake Detection False Positives
The fake detection model may flag genuine reports from new accounts or reports submitted rapidly after a major news event (assumed coordinated). Admins should review all `isSuspicious: true` flags rather than auto-acting on them.

### No Continuous Learning
The models do not learn from operator feedback. Override decisions (approve/reject in the human review queue) are stored in `ai_overrides` for future fine-tuning but are not currently fed back into model training.

---

## Responsible Use

- **Do not use AI scores as the sole basis for emergency dispatch decisions.** The system is designed to assist human operators, not replace them.
- **Always maintain a human review queue.** The `requiresHumanReview` flag exists to ensure high-stakes decisions get human oversight.
- **Audit AI decisions regularly.** The `/explainability` page and `GET /api/ai/decisions` endpoint provide full audit trails.
- **Test fallback behavior.** Disable `OPENAI_API_KEY` in staging to verify the rule-based fallback produces acceptable results for your deployment context.
- **Update knowledge base for local context.** Emergency numbers, protocols, and terminology vary by country. The RAG knowledge base should be localized before deployment.

---

## Versioning

| Component | Current Version | Upgrade Path |
|---|---|---|
| GPT-4o-mini | `gpt-4o-mini-2024-07-18` | Update `OPENAI_MODEL` env var |
| Rule-based scorer | v1.0 (built-in) | Edit keyword lists in `crisis-intelligence.service.ts` |
| RAG knowledge base | v1.0 (8 protocols) | Add documents to `rag-knowledge.service.ts` |
| Signal fusion weights | v1.0 (50/20/20/10) | Adjust constants in `signal-fusion.service.ts` |

---

## Related Docs

- [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) — full feature pipeline
- [TRAINING_GUIDE.md](TRAINING_GUIDE.md) — how to improve the models
- [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) — design decisions behind AI architecture
- [API_REFERENCE.md](API_REFERENCE.md) — AI endpoint documentation
