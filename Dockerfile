# ==========================================
# Immersive Adaptive Tutor - Cloud Run Dockerfile
# Multi-stage production build on Node 22 LTS
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:22-slim AS builder

WORKDIR /app

# Disable strict engine checks to prevent EBADENGINE warnings/failures
ENV NPM_CONFIG_ENGINE_STRICT=false

# Install build dependencies safely (npm install avoids lockfile sync failures)
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit

# Copy project files
COPY . .

# Compile client frontend SPA to /app/dist and server to /app/dist/server.js
RUN npm run build
RUN npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/server.js

# Remove development dependencies to keep the image lightweight
RUN npm prune --omit=dev --legacy-peer-deps

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

# Start production server using compiled JS bundle
CMD ["node", "dist/server.js"]
