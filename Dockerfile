# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# Install all deps (including dev) needed to compile TypeScript + build Vite
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Builder
# Compile backend (esbuild) + bundle frontend (Vite)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production runtime
# Minimal image — only the compiled output + production node_modules
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 crisis

COPY --from=deps    /app/node_modules  ./node_modules
COPY --from=builder /app/dist          ./dist
COPY --from=builder /app/package.json  ./package.json

# Drizzle migrations need the shared schema at runtime
COPY --from=builder /app/shared        ./shared

USER crisis

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
