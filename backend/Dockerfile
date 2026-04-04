# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/backend

# 1) Copy only dependency files first (cached layer)
COPY ./packages/bookcars-types/package.json /bookcars/packages/bookcars-types/package.json
COPY ./packages/bookcars-helper/package.json /bookcars/packages/bookcars-helper/package.json
COPY ./packages/currency-converter/package.json /bookcars/packages/currency-converter/package.json
COPY ./backend/package.json ./backend/package-lock.json ./

RUN npm install

# 2) Copy source code
COPY ./packages /bookcars/packages
COPY ./backend ./
COPY ./backend/.env.docker .env

# 3) Build at image build time (not at runtime)
RUN npm run build

# 4) Setup non-root user + tools
RUN apk add --no-cache curl su-exec
RUN addgroup --system app && adduser --system --ingroup app app
RUN chown -R app:app /bookcars

# 5) Copy entrypoint (runs as root, creates CDN dirs, then drops to app user)
COPY ./backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# NOTE: We do NOT switch to USER app here — the entrypoint needs root to chown the volume

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:4002/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 4002
