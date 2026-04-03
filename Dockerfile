FROM node:24-alpine AS base
WORKDIR /app

# ── Backend deps ───────────────────────────────────────────────────────────────
FROM base AS backend-deps
RUN apk add --no-cache python3 make g++
COPY backend/package.json ./
RUN npm install --omit=dev

# ── Backend build ──────────────────────────────────────────────────────────────
FROM base AS backend-build
RUN apk add --no-cache python3 make g++
COPY backend/package.json backend/tsconfig.json ./
RUN npm install
COPY backend/src ./src
RUN npm run build
RUN cp src/db/schema.sql dist/db/schema.sql

# ── Frontend build ─────────────────────────────────────────────────────────────
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Final image ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS final
WORKDIR /app

LABEL org.opencontainers.image.title="HELBACKUP"
LABEL org.opencontainers.image.description="Intelligent backup orchestrator for Unraid"
LABEL org.opencontainers.image.source="https://github.com/Kreuzbube88/helbackup"

# Runtime backend deps
COPY --from=backend-deps /app/node_modules ./node_modules
# Compiled backend
COPY --from=backend-build /app/dist ./dist
# Compiled frontend (served as static files)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Runtime dirs
RUN mkdir -p /app/config/ssh /app/data /app/logs && \
    chmod 700 /app/config/ssh

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/helbackup.db

CMD ["node", "dist/index.js"]
