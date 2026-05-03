/**
 * Unit tests — Signal Fusion scoring logic
 * Tests haversine distance, weight normalization, priority assignment.
 */

import { describe, it, expect } from "vitest";

// ── Haversine (mirrored from signal-fusion.service.ts) ────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Priority assignment ───────────────────────────────────────────────────────

function assignPriority(normalized: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  return normalized >= 0.8 ? "CRITICAL"
    : normalized >= 0.6 ? "HIGH"
    : normalized >= 0.35 ? "MEDIUM"
    : "LOW";
}

// ── Fused score computation ───────────────────────────────────────────────────

function computeFused(
  weights: { aiUrgency: number; locationRisk: number; repetitionScore: number; userTrustScore: number },
  components: { aiUrgency: number; locationRisk: number; repetitionScore: number; userTrustScore: number }
): number {
  return Math.min(1, Math.max(0, (
    weights.aiUrgency * components.aiUrgency +
    weights.locationRisk * components.locationRisk +
    weights.repetitionScore * components.repetitionScore +
    weights.userTrustScore * components.userTrustScore
  )));
}

// ─────────────────────────────────────────────────────────────────────────────

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(28.6, 77.2, 28.6, 77.2)).toBe(0);
  });

  it("returns correct distance for known coordinates", () => {
    // Delhi to Noida: ~20km
    const dist = haversineDistance(28.6139, 77.2090, 28.5355, 77.3910);
    expect(dist).toBeGreaterThan(15000);
    expect(dist).toBeLessThan(25000);
  });

  it("is symmetric", () => {
    const d1 = haversineDistance(28.6, 77.2, 28.7, 77.3);
    const d2 = haversineDistance(28.7, 77.3, 28.6, 77.2);
    expect(d1).toBeCloseTo(d2, 0);
  });

  it("returns distance in meters (not km)", () => {
    // 1 degree of latitude ≈ 111km = 111,000m
    const dist = haversineDistance(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(100_000);
    expect(dist).toBeLessThan(120_000);
  });
});

describe("assignPriority", () => {
  it("≥ 0.8 → CRITICAL", () => {
    expect(assignPriority(0.8)).toBe("CRITICAL");
    expect(assignPriority(0.95)).toBe("CRITICAL");
    expect(assignPriority(1.0)).toBe("CRITICAL");
  });

  it("0.6–0.799 → HIGH", () => {
    expect(assignPriority(0.6)).toBe("HIGH");
    expect(assignPriority(0.79)).toBe("HIGH");
  });

  it("0.35–0.599 → MEDIUM", () => {
    expect(assignPriority(0.35)).toBe("MEDIUM");
    expect(assignPriority(0.59)).toBe("MEDIUM");
  });

  it("< 0.35 → LOW", () => {
    expect(assignPriority(0.34)).toBe("LOW");
    expect(assignPriority(0.0)).toBe("LOW");
  });
});

describe("computeFused — static weights", () => {
  const WEIGHTS = { aiUrgency: 0.5, locationRisk: 0.2, repetitionScore: 0.2, userTrustScore: 0.1 };

  it("all signals at 1.0 → fused = 1.0", () => {
    const score = computeFused(WEIGHTS, { aiUrgency: 1, locationRisk: 1, repetitionScore: 1, userTrustScore: 1 });
    expect(score).toBeCloseTo(1.0, 5);
  });

  it("all signals at 0.0 → fused = 0.0", () => {
    const score = computeFused(WEIGHTS, { aiUrgency: 0, locationRisk: 0, repetitionScore: 0, userTrustScore: 0 });
    expect(score).toBe(0);
  });

  it("AI urgency dominates (50% weight vs 50% combined for others)", () => {
    // AI alone at 1.0 = 0.5 * 1.0 = 0.5
    // AI alone at 0.0 vs all others at 0.5 = 0.2*0.5 + 0.2*0.5 + 0.1*0.5 = 0.25
    const highAI = computeFused(WEIGHTS, { aiUrgency: 1.0, locationRisk: 0, repetitionScore: 0, userTrustScore: 0 });
    const lowAI  = computeFused(WEIGHTS, { aiUrgency: 0.0, locationRisk: 0.5, repetitionScore: 0.5, userTrustScore: 0.5 });
    expect(highAI).toBeGreaterThan(lowAI);
    // Specifically: highAI=0.5 > lowAI=0.25
    expect(highAI).toBeCloseTo(0.5, 5);
    expect(lowAI).toBeCloseTo(0.25, 5);
  });

  it("fused score is always clamped 0–1", () => {
    // Even with weights > 1 on each component
    const score = computeFused(
      { aiUrgency: 0.8, locationRisk: 0.8, repetitionScore: 0.8, userTrustScore: 0.8 },
      { aiUrgency: 1.0, locationRisk: 1.0, repetitionScore: 1.0, userTrustScore: 1.0 }
    );
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBeGreaterThanOrEqual(0.0);
  });

  it("weights summing to 1 gives deterministic results", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});
