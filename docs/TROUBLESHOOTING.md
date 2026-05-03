# Troubleshooting

## Purpose

Diagnosis and resolution guides for the most common issues encountered when developing, deploying, and operating CrisisConnect.

---

## Overview

Issues are grouped by area. Each entry includes: **Symptom → Cause → Fix**.

For server errors, check the structured JSON log output first — every error includes a level, message, context, and stack trace.

---

## Server Startup Issues

### Server crashes immediately on startup

**Symptom:** Process exits with code 1 right after starting.

**Cause:** Missing required environment variable.

**Fix:**
```bash
# Check which variable is missing from the startup log:
npm run dev 2>&1 | grep "ERROR\|missing\|required"

# Ensure all required variables are set:
# DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY
```

---

### `Error: Cannot find module '...'`

**Symptom:** Module not found error on startup.

**Cause:** `node_modules` is missing or out of sync.

**Fix:**
```bash
rm -rf node_modules
npm install
npm run dev
```

---

### `EADDRINUSE: address already in use :::5000`

**Symptom:** Port 5000 is already occupied.

**Fix:**
```bash
# Find and kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5001 npm run dev
```

---

### TypeScript compilation errors on startup

**Symptom:** `tsx` reports type errors before the server starts.

**Fix:**
```bash
# Run the full type check first
npm run check

# Fix all reported errors — the CI gate requires zero errors
```

---

## Database Issues

### `null value in column "X" violates not-null constraint`

**Symptom:** DB insert fails with a not-null constraint error.

**Cause:** Application code is omitting a required column.

**Fix:**
1. Identify the table and column from the error message.
2. Check `shared/schema.ts` for the column definition.
3. Ensure the service is providing the required value before inserting.

Common example: `valid_from` in `disaster_predictions` — the prediction scheduler must set this field explicitly.

---

### `relation "X" does not exist`

**Symptom:** Query fails because the table doesn't exist.

**Cause:** Database schema hasn't been applied.

**Fix:**
```bash
npm run db:push
```

---

### Connection timeout / ECONNREFUSED

**Symptom:** DB queries time out or refuse connection.

**Cause 1:** `DATABASE_URL` is wrong or the database is down.

**Fix:**
```bash
# Test the connection directly
psql $DATABASE_URL -c "SELECT 1;"
```

**Cause 2:** Neon serverless cold start (first query after idle).

**Fix:** Implement a startup warm-up query in `server/db/index.ts`, or use Neon's connection pooling.

---

### `drizzle-kit push` fails

**Symptom:** Schema push fails with migration conflict.

**Fix:**
```bash
# Force reset (DEVELOPMENT ONLY — destroys data)
npx drizzle-kit drop
npm run db:push

# For production, generate and review migration SQL:
npx drizzle-kit generate
# Review drizzle/<timestamp>.sql before applying
```

---

## Authentication Issues

### `403: Invalid or expired token`

**Symptom:** API returns 403 on authenticated endpoints.

**Cause:** JWT access token has expired (15-minute TTL).

**Fix (client-side):**
1. Call `POST /api/auth/refresh` with the refresh token cookie.
2. If refresh also fails, redirect to login.

The client's `apiRequest` helper in `client/src/lib/queryClient.ts` should handle this automatically via TanStack Query's retry logic.

---

### `403: Forbidden` with valid token

**Symptom:** Token is valid but returns 403.

**Cause:** User's role does not have the required permission for the endpoint.

**Fix:** Check the endpoint's `authorize(action)` middleware in the route file to see which RBAC action is required. Update the user's role or use a higher-privileged account.

---

### Users can't log in after server restart (development)

**Symptom:** All session cookies are invalidated after restart.

**Cause:** `SESSION_SECRET` is auto-generated on each start in development.

**Fix:** Set a fixed `SESSION_SECRET` in `.env`:
```env
SESSION_SECRET=your-fixed-dev-secret-at-least-32-chars
```

---

### WebSocket authentication failure

**Symptom:** `wss://localhost:undefined/?token=...` invalid URL error in browser console.

**Cause:** The WebSocket port environment variable is not set, causing `undefined` in the URL.

**Fix:** In `client/src/providers/WebSocketProvider.tsx`, verify the WS URL construction uses `window.location.host` instead of a hardcoded port variable:
```typescript
const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
```

---

## AI / OpenAI Issues

### AI analysis returns rule-based scores only

**Symptom:** All AI decisions show `source: "rule-based"` in the response.

**Cause:** `OPENAI_API_KEY` is not set or is invalid.

**Fix:**
```bash
# Verify the key is set
echo $OPENAI_API_KEY

# Test OpenAI connectivity directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

### `OpenAI: 429 Too Many Requests`

**Symptom:** AI analysis fails with rate limit errors.

**Cause:** OpenAI API quota exceeded.

**Fix:**
1. Check your OpenAI usage dashboard.
2. Reduce `AI_RATE_LIMIT_MAX` in `.env` to throttle incoming requests.
3. Increase your OpenAI tier if the platform is receiving high traffic.
4. The rule-based fallback activates automatically — the platform remains functional.

---

### AI copilot returns empty `steps` array

**Symptom:** `POST /api/ai/copilot` returns `{ steps: [], warnings: [], resources: [] }`.

**Cause:** The disaster type was not matched to a knowledge base protocol.

**Fix:** Add the disaster type to the knowledge base in `server/modules/ai/rag-knowledge.service.ts`. Ensure the `type` field in the request matches one of the 8 protocol IDs.

---

### `requiresHumanReview: true` for all reports

**Symptom:** Every AI decision triggers human review.

**Cause:** AI confidence is consistently below 0.70.

**Likely causes:**
- OpenAI API is returning low-quality responses (model overloaded)
- Report descriptions are very short or in an unsupported language
- The confidence threshold is too high for your data

**Fix:**
1. Check if OpenAI is operational: `https://status.openai.com`
2. Review the AI response in the `ai_overrides` table to inspect raw confidence scores.
3. Adjust `requiresHumanReview` threshold in `server/modules/ai/crisis-intelligence.service.ts` if needed.

---

## WebSocket Issues

### WebSocket connects but no real-time updates

**Symptom:** The WS connection is established but events don't appear in the UI.

**Cause 1:** Event bus subscribers are not registered.

**Fix:** Check `server/routes/index.ts` — all `eventBus.subscribe()` calls must be registered at startup.

**Cause 2:** Client handler is not subscribed correctly.

**Fix:** Verify `useRealtimeMessage` is called with the correct handler and that the component is mounted (not unmounted before the event fires).

---

### `wss://localhost:undefined` — invalid WebSocket URL

**See:** Authentication Issues → WebSocket authentication failure above.

---

### WebSocket disconnects repeatedly

**Symptom:** Exponential backoff reconnects every few seconds.

**Cause:** Server is closing the connection due to invalid JWT or rate limiting.

**Fix:**
1. Confirm the JWT is fresh (not expired).
2. Check WebSocket rate limiting in `server/middleware/wsRateLimiting.ts`.
3. Look for `[WS]` log entries in the server console showing rejection reason.

---

## Integration / External API Issues

### `503: Circuit breaker is OPEN for maps-nominatim`

**Symptom:** Geocoding returns 503 with circuit breaker message.

**Cause:** Nominatim has been failing — the circuit breaker tripped.

**Fix:**
1. Check Nominatim status: `https://nominatim.openstreetmap.org/status`
2. The circuit breaker resets after 60 seconds (configurable in `circuit-breaker.ts`).
3. In the meantime, geocoding falls back to `"lat, lng"` string format.

**Check all circuit breaker states:**
```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:5000/api/integration/status
```

---

### Weather data is stale

**Symptom:** `GET /api/integration/weather/latest` returns old data.

**Cause:** Weather is not fetched automatically — it's on-demand when `GET /api/integration/weather?lat=&lng=` is called.

**Fix:** Add a cron job in `server/modules/predictions/prediction-scheduler.ts` to refresh weather data for key regions periodically.

---

## Performance Issues

### API responses are slow (>500ms)

**Symptom:** Standard read endpoints take longer than expected.

**Cause 1:** Neon serverless cold start.

**Fix:** Add a connection warm-up query on server start, or switch to Neon's connection pooler endpoint.

**Cause 2:** Missing database index.

**Fix:**
```sql
-- Check for sequential scans on large tables
EXPLAIN ANALYZE SELECT * FROM disaster_reports WHERE type = 'flood';

-- Add index if missing
CREATE INDEX CONCURRENTLY idx_reports_type ON disaster_reports(type);
```

**Cause 3:** N+1 query pattern.

**Fix:** Use Drizzle's join API to fetch related data in a single query instead of looping.

---

### High memory usage

**Symptom:** Node.js process memory grows over time.

**Cause 1:** Chaos engineering `memory` experiment is active.

**Fix:** `POST /api/dev/chaos/stop` to stop all experiments.

**Cause 2:** In-memory cache not evicting.

**Fix:** Check LRU cache configuration in the relevant service — ensure `maxSize` is set.

---

## Frontend Issues

### Blank page after login

**Symptom:** App renders blank after successful auth.

**Cause:** React lazy-loaded component failed to import.

**Fix:**
1. Open browser dev tools → Console.
2. Look for `ChunkLoadError` or module import failures.
3. Run `npm run build` to verify the production build compiles cleanly.

---

### Map doesn't render

**Symptom:** The `/map` page shows a blank area instead of the Leaflet map.

**Cause:** Leaflet CSS not loaded, or container has zero height.

**Fix:**
1. Verify `import "leaflet/dist/leaflet.css"` is present in the map component.
2. Ensure the map container div has an explicit `height` (e.g., `h-full` with a parent that has a defined height).

---

### TanStack Query showing stale data

**Symptom:** UI shows outdated data after an update.

**Cause:** Query cache not invalidated after mutation.

**Fix:** After any mutating API call, call `queryClient.invalidateQueries({ queryKey: ["reports"] })` (or the relevant key).

---

## SOS / Dispatch Issues

### SOS dispatch assigns no responder

**Symptom:** `POST /api/sos/:id/dispatch` returns empty `responderId`.

**Cause:** No volunteers are available within the search radius.

**Fix:** The SLA escalation engine will automatically expand the radius at t+30s. To diagnose:
```sql
-- Check available volunteers near the SOS location
SELECT id, latitude, longitude, is_available
FROM users
WHERE role IN ('volunteer', 'ngo')
AND is_available = true;
```

---

### SLA escalation not firing

**Symptom:** No escalation alerts after 30/60/120 seconds.

**Cause:** Server was restarted after the SOS was created, clearing the in-process timers.

**Fix:** The prediction scheduler re-registers timers for active SOS on restart. Check that `server/workers/ai-analysis.worker.ts` is running and that `server/modules/sos/dispatch.service.ts` has the re-registration logic in the startup path.

---

## GDPR / Compliance Issues

### Data export returns empty file

**Symptom:** `GET /api/compliance/me/export` returns `{}` or minimal data.

**Cause:** The user has no reports, SOS alerts, or resource requests associated with their account.

**Fix:** Verify the `userId` join conditions in the export query in `server/routes/compliance.routes.ts`.

---

### Account deletion fails

**Symptom:** `DELETE /api/compliance/me/account` returns 400.

**Cause:** The `confirm` field in the request body does not match `"DELETE_MY_ACCOUNT"` exactly.

**Fix:** Ensure the request body is:
```json
{ "confirm": "DELETE_MY_ACCOUNT" }
```
Case-sensitive, exact match required.

---

## Error Code Reference

| HTTP Status | Code | Meaning | Common Fix |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body | Check Zod schema for the endpoint |
| 401 | `UNAUTHORIZED` | Missing JWT | Include `Authorization: Bearer <token>` header |
| 403 | `FORBIDDEN` | Insufficient role | Use an account with the required role |
| 403 | `INVALID_OR_EXPIRED_TOKEN` | JWT expired | Call `/api/auth/refresh` |
| 404 | `NOT_FOUND` | Resource missing | Verify the ID in the URL |
| 409 | `CONFLICT` | Duplicate | Email already registered, duplicate key |
| 429 | `RATE_LIMITED` | Too many requests | Wait and retry, or raise rate limits in `.env` |
| 500 | `INTERNAL_ERROR` | Server error | Check server logs for stack trace |
| 503 | `CIRCUIT_OPEN` | External API down | Check `/api/integration/status` |

---

## Getting More Help

1. **Server logs:** `server/utils/logger.ts` emits structured JSON — filter by `level: "error"`.
2. **Detailed health:** `GET /api/health/detailed` — shows DB, memory, and circuit breaker status.
3. **Prometheus metrics:** `GET /api/metrics` — error rates, response times, request counts.
4. **Monitoring alerts:** `GET /api/monitoring/alerts` — threshold-based alert list.

---

## Related Docs

- [CONFIGURATION.md](CONFIGURATION.md) — environment variable reference
- [DEPLOYMENT.md](DEPLOYMENT.md) — deployment-specific issues
- [ARCHITECTURE.md](ARCHITECTURE.md) — understanding component interactions
- [API_REFERENCE.md](API_REFERENCE.md) — endpoint specifications and error codes
