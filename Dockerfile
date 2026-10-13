# ==========================================
# Immersive Adaptive Tutor - Cloud Run Dockerfile
# Multi-stage production build on Node 22 LTS
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Compile client frontend SPA to /app/dist
RUN npm run build

# Remove development dependencies to keep the image lightweight
RUN npm prune --omit=dev

# Stage 2: Production Runtime
FROM node:22-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Copy runtime files and production node_modules from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/firebase-applet-config.json ./
COPY --from=builder /app/firebase-blueprint.json ./

# Expose default Cloud Run port
EXPOSE 8080

# Start server using Node 22 native TypeScript stripping
CMD ["node", "server.ts"]
