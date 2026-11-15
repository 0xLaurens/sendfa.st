FROM node:lts-alpine AS base
WORKDIR /app

COPY --from=oven/bun:1.4.3-alpine /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./

FROM base AS prod-deps
RUN bun install --production --frozen-lockfile

FROM base AS build
RUN bun install --frozen-lockfile
COPY . .
RUN cp astro.config.selfhosted.mjs astro.config.mjs
RUN bun run build

FROM base AS prod
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN adduser -D -g '' non-root

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

USER non-root

CMD node ./dist/server/entry.mjs
