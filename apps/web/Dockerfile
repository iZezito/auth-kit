FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

ARG VITE_BASE_URL=http://localhost:3000
ENV VITE_BASE_URL=$VITE_BASE_URL

RUN bun run --cwd apps/web build

FROM nginx:alpine

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
