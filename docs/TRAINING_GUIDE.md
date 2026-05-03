# Training Guide

## Purpose

Guides for improving, calibrating, and extending the AI components of CrisisConnect — including dataset preparation, model evaluation, fine-tuning, and reproducibility.

---

## Overview

CrisisConnect's AI layer currently uses three types of models:

1. **GPT-4o-mini** (OpenAI) — called via API for urgency scoring, fake detection, and multimodal analysis
2. **Rule-based scorer** — deterministic keyword+weight fallback, tunable without ML expertise
3. **Signal fusion formula** — deterministic weighted average, calibrated by weight constants

"Training" in this context means:
- Collecting and labeling incident data to evaluate and improve scoring accuracy
- Tuning signal fusion weights based on operator feedback
- Updating the rule-based keyword dictionary
- Preparing datasets for potential future fine-tuning of the language model

---

## Step 1: Data Collection

### Exporting Labeled Decisions

The `ai_overrides` table stores every AI decision alongside any human override. This is the primary training dataset source.

```sql
SELECT
  r.id AS report_id,
  r.title,
  r.description,
  r.type,
  r.severity AS user_severity,
  ao.original_decision->>'urgencyLevel' AS ai_urgency_level,
  ao.ai_confidence AS ai_confidence,
  ao.status,
  ao.overridden_decision->>'severity' AS human_severity,
  ao.reason AS override_reason,
  ao.created_at
FROM ai_overrides ao
JOIN disaster_reports r ON r.id = ao.incident_id
WHERE ao.status IN ('approved', 'overridden')
ORDER BY ao.created_at DESC;
```

Export to CSV for labeling:

```bash
# Via API
curl -H "Authorization: Bearer <admin_token>" \
  "http://localhost:5000/api/compliance/audit-trail?limit=1000" \
  > audit_trail.json

# Via psql
psql $DATABASE_URL -c "\COPY (SELECT ...) TO 'decisions.csv' CSV HEADER"
```

---

## Step 2: Dataset Preparation

### Labeling Schema

Each training example should have:

```json
{
  "id": "rpt_abc123",
  "title": "Flash flood on MG Road",
  "description": "Water rising rapidly, cars submerged...",
  "type": "flood",
  "user_severity": "high",
  "ai_urgency": 8.4,
  "ai_confidence": 0.87,
  "human_label_urgency": 9.0,
  "human_label_is_genuine": true,
  "notes": "AI slightly underscored — multiple casualties mentioned"
}
```

### Minimum Dataset Size

| Task | Minimum examples | Recommended |
|---|---|---|
| Urgency calibration | 200 | 1000+ |
| Fake detection evaluation | 100 | 500+ |
| Intent classification | 150 | 500+ |
| Multimodal fusion | 50 | 200+ |

### Data Quality Checks

Before using any dataset for evaluation or tuning:

```
1. Remove duplicate report IDs
2. Filter out [SIM] tagged simulation records
3. Verify all labels are from admin/authority reviewers (not self-reported)
4. Balance across disaster types (≥10 examples per type)
5. Balance genuine vs. suspicious labels (aim for 80/20 ratio — real ratio)
```

---

## Step 3: Evaluating Current Performance

### Running Evaluation Against Labeled Dataset

```typescript
// scripts/evaluate-model.ts
import { analyzeReport } from "../server/modules/ai/crisis-intelligence.service";

const dataset = require("./labeled_dataset.json");
let correct = 0;
let total = 0;

for (const example of dataset) {
  const result = await analyzeReport({
    title: example.title,
    description: example.description,
    type: example.type,
    severity: example.user_severity,
    location: "",
  });

  const aiLevel = getUrgencyBucket(result.urgency);
  const humanLevel = getUrgencyBucket(example.human_label_urgency);

  if (aiLevel === humanLevel) correct++;
  total++;
}

console.log(`Accuracy: ${(correct / total * 100).toFixed(1)}%`);
```

Run: `npx tsx scripts/evaluate-model.ts`

### Key Metrics to Track

| Metric | Formula | Target |
|---|---|---|
| Urgency accuracy | Correct level / Total | ≥ 80% |
| Fake precision | True positives / (TP + FP) | ≥ 75% |
| Fake recall | True positives / (TP + FN) | ≥ 70% |
| Intent accuracy | Correct intent / Total | ≥ 80% |
| Override rate | Overrides / Total AI decisions | < 15% |

---

## Step 4: Tuning the Rule-Based Fallback

The rule-based scorer is in `server/modules/ai/crisis-intelligence.service.ts` in the `ruleBasedAnalysis()` function. Update keyword weights based on evaluation findings.

### Keyword Dictionary Update Process

```typescript
// Current keyword structure
const keywordWeights: Record<string, number> = {
  "trapped": 3,
  "casualties": 4,
  "fire": 2,
  "flood": 2,
  "earthquake": 4,
  // Add new keywords here:
  "landslide": 3,
  "toxic": 3,
  "explosion": 4,
};
```

**Process:**
1. Identify report types where AI fallback accuracy is lowest (from evaluation).
2. Extract common keywords from those report descriptions.
3. Assign weights (1–5 scale) based on severity contribution.
4. Re-run evaluation script to verify improvement.
5. Commit the updated keyword dictionary.

---

## Step 5: Tuning Signal Fusion Weights

Current weights: `AI:50% + Location:20% + Repetition:20% + Trust:10%`

### When to Retune

- Override rate exceeds 20% for a specific priority level.
- High-fidelity incidents are consistently under-prioritized.
- A specific signal is consistently unreliable (e.g., location risk in a new deployment region with sparse historical data).

### Retuning Process

```typescript
// server/modules/ai/signal-fusion.service.ts
const WEIGHTS = {
  aiUrgency: 0.50,       // Adjust based on AI model reliability
  locationRisk: 0.20,    // Reduce if location data is sparse
  repetitionScore: 0.20, // Increase if crowd signal is reliable
  userTrustScore: 0.10,  // Increase if user base is well-established
};
```

**Constraints:** Weights must sum to 1.0.

**Evaluation:** After changing weights, re-run the evaluation script on the labeled dataset. Compare override rates before and after.

---

## Step 6: Updating the RAG Knowledge Base

The copilot knowledge base is in `server/modules/ai/rag-knowledge.service.ts`.

### Adding a New Protocol

```typescript
// In rag-knowledge.service.ts, add to the knowledgeBase array:
{
  id: "chemical_spill_v1",
  type: "chemical_spill",
  title: "Chemical Spill Response Protocol",
  language: "en",
  content: `
    IMMEDIATE ACTIONS:
    1. Evacuate the area upwind from the spill...
    2. Call hazmat team: 1800-XXX-XXXX
    ...
  `,
  source: "CPCB Chemical Safety Guidelines",
  version: "1.0",
  lastUpdated: "2026-01-01",
}
```

### Localizing Emergency Numbers

Search for `emergencyNumbers` in `rag-knowledge.service.ts` and update for the deployment region:

```typescript
const emergencyNumbers = {
  en: {
    general: "112",
    police: "100",
    fire: "101",
    ambulance: "102",
    ndrf: "011-24363260",
    // Add local numbers:
    coastGuard: "1554",
    toxicHelpline: "1800-180-1104",
  },
  hi: {
    general: "112",
    // Hindi equivalents
  },
};
```

---

## Step 7: Fine-Tuning the Language Model (Advanced)

For deployments that process high incident volumes, fine-tuning GPT-4o-mini can improve accuracy for specific disaster types and local terminology.

### Preparing Fine-Tuning Data

OpenAI fine-tuning requires JSONL format:

```jsonl
{"messages": [{"role": "system", "content": "You are a crisis assessment AI..."}, {"role": "user", "content": "{\"title\": \"Flash flood\", \"description\": \"...\"}"}, {"role": "assistant", "content": "{\"urgency\": 8.5, \"urgencyLevel\": \"critical\", \"confidence\": 0.91, \"intent\": \"genuine_emergency\", \"fakeScore\": 5}"}]}
```

**Export labeled data to JSONL:**

```bash
npx tsx scripts/export-fine-tuning-dataset.ts \
  --input labeled_dataset.json \
  --output fine_tuning_data.jsonl \
  --min-confidence 0.8
```

**Minimum dataset:** 50 examples (recommended: 200+).

### Uploading and Starting Fine-Tuning

```bash
# Upload dataset
openai api files.create -f fine_tuning_data.jsonl -p fine-tune

# Start fine-tuning job
openai api fine_tuning.jobs.create \
  --training-file <file_id> \
  --model gpt-4o-mini-2024-07-18

# Monitor progress
openai api fine_tuning.jobs.retrieve <job_id>
```

### Deploying the Fine-Tuned Model

```env
# .env
OPENAI_MODEL=ft:gpt-4o-mini-2024-07-18:your-org:crisis-v1:abc123
```

The `crisis-intelligence.service.ts` reads `OPENAI_MODEL` at runtime — no code change needed.

---

## Reproducibility

### Pinning the Model Version

The model version is logged in every `ai_overrides` row as `modelVersion`. When comparing evaluations, filter to the same model version:

```sql
SELECT model_version, COUNT(*) as decisions, AVG(ai_confidence) as avg_confidence
FROM ai_overrides
GROUP BY model_version
ORDER BY decisions DESC;
```

### Deterministic Fallback

The rule-based fallback has no randomness — identical inputs always produce identical outputs. Use this property to write regression tests:

```typescript
// tests/unit/rule-based-fallback.test.ts
it("scores critical earthquake correctly", () => {
  const score = ruleBasedAnalysis({
    title: "Major earthquake, buildings collapsed",
    description: "Hundreds trapped under rubble",
    type: "earthquake",
    severity: "critical",
  });
  expect(score.urgency).toBeGreaterThanOrEqual(9.0);
});
```

### Seeded Evaluation Runs

When evaluating on the full dataset, log the model version, dataset hash, and evaluation timestamp to ensure results are traceable:

```typescript
const evaluationLog = {
  timestamp: new Date().toISOString(),
  modelVersion: process.env.OPENAI_MODEL ?? "rule-based-v1",
  datasetHash: hashDataset(dataset),
  results: { accuracy, fakeF1, intentAccuracy },
};

fs.writeFileSync("evaluation_results.json", JSON.stringify(evaluationLog, null, 2));
```

---

## Hyperparameter Reference

| Parameter | Current Value | Location | Description |
|---|---|---|---|
| AI urgency weight | 0.50 | `signal-fusion.service.ts` | Weight in fusion formula |
| Location risk weight | 0.20 | `signal-fusion.service.ts` | Weight in fusion formula |
| Repetition weight | 0.20 | `signal-fusion.service.ts` | Weight in fusion formula |
| Trust score weight | 0.10 | `signal-fusion.service.ts` | Weight in fusion formula |
| Fake threshold | 70 | `crisis-intelligence.service.ts` | `fakeScore >= 70` → suspicious |
| Review confidence threshold | 0.70 | `multimodal.service.ts` | `confidence < 0.7` → human review |
| Review urgency threshold | 0.85 | `multimodal.service.ts` | `urgency >= 0.85` → human review |
| Geo cluster radius | 500m | `event-aggregation.service.ts` | Haversine threshold for clustering |
| Semantic similarity threshold | 0.20 | `event-aggregation.service.ts` | Jaccard threshold for merging |
| Cluster time window | 3h | `event-aggregation.service.ts` | Rolling window for repetition |
| Location risk decay | λ=0.1 | `risk-mapping.service.ts` | Exponential decay per day |
| Risk grid cell size | 0.1° | `risk-mapping.service.ts` | ~11km cell at equator |

---

## Related Docs

- [MODEL_CARD.md](MODEL_CARD.md) — model purpose, inputs, outputs, bias
- [FEATURE_ENGINEERING.md](FEATURE_ENGINEERING.md) — feature pipeline details
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — debugging AI scoring issues
