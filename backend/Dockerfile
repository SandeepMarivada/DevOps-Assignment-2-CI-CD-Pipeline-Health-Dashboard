# Multi-stage build for CI/CD Pipeline Health Dashboard Backend

# Build arguments
ARG NODE_ENV=production
ARG BUILD_TYPE=production

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install dependencies based on build type
RUN if [ "$BUILD_TYPE" = "development" ]; then \
        npm install; \
    else \
        npm install --omit=dev; \
    fi

# For development, also install dev dependencies
RUN if [ "$BUILD_TYPE" = "development" ]; then \
        npm install --only=dev; \
    fi

# Copy backend source code
COPY src ./src

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy backend from backend-builder
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/package*.json ./

# For development, ensure dev dependencies are available
RUN if [ "$BUILD_TYPE" = "development" ]; then \
        npm install --only=dev; \
    fi



# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application based on build type
CMD if [ "$BUILD_TYPE" = "development" ]; then \
        npm run dev; \
    else \
        node src/server.js; \
    fi
