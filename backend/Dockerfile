# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY .node-pg-migrate.json ./

USER nodejs

EXPOSE 8080

ENV NODE_ENV=production

CMD ["sh", "-c", "npx node-pg-migrate up && node dist/index.js"]
