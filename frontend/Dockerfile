# Multi-stage build for CI/CD Pipeline Health Dashboard Frontend

# Build arguments
ARG NODE_ENV=production
ARG BUILD_TYPE=production

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Install dependencies based on build type
RUN if [ "$BUILD_TYPE" = "development" ]; then \
        npm install; \
    else \
        npm install --omit=dev; \
    fi

# Copy frontend source code
COPY src ./src
COPY public ./public

# Build frontend for production
RUN if [ "$BUILD_TYPE" = "production" ]; then \
        npm run build; \
    fi

# Stage 2: Runtime
FROM node:18-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies based on build type
RUN if [ "$BUILD_TYPE" = "development" ]; then \
        npm install; \
    else \
        npm install --omit=dev; \
    fi

# Copy source code for development
COPY src ./src
COPY public ./public

# Create cache directory with proper permissions
RUN mkdir -p /app/node_modules/.cache && \
    chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start command based on build type
CMD if [ "$BUILD_TYPE" = "development" ]; then \
        npm start; \
    else \
        npx serve -s build -l 3000; \
    fi
