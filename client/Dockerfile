# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build React app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY . .

# VITE_API_URL is injected at build time; override via --build-arg
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=production

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Serve with nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

RUN addgroup --system --gid 1001 nginx-app && \
    adduser  --system --uid 1001 --ingroup nginx-app nginx-app && \
    chown -R nginx-app:nginx-app /var/cache/nginx /var/log/nginx && \
    touch /tmp/nginx.pid && chown nginx-app:nginx-app /tmp/nginx.pid

COPY --from=builder /app/dist/public  /usr/share/nginx/html
COPY nginx.conf                       /etc/nginx/nginx.conf

USER nginx-app

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
