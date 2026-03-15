# ============================================
# Stage 1: Build Dependencies
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY proto ./proto

# Build the application
RUN npm run build

# Prune devDependencies for production
RUN npm prune --production

# ============================================
# Stage 2: Production Image
# ============================================
FROM node:22-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy proto files for gRPC
COPY --from=builder --chown=nodejs:nodejs /app/proto ./proto

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV GRPC_PORT=5001

# Expose ports
EXPOSE 3001 5001

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/public/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]