# Multi-stage Dockerfile for SimpliFaq Backend

# ===== Base Stage =====
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies for Swiss QR Bill generation and canvas compilation
RUN apk add --no-cache \
    curl \
    dumb-init \
    fontconfig \
    ttf-liberation \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S simplifaq -u 1001

# ===== Dependencies Stage =====
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ===== Development Dependencies Stage =====
FROM base AS dev-deps
COPY package*.json ./
RUN npm ci

# ===== Build Stage =====
FROM dev-deps AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ===== Production Stage =====
FROM base AS production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

# Generate Prisma client in production
RUN npx prisma generate

# Copy Swiss fonts for QR Bill generation
COPY --from=base /usr/share/fonts/liberation/LiberationSans-Regular.ttf /app/fonts/

# Create necessary directories
RUN mkdir -p /var/log/simplifaq /app/uploads /tmp/pdfs && \
    chown -R simplifaq:nodejs /var/log/simplifaq /app/uploads /tmp/pdfs /app

# Switch to non-root user
USER simplifaq

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ===== Development Stage =====
FROM dev-deps AS development

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create directories
RUN mkdir -p /var/log/simplifaq /app/uploads /tmp/pdfs

# Switch to non-root user
USER simplifaq

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]