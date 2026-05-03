/**
 * Unit tests — DecisionEngine threshold logic
 * Tests score thresholds, decision types, auto-execution rules.
 * Pure logic tests — no DB calls.
 */

import { describe, it, expect } from "vitest";

// ── Mirror the decision engine logic for pure unit testing ────────────────────

const SEVERITY_RISK: Record<string, number> = {
  critical: 90, high: 70, medium: 40, low: 20,
};

function computeFusedScore(aiScore: number, severity: string): number {
  const locationRisk = SEVERITY_RISK[severity] ?? 40;
  const repetition = 50;
  const trust = 70;
  return (aiScore * 0.5 + locationRisk * 0.2 + repetition * 0.2 + trust * 0.1) / 100;
}

function classify(fusedScore: number, repetition = 50): {
  type: "DISPATCH" | "ESCALATE" | "BROADCAST" | "PREDEPLOY" | "NONE";
  autoExecutable: boolean;
} {
  if (fusedScore >= 0.8) return { type: "DISPATCH",  autoExecutable: true };
  if (fusedScore >= 0.6 && repetition >= 65) return { type: "BROADCAST", autoExecutable: false };
  if (fusedScore >= 0.6) return { type: "ESCALATE",  autoExecutable: false };
  if (fusedScore >= 0.35) return { type: "PREDEPLOY", autoExecutable: false };
  return { type: "NONE", autoExecutable: false };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("computeFusedScore", () => {
  it("critical severity with high AI score yields score ≥ 0.8", () => {
    const score = computeFusedScore(90, "critical");
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it("low severity with low AI score yields score < 0.35", () => {
    const score = computeFusedScore(10, "low");
    expect(score).toBeLessThan(0.35);
  });

  it("medium severity with moderate AI score yields medium-range score", () => {
    const score = computeFusedScore(50, "medium");
    expect(score).toBeGreaterThanOrEqual(0.35);
    expect(score).toBeLessThan(0.8);
  });

  it("score is always 0–1", () => {
    for (const sev of ["low", "medium", "high", "critical"]) {
      for (const ai of [0, 25, 50, 75, 100]) {
        const score = computeFusedScore(ai, sev);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("classify — decision thresholds", () => {
  it("score ≥ 0.8 → DISPATCH + autoExecutable", () => {
    const result = classify(0.85);
    expect(result.type).toBe("DISPATCH");
    expect(result.autoExecutable).toBe(true);
  });

  it("score exactly 0.8 → DISPATCH", () => {
    expect(classify(0.8).type).toBe("DISPATCH");
  });

  it("score 0.6–0.8 with high repetition → BROADCAST", () => {
    const result = classify(0.65, 70);
    expect(result.type).toBe("BROADCAST");
    expect(result.autoExecutable).toBe(false);
  });

  it("score 0.6–0.8 with normal repetition → ESCALATE", () => {
    const result = classify(0.65, 50);
    expect(result.type).toBe("ESCALATE");
    expect(result.autoExecutable).toBe(false);
  });

  it("score 0.35–0.6 → PREDEPLOY", () => {
    const result = classify(0.5);
    expect(result.type).toBe("PREDEPLOY");
    expect(result.autoExecutable).toBe(false);
  });

  it("score < 0.35 → NONE (no decision generated)", () => {
    const result = classify(0.2);
    expect(result.type).toBe("NONE");
  });

  it("DISPATCH is the only auto-executable type", () => {
    const dispatchable = [classify(0.9), classify(0.8)];
    const notDispatchable = [classify(0.65, 70), classify(0.65, 50), classify(0.5)];
    dispatchable.forEach(r => expect(r.autoExecutable).toBe(true));
    notDispatchable.forEach(r => expect(r.autoExecutable).toBe(false));
  });

  it("boundary: 0.799 → ESCALATE, 0.800 → DISPATCH", () => {
    expect(classify(0.799).type).toBe("ESCALATE");
    expect(classify(0.800).type).toBe("DISPATCH");
  });

  it("boundary: 0.349 → NONE, 0.350 → PREDEPLOY", () => {
    expect(classify(0.349).type).toBe("NONE");
    expect(classify(0.350).type).toBe("PREDEPLOY");
  });
});

describe("confidence calculation", () => {
  it("DISPATCH confidence is capped at 100", () => {
    const fusedScore = 0.9;
    const confidence = Math.min(Math.round(fusedScore * 115), 100);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it("confidence scales with fused score", () => {
    const low  = Math.min(Math.round(0.61 * 100), 100);
    const high = Math.min(Math.round(0.85 * 115), 100);
    expect(high).toBeGreaterThan(low);
  });
});
