FROM oven/bun AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY ./src ./src

COPY ./drizzle ./drizzle

COPY drizzle.config.ts tsconfig.json ./

# RUN bun run db:generate

ENV NODE_ENV=production

RUN bun build \
  --compile \
  --minify-whitespace \
  --minify-syntax \
  --outfile server \
  src/index.ts

# FROM gcr.io/distroless/base
FROM debian:bullseye-slim

WORKDIR /app

COPY --from=build /app/server server

ENV NODE_ENV=production

CMD ["./server"]

# EXPOSE 3000
EXPOSE $PORT
