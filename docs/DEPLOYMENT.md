# Deployment

## Purpose

Step-by-step guides for running CrisisConnect in development, Docker, and production environments. Covers prerequisites, environment setup, health verification, and rollback procedures.

---

## Overview

CrisisConnect ships as a single Node.js process that serves both the compiled React frontend (as static files) and the Express API. The production build outputs to `dist/` and is started with `node dist/index.js`.

---

## Deployment Targets

| Target | Command | Use Case |
|---|---|---|
| Development | `npm run dev` | Local development with HMR |
| Docker (single container) | `docker-compose up` | Local integration testing |
| Docker (production) | `docker build + run` | Staging / small production |
| Kubernetes | `k8s/` manifests | Large-scale production |
| Replit | Native workflow | Platform-hosted |

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (local or [Neon](https://neon.tech) serverless URL)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Required: DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY

# 3. Apply database schema
npm run db:push

# 4. Seed demo data (optional)
npm run db:seed-demo

# 5. Start dev server (hot reload)
npm run dev
```

Server starts at `http://localhost:5000`.

The Vite dev server proxies `/api/*` to Express — you do not need to run two processes.

---

## Production Build

```bash
# Build frontend (Vite) + bundle server (esbuild)
npm run build

# Output:
# dist/public/     → compiled React app (static files)
# dist/index.js    → bundled Express server (ESM)

# Start production server
NODE_ENV=production npm start
```

---

## Docker Deployment

### Build and Run (Single Container)

```bash
# Build image
docker build -t crisisconnect:latest .

# Run container
docker run -d \
  --name crisisconnect \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e SESSION_SECRET="your-secret-here" \
  -e ENCRYPTION_KEY="your-hex-key-here" \
  -e NODE_ENV=production \
  crisisconnect:latest
```

### Docker Compose (with PostgreSQL)

```bash
# Copy and configure environment
cp .env.example .env

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Stop
docker-compose down
```

`docker-compose.yml` starts:
- `app` — CrisisConnect (port 5000)
- `db` — PostgreSQL 15 (port 5432)
- `nginx` — Reverse proxy with SSL termination (port 443)

---

## Kubernetes Deployment

Manifests are in `k8s/`. Apply in order:

```bash
# 1. Create namespace
kubectl create namespace crisisconnect

# 2. Create secrets
kubectl create secret generic crisisconnect-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=SESSION_SECRET="..." \
  --from-literal=ENCRYPTION_KEY="..." \
  -n crisisconnect

# 3. Apply manifests
kubectl apply -f k8s/ -n crisisconnect

# 4. Check rollout
kubectl rollout status deployment/crisisconnect -n crisisconnect

# 5. Get service URL
kubectl get service crisisconnect -n crisisconnect
```

### Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment crisisconnect --replicas=3 -n crisisconnect
```

**Multi-pod requirements:**
- Set `REDIS_URL` for WebSocket pub/sub fan-out across pods
- Use an external PostgreSQL with a connection pooler (PgBouncer)

---

## Environment Configuration for Production

See [CONFIGURATION.md](CONFIGURATION.md) for the full variable reference.

**Minimum production `.env`:**

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/crisisconnect
SESSION_SECRET=<64-char random hex>
ENCRYPTION_KEY=<32-char random hex>
CORS_ORIGIN=https://yourdomain.com
COOKIE_SECURE=true
```

**Recommended production additions:**

```env
OPENAI_API_KEY=sk-...
REDIS_URL=redis://your-redis:6379
LOG_LEVEL=warn
ENABLE_SWAGGER=false
ENABLE_CHAOS_ENDPOINTS=false
```

---

## Database Migrations

### Apply Schema (Development / Staging)

```bash
npm run db:push
```

This applies schema changes directly to the database using Drizzle Kit introspection. Safe for development and staging.

### Production Migration

For production, generate and review migration SQL before applying:

```bash
# Generate migration files
npx drizzle-kit generate

# Review generated SQL in drizzle/ folder
cat drizzle/<timestamp>_migration.sql

# Apply (with a transaction)
psql $DATABASE_URL -f drizzle/<timestamp>_migration.sql
```

Always back up the database before applying production migrations.

---

## Health Checks

### Liveness Probe

```
GET /api/health
```

Returns `200 { "status": "ok" }` when the server is running.

### Readiness Probe

```
GET /api/health/detailed
```

Returns `200` when DB is reachable and all critical services are up. Returns `503` in degraded state.

### Kubernetes probe configuration (in `k8s/deployment.yaml`):

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/health/detailed
    port: 5000
  initialDelaySeconds: 15
  periodSeconds: 10
```

---

## Nginx Configuration

`nginx.conf` is included for SSL termination and static file serving. Key sections:

```nginx
# Serve static React app
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}

# Proxy API requests
location /api/ {
    proxy_pass http://app:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Proxy WebSocket
location /ws {
    proxy_pass http://app:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

---

## CI/CD Overview

A typical pipeline:

```
┌─────────────────────────────────────────────────────┐
│ 1. Lint & Type Check    npm run check               │
│ 2. Unit Tests           npm run test:unit           │
│ 3. Integration Tests    npm run test:integration    │
│ 4. Build                npm run build               │
│ 5. Docker Build         docker build -t ...         │
│ 6. Push Image           docker push ...             │
│ 7. Deploy Staging       kubectl apply ...           │
│ 8. Smoke Tests          curl /api/health            │
│ 9. Deploy Production    kubectl rollout ...         │
└─────────────────────────────────────────────────────┘
```

---

## Rollback Procedures

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/crisisconnect -n crisisconnect

# Roll back to previous version
kubectl rollout undo deployment/crisisconnect -n crisisconnect

# Roll back to specific revision
kubectl rollout undo deployment/crisisconnect --to-revision=3 -n crisisconnect
```

### Database Rollback

Drizzle does not auto-generate down-migrations. Before any production migration:

1. Take a full database backup: `pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql`
2. Test the migration on a staging database first.
3. Restore from backup if the migration causes issues: `psql $DATABASE_URL < backup_<date>.sql`

---

## Monitoring After Deployment

After deployment, verify:

```bash
# 1. Health check
curl https://yourdomain.com/api/health

# 2. Detailed health (admin JWT required)
curl -H "Authorization: Bearer <token>" https://yourdomain.com/api/health/detailed

# 3. Prometheus metrics
curl -H "Authorization: Bearer <token>" https://yourdomain.com/api/metrics

# 4. Check circuit breakers
curl -H "Authorization: Bearer <token>" https://yourdomain.com/api/integration/status
```

---

## Performance Baseline

Expected response times on a standard 2-core 2GB RAM server:

| Endpoint | p50 | p95 |
|---|---|---|
| `GET /api/health` | < 5ms | < 10ms |
| `GET /api/reports` | < 50ms | < 120ms |
| `POST /api/reports` (with AI) | < 800ms | < 2000ms |
| `GET /api/geo/risk-map` | < 30ms | < 80ms |
| `POST /api/ai/copilot` | < 2000ms | < 5000ms |

AI endpoints are dependent on OpenAI API latency.

---

## Related Docs

- [CONFIGURATION.md](CONFIGURATION.md) — all environment variables
- [ARCHITECTURE.md](ARCHITECTURE.md) — understanding the system topology
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — deployment issues
