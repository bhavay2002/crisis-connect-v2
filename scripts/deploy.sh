#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CrisisConnect Deployment Script
#
# Usage:
#   ./scripts/deploy.sh staging   # deploy to staging
#   ./scripts/deploy.sh prod      # deploy to production (requires confirmation)
#   ./scripts/deploy.sh rollback  # roll back all deployments by 1 revision
#
# Prerequisites:
#   - kubectl configured and pointing at the right cluster
#   - REGISTRY_TOKEN env var set (for image push)
#   - Docker BuildKit enabled (DOCKER_BUILDKIT=1)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REGISTRY="ghcr.io"
ORG="${GITHUB_REPOSITORY_OWNER:-your-org}"
IMAGE_API="${REGISTRY}/${ORG}/crisisconnect-api"
IMAGE_FRONTEND="${REGISTRY}/${ORG}/crisisconnect-frontend"
NAMESPACE="crisisconnect"
GIT_SHA="$(git rev-parse --short HEAD)"
IMAGE_TAG="sha-${GIT_SHA}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]  ${NC} $*"; }
err()  { echo -e "${RED}[error] ${NC} $*" >&2; exit 1; }

require_tool() { command -v "$1" &>/dev/null || err "'$1' not found in PATH"; }
require_tool kubectl
require_tool docker
require_tool curl

ENV="${1:-}"

# ── Rollback ──────────────────────────────────────────────────────────────────
if [[ "$ENV" == "rollback" ]]; then
  warn "Rolling back all deployments to previous revision..."
  kubectl rollout undo deployment/api      -n "$NAMESPACE"
  kubectl rollout undo deployment/frontend -n "$NAMESPACE"
  kubectl rollout undo deployment/worker   -n "$NAMESPACE"
  kubectl rollout status deployment/api    -n "$NAMESPACE" --timeout=5m
  log "Rollback complete."
  exit 0
fi

[[ "$ENV" == "staging" || "$ENV" == "prod" ]] || \
  err "Usage: $0 <staging|prod|rollback>"

# Production gate
if [[ "$ENV" == "prod" ]]; then
  warn "You are deploying to PRODUCTION (sha: ${GIT_SHA})"
  read -rp "Type 'yes' to confirm: " CONFIRM
  [[ "$CONFIRM" == "yes" ]] || err "Deployment cancelled."
fi

# ── Build ─────────────────────────────────────────────────────────────────────
log "Building images (${IMAGE_TAG})..."

DOCKER_BUILDKIT=1 docker build \
  --target runner \
  -t "${IMAGE_API}:${IMAGE_TAG}" \
  -t "${IMAGE_API}:${ENV}" \
  -f Dockerfile .

DOCKER_BUILDKIT=1 docker build \
  -t "${IMAGE_FRONTEND}:${IMAGE_TAG}" \
  -t "${IMAGE_FRONTEND}:${ENV}" \
  -f client/Dockerfile .

# ── Push ──────────────────────────────────────────────────────────────────────
log "Pushing images..."
echo "${REGISTRY_TOKEN:-}" | docker login "${REGISTRY}" -u "${ORG}" --password-stdin

docker push "${IMAGE_API}:${IMAGE_TAG}"
docker push "${IMAGE_API}:${ENV}"
docker push "${IMAGE_FRONTEND}:${IMAGE_TAG}"
docker push "${IMAGE_FRONTEND}:${ENV}"

# ── Deploy ────────────────────────────────────────────────────────────────────
log "Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/postgres/statefulset.yaml
kubectl apply -f k8s/api/
kubectl apply -f k8s/worker/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress.yaml

log "Updating image tags..."
kubectl set image deployment/api      api="${IMAGE_API}:${IMAGE_TAG}"      -n "$NAMESPACE"
kubectl set image deployment/frontend frontend="${IMAGE_FRONTEND}:${IMAGE_TAG}" -n "$NAMESPACE"
kubectl set image deployment/worker   worker="${IMAGE_API}:${IMAGE_TAG}"   -n "$NAMESPACE"

# ── Wait ──────────────────────────────────────────────────────────────────────
log "Waiting for rollout..."
kubectl rollout status deployment/api      -n "$NAMESPACE" --timeout=10m
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=10m
kubectl rollout status deployment/worker   -n "$NAMESPACE" --timeout=10m

# ── Smoke test ────────────────────────────────────────────────────────────────
HEALTH_URL="https://api.crisisconnect.example.com/api/health"
[[ "$ENV" == "staging" ]] && HEALTH_URL="https://staging-api.crisisconnect.example.com/api/health"

log "Smoke testing ${HEALTH_URL}..."
sleep 10

HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || echo "000")
if [[ "$HTTP_STATUS" != "200" ]]; then
  err "Smoke test FAILED (HTTP ${HTTP_STATUS}) — rolling back"
  kubectl rollout undo deployment/api      -n "$NAMESPACE"
  kubectl rollout undo deployment/frontend -n "$NAMESPACE"
  kubectl rollout undo deployment/worker   -n "$NAMESPACE"
  exit 1
fi

log "✓ Deploy complete — ${ENV} (${IMAGE_TAG}) — HTTP ${HTTP_STATUS}"

# Tag release
git tag -a "deploy-${ENV}-${GIT_SHA}" -m "Deployed to ${ENV} at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push origin --tags 2>/dev/null || warn "Could not push git tag (non-fatal)"
