FROM node:lts-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./

FROM base AS prod-deps
RUN npm install --omit=dev

FROM base AS build
COPY . .
RUN cp astro.config.selfhosted.mjs astro.config.mjs
RUN npm run build

FROM base AS prod
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN adduser -D -g '' non-root

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

USER non-root

CMD node ./dist/server/entry.mjs
