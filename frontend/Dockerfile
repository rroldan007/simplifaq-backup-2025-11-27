# Multi-stage Dockerfile for SimpliFaq Frontend

# ===== Base Stage =====
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl dumb-init

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

# Copy source code
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build arguments for environment variables
ARG VITE_API_URL=https://my.simplifaq.ch/api
ARG VITE_APP_NAME="SimpliFaq"
ARG VITE_APP_VERSION=1.0.0
ARG VITE_SENTRY_DSN=""

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Build the application
RUN npm run build

# ===== Production Stage with Nginx =====
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy SSL configuration template (will be mounted in production)
RUN mkdir -p /etc/nginx/ssl

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Create health check endpoint
RUN echo '<!DOCTYPE html><html><head><title>Health Check</title></head><body><h1>OK</h1></body></html>' > /usr/share/nginx/html/health

# Switch to non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ===== Development Stage =====
FROM dev-deps AS development

# Copy source code
COPY . .

# Switch to non-root user
USER simplifaq

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]