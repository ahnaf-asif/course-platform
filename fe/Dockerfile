# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY fe/package.json fe/package-lock.json ./
RUN npm ci

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY fe .

# Copy backend OpenAPI spec and all its referenced components/paths
RUN mkdir -p be-spec
COPY be/docs ./be-spec/

# Update orval.config.ts to point to the local spec copy
RUN sed -i 's|\.\.\/be\/docs\/openapi\.yaml|\.\/be-spec\/openapi\.yaml|g' orval.config.ts

RUN npm run generate:api
RUN npm run build

# Stage 3: runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to 0.0.0.0 for containerized environment
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
