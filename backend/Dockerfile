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

# 4) Setup non-root user
RUN apk add --no-cache curl
RUN addgroup --system app && adduser --system --ingroup app app
RUN chown -R app:app /bookcars

USER app

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:4002/api/health || exit 1

CMD sh -c "node dist/src/setup/setup.js && node --import ./dist/src/monitoring/instrument.js dist/src"
EXPOSE 4002
