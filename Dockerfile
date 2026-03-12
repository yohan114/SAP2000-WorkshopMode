# syntax=docker/dockerfile:1

# Stage 1: Install dependencies and build the app
FROM oven/bun:1 as builder
WORKDIR /app

# Copy package management files
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Build the Next.js application
# Next.js standalone output is enabled in next.config.ts
RUN bun run build

# Stage 2: Production runtime environment
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set correct permissions for Next.js
RUN mkdir .next && chown nextjs:nodejs .next

# Copy public folder 
COPY --from=builder /app/public ./public

# Copy the standalone output and static files
# Next.js standalone output copies node_modules automatically
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Start the standalone server
CMD ["bun", "server.js"]
