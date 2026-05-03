# Configuration

## Purpose

Complete reference for all environment variables, secrets, and runtime configuration options in CrisisConnect. Covers required variables, optional integrations, security handling, and environment-specific defaults.

---

## Overview

Configuration is centralized in `server/config/index.ts`. At startup the server validates all required variables and logs a clear error if any are missing in production. Optional variables enable additional features (AI, object storage, SMS) without breaking core functionality.

---

## Environment Files

```
.env              # Local development (never commit)
.env.example      # Template with all variables and descriptions
.env.test         # Test environment overrides
```

Copy `.env.example` to `.env` before first run:

```bash
cp .env.example .env
```

---

## Required Variables

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | PostgreSQL connection string (Neon or standard) |
| `SESSION_SECRET` | `randomly-generated-64-char-hex` | Express session signing key — must be 32+ chars |
| `ENCRYPTION_KEY` | `a1b2c3d4e5f6...` (32 hex chars) | AES-GCM key for chat message encryption |

**Generating secure values:**

```bash
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Behavior when missing:**
- `DATABASE_URL`: server will not start — crashes immediately.
- `SESSION_SECRET`: in development, auto-generates a key (logged as warning). In production, crashes.
- `ENCRYPTION_KEY`: in development, loads from `.dev-encryption-key` file or auto-generates. In production, crashes.

---

## Application Settings

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `5000` | HTTP server port |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `CORS_ORIGIN` | `*` (dev) / required (prod) | Allowed CORS origin(s) |

---

## AI Integration (Optional)

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | OpenAI API key for GPT-4o-mini |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name override |

**When not set:** The AI layer falls back to rule-based scoring. Core platform functionality is unaffected. Affected features: copilot guidance quality, multimodal image analysis, fake report reasoning.

---

## Object Storage (Optional)

| Variable | Default | Description |
|---|---|---|
| `OBJECT_STORAGE_BUCKET` | — | S3-compatible bucket name |
| `OBJECT_STORAGE_ENDPOINT` | — | S3 endpoint URL |
| `OBJECT_STORAGE_ACCESS_KEY` | — | Access key ID |
| `OBJECT_STORAGE_SECRET_KEY` | — | Secret access key |

**When not set:** Media upload endpoints return 503. Report submission still works without media.

---

## SMS / Twilio (Optional)

| Variable | Default | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | — | Sender phone number |

**When not set:** SMS webhook endpoint accepts requests but does not send reply SMS. The `/api/sms/simulate` dev endpoint still functions.

---

## Redis / Pub-Sub (Optional)

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | — | Redis connection URL (e.g. `redis://localhost:6379`) |

**When not set:** Platform uses in-memory pub/sub (single-process). Adequate for single-pod deployments. Required for horizontal scaling.

---

## Rate Limiting

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Global rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP (global) |
| `AUTH_RATE_LIMIT_MAX` | `10` | Max auth requests per window |
| `REPORT_RATE_LIMIT_MAX` | `5` | Max report submissions per window |
| `AI_RATE_LIMIT_MAX` | `20` | Max AI requests per window |

---

## JWT Configuration

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | Falls back to `SESSION_SECRET` | JWT signing secret |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token TTL |

---

## Database Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Full connection string including credentials |
| `DATABASE_POOL_SIZE` | `10` | Connection pool size (if using pooler) |

**Migrations:**

```bash
# Apply schema changes to the database
npm run db:push

# Generate migration files (Drizzle Kit)
npx drizzle-kit generate
```

---

## Security Settings

| Variable | Default | Description |
|---|---|---|
| `COOKIE_SECURE` | `false` (dev) / `true` (prod) | Set Secure flag on cookies — requires HTTPS |
| `COOKIE_SAME_SITE` | `strict` | SameSite policy for CSRF protection |
| `HELMET_CSP_ENABLED` | `true` | Enable Content-Security-Policy header |
| `TRUST_PROXY` | `true` | Enable `app.set("trust proxy")` for rate limiting behind proxies |

---

## Feature Flags

| Variable | Default | Description |
|---|---|---|
| `ENABLE_CHAOS_ENDPOINTS` | `false` (auto-on in dev) | Enable `/api/dev/chaos/*` endpoints |
| `ENABLE_SWAGGER` | `true` (dev) | Serve Swagger UI at `/api-docs` |
| `ENABLE_METRICS` | `true` | Expose `/api/metrics` Prometheus endpoint |
| `ENABLE_DETAILED_ERRORS` | `true` (dev) | Include stack traces in error responses |

---

## Environment-Specific Behavior

| Feature | Development | Production |
|---|---|---|
| Error stack traces | Included in responses | Suppressed |
| Chaos endpoints | Enabled | Disabled |
| Swagger UI | Enabled | Disabled |
| HTTPS cookies | Not enforced | Enforced |
| Encryption key | Auto-generated | Must be set |
| Prediction scheduler | Runs every 10 min | Runs every 10 min |
| Seeding | `npm run db:seed-demo` available | Use `npm run db:seed-demo` once |

---

## Secret Management Best Practices

1. **Never commit `.env`** — it is in `.gitignore`.
2. **Rotate secrets regularly** — especially `SESSION_SECRET` and `ENCRYPTION_KEY` after any suspected breach.
3. **Use a secrets manager in production** — AWS Secrets Manager, HashiCorp Vault, or your platform's native secret store.
4. **Separate secrets per environment** — dev, staging, and production should each have unique credentials.
5. **Fail fast in production** — the server crashes on missing required variables rather than running degraded.

---

## Verifying Configuration

On startup, the server logs a configuration summary:

```
📋 Application Configuration:
  Environment: production
  Port: 5000
  Database: ✅ Configured
  OpenAI: ✅ Configured
  Object Storage: ⚠️ Disabled
  Session Secret: ✅ Custom
```

Check this output in the server console after each deployment.

---

## Related Docs

- [DEPLOYMENT.md](DEPLOYMENT.md) — how configuration is applied in different environments
- [ARCHITECTURE.md](ARCHITECTURE.md) — where configuration is consumed in the stack
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — common configuration mistakes
