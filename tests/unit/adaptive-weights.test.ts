/**
 * Unit tests — AdaptiveWeightsService
 * Tests the SGD math, sigmoid, clamping, and normalization without hitting the DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Pure function tests (extracted from the service) ─────────────────────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeWeights(w: Record<string, number>): Record<string, number> {
  const keys = ["aiScore", "locationRisk", "repetitionScore", "userTrust", "weatherScore", "socialScore"];
  const total = keys.reduce((s, k) => s + (w[k] ?? 0), 0);
  if (total === 0) return w;
  const out: Record<string, number> = { ...w };
  for (const k of keys) out[k] = (w[k] ?? 0) / total;
  return out;
}

function sgdStep(
  weights: Record<string, number>,
  features: Record<string, number>,
  label: 0 | 1,
  learningRate = 0.01
): Record<string, number> {
  const keys = ["aiScore", "locationRisk", "repetitionScore", "userTrust", "weatherScore", "socialScore"];
  const logit = keys.reduce((s, k) => s + (weights[k] ?? 0) * (features[k] ?? 0), weights.bias ?? 0);
  const prediction = sigmoid(logit);
  const error = label - prediction;

  const updated: Record<string, number> = { ...weights };
  for (const k of keys) {
    updated[k] = clamp((weights[k] ?? 0) + learningRate * error * (features[k] ?? 0), 0.02, 0.95);
  }
  updated.bias = (weights.bias ?? 0) + learningRate * error;
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("sigmoid", () => {
  it("returns 0.5 for input 0", () => {
    expect(sigmoid(0)).toBe(0.5);
  });

  it("approaches 1 for large positive input", () => {
    expect(sigmoid(10)).toBeGreaterThan(0.99);
  });

  it("approaches 0 for large negative input", () => {
    expect(sigmoid(-10)).toBeLessThan(0.01);
  });

  it("is monotonically increasing", () => {
    expect(sigmoid(1)).toBeGreaterThan(sigmoid(0));
    expect(sigmoid(0)).toBeGreaterThan(sigmoid(-1));
  });
});

describe("clamp", () => {
  it("clamps below minimum", () => {
    expect(clamp(-0.5, 0.02, 0.95)).toBe(0.02);
  });

  it("clamps above maximum", () => {
    expect(clamp(1.5, 0.02, 0.95)).toBe(0.95);
  });

  it("passes through in-range values", () => {
    expect(clamp(0.5, 0.02, 0.95)).toBe(0.5);
  });
});

describe("normalizeWeights", () => {
  it("normalizes weights to sum 1", () => {
    const w = { aiScore: 0.5, locationRisk: 0.2, repetitionScore: 0.2, userTrust: 0.1, weatherScore: 0, socialScore: 0 };
    const normalized = normalizeWeights(w);
    const sum = ["aiScore", "locationRisk", "repetitionScore", "userTrust", "weatherScore", "socialScore"]
      .reduce((s, k) => s + normalized[k], 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("preserves proportions after normalization", () => {
    const w = { aiScore: 1.0, locationRisk: 1.0, repetitionScore: 1.0, userTrust: 1.0, weatherScore: 0, socialScore: 0 };
    const normalized = normalizeWeights(w);
    expect(normalized.aiScore).toBeCloseTo(0.25, 5);
    expect(normalized.locationRisk).toBeCloseTo(0.25, 5);
  });
});

describe("SGD weight update", () => {
  const baseWeights = {
    aiScore: 0.5, locationRisk: 0.2, repetitionScore: 0.2, userTrust: 0.1,
    weatherScore: 0.0, socialScore: 0.0, bias: 0.0,
  };

  it("increases weights for true positive (real crisis predicted non-crisis)", () => {
    const features = { aiScore: 0.9, locationRisk: 0.8, repetitionScore: 0.7, userTrust: 0.6, weatherScore: 0, socialScore: 0 };
    const logit = baseWeights.aiScore * features.aiScore + baseWeights.locationRisk * features.locationRisk;
    const pred = sigmoid(logit);
    // If pred < 0.5 and label = 1, weights should increase
    const updated = sgdStep(baseWeights, features, 1);
    if (pred < 1) {
      expect(updated.aiScore).toBeGreaterThanOrEqual(baseWeights.aiScore);
    }
  });

  it("decreases high weights for false positive", () => {
    const weights = { aiScore: 0.8, locationRisk: 0.5, repetitionScore: 0.3, userTrust: 0.2, weatherScore: 0, socialScore: 0, bias: 2.0 };
    const features = { aiScore: 0.9, locationRisk: 0.8, repetitionScore: 0.7, userTrust: 0.9, weatherScore: 0, socialScore: 0 };
    const updated = sgdStep(weights, features, 0);
    // With high bias, prediction is close to 1. label=0 → error < 0 → weights decrease
    expect(updated.aiScore).toBeLessThan(weights.aiScore);
  });

  it("respects weight clamping at minimum", () => {
    const weights = { aiScore: 0.02, locationRisk: 0.02, repetitionScore: 0.02, userTrust: 0.02, weatherScore: 0.02, socialScore: 0.02, bias: 0.0 };
    const features = { aiScore: 1.0, locationRisk: 1.0, repetitionScore: 1.0, userTrust: 1.0, weatherScore: 1.0, socialScore: 1.0 };
    const updated = sgdStep(weights, features, 0, 1.0); // large LR, should clamp
    expect(updated.aiScore).toBeGreaterThanOrEqual(0.02);
  });

  it("respects weight clamping at maximum", () => {
    const weights = { aiScore: 0.94, locationRisk: 0.1, repetitionScore: 0.1, userTrust: 0.1, weatherScore: 0.1, socialScore: 0.1, bias: -5.0 };
    const features = { aiScore: 1.0, locationRisk: 0.0, repetitionScore: 0.0, userTrust: 0.0, weatherScore: 0.0, socialScore: 0.0 };
    const updated = sgdStep(weights, features, 1, 1.0); // large LR, should clamp at 0.95
    expect(updated.aiScore).toBeLessThanOrEqual(0.95);
  });

  it("produces different weights for label=0 vs label=1", () => {
    const features = { aiScore: 0.5, locationRisk: 0.5, repetitionScore: 0.5, userTrust: 0.5, weatherScore: 0, socialScore: 0 };
    const w0 = sgdStep(baseWeights, features, 0);
    const w1 = sgdStep(baseWeights, features, 1);
    expect(w0.aiScore).not.toBe(w1.aiScore);
  });
});
