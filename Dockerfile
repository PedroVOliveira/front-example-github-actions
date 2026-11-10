# Stage 1: Install dependencies
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# Stage 3: Production image
FROM node:24-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
