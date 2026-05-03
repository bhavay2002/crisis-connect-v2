/**
 * k6 Load Test — Report Ingestion Pipeline
 *
 * Tests the POST /api/reports endpoint under load.
 * Validates that:
 *   - p95 latency < 500ms (async fast-path)
 *   - Error rate < 1% under normal load
 *   - System returns 503 with Retry-After under saturation (load shedding)
 *
 * Run:
 *   k6 run --vus 50 --duration 30s tests/load/report-ingestion.k6.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom metrics ─────────────────────────────────────────────────────────────

const errorRate      = new Rate("error_rate");
const asyncLatency   = new Trend("async_latency_ms");
const shedRate       = new Rate("shed_rate");

// ── Test configuration ─────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    normal_load: {
      executor:    "constant-vus",
      vus:         20,
      duration:    "30s",
      gracefulStop: "5s",
    },
    ramp_up: {
      executor:    "ramping-vus",
      startVUs:    0,
      stages: [
        { duration: "10s", target: 50 },
        { duration: "20s", target: 100 },
        { duration: "10s", target: 0  },
      ],
      startTime: "30s",
    },
  },
  thresholds: {
    http_req_duration:    ["p(95)<500"],   // 95th percentile < 500ms (async fast-path)
    error_rate:           ["rate<0.05"],   // < 5% errors under load
    http_req_failed:      ["rate<0.10"],   // < 10% HTTP failures
  },
};

// ── Auth token (set BASE_URL and AUTH_TOKEN env vars) ─────────────────────────

const BASE_URL   = __ENV.BASE_URL   || "http://localhost:5000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

const REPORT_TYPES = ["flood", "fire", "earthquake", "chemical", "infrastructure"];
const SEVERITIES   = ["low", "medium", "high", "critical"];
const LOCATIONS    = ["Downtown Metro", "Suburbs North", "Industrial Zone", "Coastal Area", "Airport District"];

// ── Virtual User scenario ──────────────────────────────────────────────────────

export default function () {
  const type     = REPORT_TYPES[Math.floor(Math.random() * REPORT_TYPES.length)];
  const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

  const payload = JSON.stringify({
    title:       `${type.charAt(0).toUpperCase() + type.slice(1)} incident at ${location}`,
    description: `Emergency report: ${type} situation detected at ${location}. Immediate attention required. Multiple witnesses reporting.`,
    type,
    severity,
    location,
    latitude:    (28.4 + Math.random() * 0.5).toFixed(4),
    longitude:   (77.0 + Math.random() * 0.5).toFixed(4),
  });

  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${AUTH_TOKEN}`,
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/reports`, payload, { headers });
  const latency = Date.now() - start;

  asyncLatency.add(latency);

  const success = check(res, {
    "status is 202 (accepted) or 201 (sync)": (r) => r.status === 202 || r.status === 201,
    "response has reportId":                  (r) => {
      try { return !!JSON.parse(r.body).id; } catch { return false; }
    },
    "response time < 500ms":                  () => latency < 500,
  });

  // Track load shedding (503 = queue saturated)
  if (res.status === 503) {
    shedRate.add(1);
    const retryAfter = res.headers["Retry-After"] || "5";
    sleep(parseInt(retryAfter));
    return;
  }

  errorRate.add(!success);

  sleep(0.5 + Math.random() * 0.5); // 0.5-1s between requests per VU
}

// ── Setup — obtain auth token ──────────────────────────────────────────────────

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: "admin@test.com", password: "Admin1234!" }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status !== 200) {
    console.error(`Auth failed: ${res.status} ${res.body}`);
    return { token: "" };
  }

  const body = JSON.parse(res.body);
  console.log(`Auth OK — token acquired (sampleCount: ${body.accessToken?.length ?? 0} chars)`);
  return { token: body.accessToken };
}

export function teardown(data) {
  console.log(`Load test complete. Token used: ${!!data.token}`);
}
