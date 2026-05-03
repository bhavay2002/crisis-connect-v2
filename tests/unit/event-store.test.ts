/**
 * §26 — Durable Event Store unit tests
 *
 * Tests the event envelope, idempotency, consumer-group ack tracking,
 * replay filtering, and stats aggregation — all against a real DB
 * (Neon PostgreSQL is available in CI via DATABASE_URL).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eventStore, EVENT_TYPES } from "../../server/modules/events/event-store.service";
import { db } from "../../server/db/db";
import { domainEvents } from "@shared/schema";
import { eq, like } from "drizzle-orm";
import { randomUUID } from "crypto";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_PREFIX = `test-${randomUUID().slice(0, 8)}`;
const TEST_TYPE   = "test.unit.event";

async function cleanup() {
  await db.delete(domainEvents).where(like(domainEvents.eventType, "test.%"));
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("EventStoreService", () => {
  beforeAll(cleanup);
  afterAll(cleanup);

  // ── append ──────────────────────────────────────────────────────────────────

  it("appends an event and returns a valid envelope", async () => {
    const envelope = await eventStore.append({
      eventType:  TEST_TYPE,
      entityId:   `${TEST_PREFIX}-report-1`,
      entityType: "report",
      payload:    { foo: "bar", count: 42 },
    });

    expect(envelope.id).toBeTypeOf("string");
    expect(envelope.eventId).toBeTypeOf("string");
    expect(envelope.eventType).toBe(TEST_TYPE);
    expect(envelope.entityId).toBe(`${TEST_PREFIX}-report-1`);
    expect(envelope.entityType).toBe("report");
    expect(envelope.payload).toMatchObject({ foo: "bar", count: 42 });
    expect(envelope.version).toBe(1);
    expect(envelope.ts).toBeGreaterThan(0);
    expect(envelope.processedBy).toEqual([]);
  });

  it("stores the event in the database", async () => {
    const key = `idem-${randomUUID()}`;
    await eventStore.append({
      eventType:       TEST_TYPE,
      entityId:        `${TEST_PREFIX}-check`,
      payload:         { verified: true },
      idempotencyKey:  key,
    });

    const [row] = await db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.eventId, key))
      .limit(1);

    expect(row).toBeDefined();
    expect((row.payload as any).verified).toBe(true);
  });

  // ── idempotency ──────────────────────────────────────────────────────────────

  it("is idempotent — duplicate eventId returns the same record", async () => {
    const key = `idem-dedup-${randomUUID()}`;

    const first = await eventStore.append({
      eventType:       TEST_TYPE,
      entityId:        `${TEST_PREFIX}-dedup`,
      payload:         { attempt: 1 },
      idempotencyKey:  key,
    });

    const second = await eventStore.append({
      eventType:       TEST_TYPE,
      entityId:        `${TEST_PREFIX}-dedup`,
      payload:         { attempt: 2 }, // different payload — should be ignored
      idempotencyKey:  key,
    });

    // Both calls must return the same DB record (same id)
    expect(first.id).toBe(second.id);
    expect((second.payload as any).attempt).toBe(1); // original payload preserved
  });

  // ── consumer-group ack ────────────────────────────────────────────────────────

  it("marks an event as processed by a consumer", async () => {
    const env = await eventStore.append({
      eventType: TEST_TYPE,
      entityId:  `${TEST_PREFIX}-ack`,
      payload:   { stage: "ack-test" },
    });

    await eventStore.markProcessed(env.eventId, "consumer-A");

    const [row] = await db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.id, env.id))
      .limit(1);

    expect(row.processedBy).toContain("consumer-A");
  });

  it("accumulates multiple consumer acks on the same event", async () => {
    const env = await eventStore.append({
      eventType: TEST_TYPE,
      entityId:  `${TEST_PREFIX}-multi-ack`,
      payload:   { stage: "multi-ack" },
    });

    await eventStore.markProcessed(env.eventId, "consumer-X");
    await eventStore.markProcessed(env.eventId, "consumer-Y");

    const [row] = await db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.id, env.id))
      .limit(1);

    expect(row.processedBy).toContain("consumer-X");
    expect(row.processedBy).toContain("consumer-Y");
  });

  // ── replay ───────────────────────────────────────────────────────────────────

  it("replays events filtered by eventType", async () => {
    const uniqueType = `test.replay.${randomUUID().slice(0, 8)}`;
    await eventStore.append({ eventType: uniqueType, payload: { seq: 1 } });
    await eventStore.append({ eventType: uniqueType, payload: { seq: 2 } });
    await eventStore.append({ eventType: TEST_TYPE,  payload: { seq: 3 } });

    const replayed = await eventStore.replay({ eventType: uniqueType });

    expect(replayed.length).toBe(2);
    expect(replayed.every(e => e.eventType === uniqueType)).toBe(true);
  });

  it("replays events filtered by entityId", async () => {
    const entityId = `${TEST_PREFIX}-entity-filter-${randomUUID().slice(0, 6)}`;
    await eventStore.append({ eventType: TEST_TYPE, entityId, payload: { n: 1 } });
    await eventStore.append({ eventType: TEST_TYPE, entityId, payload: { n: 2 } });
    await eventStore.append({ eventType: TEST_TYPE, entityId: "other", payload: { n: 3 } });

    const replayed = await eventStore.replay({ entityId });

    expect(replayed.length).toBeGreaterThanOrEqual(2);
    expect(replayed.every(e => e.entityId === entityId)).toBe(true);
  });

  it("replays only unprocessed events for a given consumerId", async () => {
    const uniqueType = `test.consumer.${randomUUID().slice(0, 8)}`;

    const ev1 = await eventStore.append({ eventType: uniqueType, payload: { n: 1 } });
    const ev2 = await eventStore.append({ eventType: uniqueType, payload: { n: 2 } });

    // Consumer-Z processes ev1 but not ev2
    await eventStore.markProcessed(ev1.eventId, "consumer-Z");

    const unprocessed = await eventStore.replay({
      eventType:  uniqueType,
      consumerId: "consumer-Z",
    });

    // Only ev2 should be returned
    const ids = unprocessed.map(e => e.id);
    expect(ids).not.toContain(ev1.id);
    expect(ids).toContain(ev2.id);
  });

  it("replays events after a given timestamp", async () => {
    const uniqueType = `test.since.${randomUUID().slice(0, 8)}`;
    const before = new Date();

    // Small delay to ensure timestamps differ
    await new Promise(r => setTimeout(r, 50));
    await eventStore.append({ eventType: uniqueType, payload: { after: true } });

    const replayed = await eventStore.replay({
      eventType: uniqueType,
      since:     before,
    });

    expect(replayed.length).toBeGreaterThanOrEqual(1);
    expect(replayed.every(e => e.ts > before.getTime())).toBe(true);
  });

  // ── getRecent ─────────────────────────────────────────────────────────────────

  it("getRecent returns events in reverse-chronological order", async () => {
    const events = await eventStore.getRecent(5);
    expect(Array.isArray(events)).toBe(true);

    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].ts).toBeGreaterThanOrEqual(events[i].ts);
    }
  });

  // ── getStats ─────────────────────────────────────────────────────────────────

  it("getStats returns total and byType breakdown", async () => {
    const stats = await eventStore.getStats();

    expect(stats.total).toBeGreaterThan(0);
    expect(typeof stats.byType).toBe("object");
    expect(typeof stats.appendCount).toBe("number");
    expect(typeof stats.replayCount).toBe("number");
  });

  // ── EVENT_TYPES catalogue ─────────────────────────────────────────────────────

  it("EVENT_TYPES catalogue covers all key flows", () => {
    const types = Object.values(EVENT_TYPES);
    expect(types).toContain("report.created");
    expect(types).toContain("decision.created");
    expect(types).toContain("decision.executed");
    expect(types).toContain("outcome.recorded");
    expect(types).toContain("prediction.generated");
    expect(types).toContain("prediction.actioned");
    expect(types).toContain("signal.spike_detected");
  });

  // ── version field ─────────────────────────────────────────────────────────────

  it("stores the version field for schema migration support", async () => {
    const env = await eventStore.append({
      eventType: TEST_TYPE,
      payload:   { versioned: true },
      version:   2,
    });

    expect(env.version).toBe(2);
  });
});
